/**
 * Wrap an upstream subtitle CDN URL with CinePro Core's public /v1/proxy.
 * Avoids auth-gated SPA /api/proxy (protect middleware) which breaks selection
 * for anonymous viewers and for many Wyzie CDN hosts.
 */

import { getCineProBaseUrl } from '@/services/cinepro-adapter/client';
import { useCineProStore } from '@/stores/cinepro';

const DEFAULT_SUB_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/plain, text/vtt, application/x-subrip, */*',
};

/** OpenSubtitles free API download UA (required for reliable fetches). */
const OPENSUBTITLES_HEADERS: Record<string, string> = {
  'User-Agent': 'TemporaryUserAgent',
  'X-User-Agent': 'TemporaryUserAgent',
  Accept: 'text/plain, */*',
};

export function headersForSubtitleUrl(rawUrl: string): Record<string, string> {
  try {
    if (new URL(rawUrl).hostname.toLowerCase().includes('opensubtitles.org')) {
      return { ...OPENSUBTITLES_HEADERS };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SUB_HEADERS };
}

/** True if URL already goes through an OMSS/core proxy. */
export function isCoreProxySubtitleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.includes('/v1/proxy') && u.searchParams.has('data');
  } catch {
    return url.includes('/v1/proxy?data=');
  }
}

/** Extract upstream file URL from a core /v1/proxy?data=… link when possible. */
export function unwrapCoreProxyUpstream(url: string): string | null {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('data');
    if (!raw) return null;
    const data = JSON.parse(raw) as { url?: string };
    return typeof data.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
}

/**
 * Stable short id from URL (not url.slice(-24) of proxy JSON — that produced
 * garbage ids like "core-wyzie-ar-6-brip%2C%20*%2F*%22%7D%7D").
 */
export function stableSubtitleId(
  prefix: string,
  language: string,
  index: number,
  url: string,
): string {
  const key = unwrapCoreProxyUpstream(url) || url;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}-${language}-${index}-${(h >>> 0).toString(16)}`;
}

/**
 * Absolute core proxy URL for a raw subtitle file URL.
 * Uses store serverUrl when set, else VITE_CINEPRO_URL / default.
 */
export function proxySubtitleThroughCore(rawUrl: string): string {
  if (!rawUrl || isCoreProxySubtitleUrl(rawUrl)) return rawUrl;
  const base = (
    useCineProStore.getState().serverUrl || getCineProBaseUrl()
  ).replace(/\/$/, '');
  const data = JSON.stringify({
    url: rawUrl,
    headers: headersForSubtitleUrl(rawUrl),
  });
  return `${base}/v1/proxy?data=${encodeURIComponent(data)}`;
}
