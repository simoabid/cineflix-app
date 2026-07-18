/**
 * Wrap an upstream subtitle CDN URL with CinePro Core's public /v1/proxy.
 * Avoids auth-gated SPA /api/proxy (protect middleware) which breaks selection
 * for anonymous viewers and for many Wyzie CDN hosts.
 */

import { getCineProBaseUrl } from '@/services/cinepro-adapter/client';
import { useCineProStore } from '@/stores/cinepro';

const SUB_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/plain, text/vtt, application/x-subrip, */*',
} as const;

/** True if URL already goes through an OMSS/core proxy. */
export function isCoreProxySubtitleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.includes('/v1/proxy') && u.searchParams.has('data');
  } catch {
    return url.includes('/v1/proxy?data=');
  }
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
  const data = JSON.stringify({ url: rawUrl, headers: SUB_HEADERS });
  return `${base}/v1/proxy?data=${encodeURIComponent(data)}`;
}
