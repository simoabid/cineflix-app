import axios from 'axios';

const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY || '';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

/** Response shape from the OMDb API for a single title lookup. */
interface OmdbResponse {
  readonly Response: 'True' | 'False';
  readonly imdbRating?: string;
  readonly Title?: string;
  readonly Year?: string;
  readonly Error?: string;
}

/** Persisted rating entry stored in localStorage. */
interface PersistedEntry {
  readonly rating: string | null;
  readonly timestamp: number;
}

/** Result returned from the fetch function, including source info. */
export interface ImdbRatingResult {
  /** The rating value (e.g. "7.6"), or null if unavailable */
  readonly rating: string | null;
  /** Where this rating came from */
  readonly source: 'imdb' | 'tmdb' | 'none';
}

// ─── Configuration ───────────────────────────────────────────────────────────
const PERSISTENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in localStorage
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min in-memory
const MAX_MEMORY_CACHE_SIZE = 500;
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min cooldown after rate limit
const STORAGE_KEY_PREFIX = 'cineflix_imdb_';
const RATE_LIMIT_FLAG_KEY = 'cineflix_omdb_rate_limited';

// ─── In-memory cache ─────────────────────────────────────────────────────────
const memoryCache = new Map<string, PersistedEntry>();

// ─── Rate limit tracking ─────────────────────────────────────────────────────
/**
 * Checks whether we are currently in an OMDb rate-limit cooldown period.
 */
const isRateLimited = (): boolean => {
  try {
    const flag = localStorage.getItem(RATE_LIMIT_FLAG_KEY);
    if (!flag) return false;
    const until = parseInt(flag, 10);
    if (Date.now() < until) return true;
    localStorage.removeItem(RATE_LIMIT_FLAG_KEY);
    return false;
  } catch {
    return false;
  }
};

/**
 * Marks the OMDb API as rate-limited for the cooldown duration.
 */
const markRateLimited = (): void => {
  try {
    localStorage.setItem(RATE_LIMIT_FLAG_KEY, String(Date.now() + RATE_LIMIT_COOLDOWN_MS));
  } catch {
    // localStorage unavailable — fail silently
  }
};

// ─── localStorage persistence ────────────────────────────────────────────────
/**
 * Reads a rating from localStorage persistent cache.
 */
const readFromStorage = (key: string): string | null | undefined => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (!raw) return undefined;
    const entry: PersistedEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > PERSISTENT_CACHE_TTL_MS) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
      return undefined;
    }
    return entry.rating;
  } catch {
    return undefined;
  }
};

/**
 * Writes a rating to localStorage persistent cache.
 */
const writeToStorage = (key: string, rating: string | null): void => {
  try {
    const entry: PersistedEntry = { rating, timestamp: Date.now() };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — fail silently
  }
};

// ─── In-memory cache helpers ─────────────────────────────────────────────────
const pruneMemoryCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (now - entry.timestamp > MEMORY_CACHE_TTL_MS) {
      memoryCache.delete(key);
    }
  }
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const keysIterator = memoryCache.keys();
    const deleteCount = memoryCache.size - MAX_MEMORY_CACHE_SIZE;
    for (let i = 0; i < deleteCount; i++) {
      const oldest = keysIterator.next().value;
      if (oldest) memoryCache.delete(oldest);
    }
  }
};

/**
 * Reads from the two-tier cache: memory first, then localStorage.
 * Returns undefined if not found in either layer.
 */
const readCached = (key: string): string | null | undefined => {
  // Layer 1: in-memory
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < MEMORY_CACHE_TTL_MS) {
    return memEntry.rating;
  }
  // Layer 2: localStorage (persistent across sessions)
  const stored = readFromStorage(key);
  if (stored !== undefined) {
    // Promote to memory cache
    memoryCache.set(key, { rating: stored, timestamp: Date.now() });
    return stored;
  }
  return undefined;
};

/**
 * Writes to both cache tiers.
 */
const writeCache = (key: string, rating: string | null): void => {
  pruneMemoryCache();
  memoryCache.set(key, { rating, timestamp: Date.now() });
  if (rating !== null) {
    writeToStorage(key, rating);
  }
};

// ─── Request deduplication ───────────────────────────────────────────────────
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Detects whether an OMDb API error is a rate-limit response.
 */
