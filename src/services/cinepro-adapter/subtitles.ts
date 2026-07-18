/**
 * Path B — fetch subtitles from CinePro Core GET /v1/subtitles.
 * Keys stay on the server; SPA never embeds Wyzie secrets.
 */

import { getCineProBaseUrl, getCineProTimeout, isValidCineProUrl } from './client';
import type { CineProSubtitle } from './types';

export type CineProSubtitlesRequest = {
  tmdbId?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  language?: string;
};

export type CineProSubtitlesResponse = {
  subtitles: CineProSubtitle[];
  source?: string;
  error?: string;
  keysTried?: number;
  keyPool?: string;
};

/**
 * Server-side Wyzie (and future sub scrapers) via core.
 * Returns empty array on network/config failure (caller merges with other paths).
 */
export async function fetchCineProSubtitles(
  request: CineProSubtitlesRequest,
  baseUrl?: string,
): Promise<CineProSubtitlesResponse> {
  const empty: CineProSubtitlesResponse = { subtitles: [] };
  const root = baseUrl || getCineProBaseUrl();
  if (!isValidCineProUrl(root)) return empty;
  if (!request.tmdbId && !request.imdbId) return empty;

  const params = new URLSearchParams();
  if (request.imdbId) params.set('imdbId', request.imdbId);
  if (request.tmdbId) params.set('tmdbId', request.tmdbId);
  if (request.season != null) params.set('season', String(request.season));
  if (request.episode != null) params.set('episode', String(request.episode));
  if (request.language) params.set('language', request.language);

  const url = `${root}/v1/subtitles?${params.toString()}`;
  const timeoutMs = getCineProTimeout();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ...empty,
        error: `CinePro subtitles HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as CineProSubtitlesResponse;
    if (!data || !Array.isArray(data.subtitles)) return empty;
    return {
      subtitles: data.subtitles,
      source: data.source,
      error: data.error,
      keysTried: data.keysTried,
      keyPool: data.keyPool,
    };
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'CinePro subtitles fetch failed',
    };
  } finally {
    clearTimeout(timer);
  }
}
