import {
  CineProScrapeResponse,
  CineProProviderInfo,
  CineProScrapeRequest,
} from './types';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Validates that a URL is a safe HTTP(S) endpoint.
 * Rejects non-HTTP schemes to prevent SSRF via javascript:, data:, etc.
 * @param {string} url The URL to validate.
 * @returns {boolean} True if the URL is safe to use.
 */
export function isValidCineProUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Gets the CinePro server URL from configuration or environment.
 * @returns {string} The normalized base URL.
 */
export function getCineProBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_CINEPRO_URL;
  if (!envUrl) {
    return 'http://localhost:3005';
  }
  const normalized = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  if (!isValidCineProUrl(normalized)) {
    console.warn('[CinePro Client] VITE_CINEPRO_URL is not a valid HTTP URL, using default');
    return 'http://localhost:3005';
  }
  return normalized;
}

/**
 * Gets the CinePro request timeout in milliseconds.
 * @returns {number} The timeout value.
 */
export function getCineProTimeout(): number {
  const envTimeout = import.meta.env?.VITE_CINEPRO_TIMEOUT;
  if (!envTimeout) {
    return 15000;
  }
  const parsed = parseInt(envTimeout, 10);
  if (isNaN(parsed)) {
    return 15000;
  }
  return parsed;
}

/**
 * Base fetch wrapper with timeout and abort controller.
 * @param {string} endpoint The API endpoint (with leading slash).
 * @param {RequestInit} [options] The standard fetch options.
 * @param {string} [baseUrl] Optional override for base URL.
 * @returns {Promise<Response>} The fetch Response.
 */
async function fetchWithTimeout(
  endpoint: string,
  options: RequestInit = {},
  baseUrl?: string,
): Promise<Response> {
  const url = baseUrl || getCineProBaseUrl();
  if (!isValidCineProUrl(url)) {
    throw new Error(`CinePro Client: Refusing to connect to invalid URL: ${url}`);
  }
  const timeoutMs = getCineProTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retries a fetch operation with exponential backoff on failure.
 * @param {() => Promise<T>} fn The async operation to retry.
 * @param {number} maxRetries Maximum number of retry attempts.
 * @returns {Promise<T>} The result of the successful attempt.
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Runtime validation helpers (C-2: replace unsafe `as` casts)
// ---------------------------------------------------------------------------

/**
 * Validates that a value matches the CineProScrapeResponse shape at runtime.
 * Performs structural checks on the top-level shape and samples first items.
 */
function isValidScrapeResponse(data: unknown): data is CineProScrapeResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.sources)) return false;
  if (!Array.isArray(obj.subtitles)) return false;
  if (obj.sources.length > 0) {
    const first = obj.sources[0] as Record<string, unknown>;
    if (typeof first.url !== 'string' || typeof first.type !== 'string') return false;
    if (!first.provider || typeof (first.provider as Record<string, unknown>).id !== 'string') return false;
  }
  return true;
}

/**
 * Validates that a value is an array of CineProProviderInfo objects.
 */
function isValidProviderList(data: unknown): data is CineProProviderInfo[] {
  if (!Array.isArray(data)) return false;
  if (data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    if (typeof first.id !== 'string' || typeof first.name !== 'string') return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Performs a health check request to CinePro Core.
 * @param {string} [baseUrl] Optional override for base URL.
 * @returns {Promise<boolean>} True if operational, false otherwise.
 */
export async function checkCineProHealth(baseUrl?: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/v1/health', {}, baseUrl);
    if (!response.ok) {
      return false;
    }
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') return false;
    return (data as Record<string, unknown>).status === 'operational';
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[CinePro Client] Health check failed:', err);
    }
    return false;
  }
}

/**
 * Retrieves the list of providers from CinePro Core.
 * @param {string} [baseUrl] Optional override for base URL.
 * @returns {Promise<CineProProviderInfo[]>} A list of providers.
 */
export async function fetchCineProProviders(baseUrl?: string): Promise<CineProProviderInfo[]> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout('/v1/providers', {}, baseUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: Status ${response.status}`);
    }
    const data: unknown = await response.json();
    if (!isValidProviderList(data)) {
      if (import.meta.env.DEV) {
        console.warn('[CinePro Client] Providers response failed validation:', data);
      }
      return [];
    }
    return data;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[CinePro Client] Failed to fetch providers:', err);
    }
    return [];
  }
}

/**
 * Requests stream sources from CinePro Core for movies or TV episodes.
 * Uses retry logic (2 attempts) and runtime response validation.
 * Returns a safe empty response on failure instead of throwing.
 * @param {CineProScrapeRequest} request The OMSS query payload.
 * @param {string} [baseUrl] Optional override for base URL.
 * @returns {Promise<CineProScrapeResponse>} The scraping results (may be empty on failure).
 */
export async function fetchCineProStreams(
  request: CineProScrapeRequest,
  baseUrl?: string,
): Promise<CineProScrapeResponse> {
  const emptyResponse: CineProScrapeResponse = {
    sources: [],
    subtitles: [],
    diagnostics: [],
  };
  const { tmdbId, type, s, e } = request;
  if (!tmdbId || tmdbId.trim().length === 0) {
    if (import.meta.env.DEV) {
      console.error('[CinePro Client] tmdbId is required');
    }
    return emptyResponse;
  }
  const endpoint = type === 'movie'
    ? `/v1/movies/${encodeURIComponent(tmdbId)}`
    : `/v1/tv/${encodeURIComponent(tmdbId)}/seasons/${s}/episodes/${e}`;
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(endpoint, {}, baseUrl));
    if (!response.ok) {
      throw new Error(`CinePro Core returned HTTP error status ${response.status}`);
    }
    const data: unknown = await response.json();
    if (!isValidScrapeResponse(data)) {
      if (import.meta.env.DEV) {
        console.warn('[CinePro Client] Scrape response failed validation:', data);
      }
      return emptyResponse;
    }
    return data;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[CinePro Client] Scrape failed after retries:', err);
    }
    return emptyResponse;
  }
}