const isRateLimitError = (error: unknown, responseData?: OmdbResponse): boolean => {
  if (responseData?.Response === 'False') {
    const errorMsg = (responseData.Error || '').toLowerCase();
    if (errorMsg.includes('limit') || errorMsg.includes('quota') || errorMsg.includes('daily')) {
      return true;
    }
  }
  if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 429)) {
    return true;
  }
  return false;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches the IMDb rating for a title by its IMDb ID (e.g. "tt1234567").
 *
 * @param imdbId - The IMDb ID (tt-prefixed string)
 * @returns The IMDb rating as a string (e.g. "7.6"), or null if unavailable
 */
export const fetchImdbRating = async (imdbId: string): Promise<string | null> => {
  if (!OMDB_API_KEY || !imdbId) return null;

  // Check two-tier cache
  const cached = readCached(imdbId);
  if (cached !== undefined) return cached;

  // If rate-limited, don't attempt the request
  if (isRateLimited()) return null;

  // Deduplicate in-flight requests
  const pending = pendingRequests.get(imdbId);
  if (pending) return pending;

  const requestPromise = (async (): Promise<string | null> => {
    try {
      const response = await axios.get<OmdbResponse>(OMDB_BASE_URL, {
        params: { i: imdbId, apikey: OMDB_API_KEY },
        timeout: 5000,
      });
      const data = response.data;
      if (isRateLimitError(null, data)) {
        markRateLimited();
        return null;
      }
      const rating = data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A'
        ? data.imdbRating
        : null;
      writeCache(imdbId, rating);
      return rating;
    } catch (error) {
      if (isRateLimitError(error)) {
        markRateLimited();
      }
      console.warn(`OMDb: failed to fetch rating for ${imdbId}`, error);
      return null;
    } finally {
      pendingRequests.delete(imdbId);
    }
  })();

  pendingRequests.set(imdbId, requestPromise);
  return requestPromise;
};

/**
 * Fetches the IMDb rating by TMDB ID with full fallback chain:
 * 1. Two-tier cache (memory + localStorage)
 * 2. OMDb API (live fetch)
 * 3. TMDB rating fallback (if rate-limited or OMDb unavailable)
 *
 * @param tmdbId - The TMDB numeric ID
 * @param mediaType - 'movie' or 'tv'
 * @param tmdbRating - The TMDB vote_average to use as fallback
 * @returns Rating result with source indicator
 */
export const fetchImdbRatingByTmdbId = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  tmdbRating?: number
): Promise<ImdbRatingResult> => {
  const mappingKey = `tmdb_${mediaType}_${tmdbId}`;

  // Check two-tier cache first
  const cached = readCached(mappingKey);
  if (cached !== undefined) {
    return { rating: cached, source: cached ? 'imdb' : 'none' };
  }

  // If no OMDB key or rate-limited, use TMDB fallback immediately
  if (!OMDB_API_KEY || isRateLimited()) {
    return buildTmdbFallback(tmdbRating);
  }

  try {
    const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
    const endpoint = mediaType === 'tv'
      ? `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids`
      : `https://api.themoviedb.org/3/movie/${tmdbId}`;
    const tmdbResponse = await axios.get(endpoint, {
      params: { api_key: TMDB_API_KEY },
      timeout: 5000,
    });
    const imdbId: string | undefined = tmdbResponse.data.imdb_id;
    if (!imdbId) {
      writeCache(mappingKey, null);
      return buildTmdbFallback(tmdbRating);
    }
    const rating = await fetchImdbRating(imdbId);
    if (rating) {
      writeCache(mappingKey, rating);
      return { rating, source: 'imdb' };
    }
    // OMDb returned nothing — use fallback
    return buildTmdbFallback(tmdbRating);
  } catch (error) {
    console.warn(`OMDb: failed to resolve TMDB ID ${tmdbId} to IMDb`, error);
    return buildTmdbFallback(tmdbRating);
  }
};

/**
 * Constructs a TMDB rating fallback result.
 */
const buildTmdbFallback = (tmdbRating?: number): ImdbRatingResult => {
  if (typeof tmdbRating === 'number' && tmdbRating > 0) {
    return { rating: tmdbRating.toFixed(1), source: 'tmdb' };
  }
  return { rating: null, source: 'none' };
};
