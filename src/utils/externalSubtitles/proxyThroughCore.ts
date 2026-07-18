/**
 * Wrap subtitle CDN URLs with CinePro Core public download endpoints.
 * OpenSubtitles must use /v1/subtitles/file (not OMSS /v1/proxy).
 */

import { getCineProBaseUrl } from '@/services/cinepro-adapter/client';
import { useCineProStore } from '@/stores/cinepro';

/** True if URL is already a core-served subtitle download. */
export function isCoreProxySubtitleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/v1/subtitles/file') && u.searchParams.has('url')) {
      return true;
    }
    return u.pathname.includes('/v1/proxy') && u.searchParams.has('data');
  } catch {
    return (
      url.includes('/v1/subtitles/file?') || url.includes('/v1/proxy?data=')
    );
  }
}

export function unwrapCoreProxyUpstream(url: string): string | null {
  try {
    const u = new URL(url);
    const fileUrl = u.searchParams.get('url');
    if (fileUrl && u.pathname.includes('/v1/subtitles/file')) {
      return fileUrl;
    }
    const raw = u.searchParams.get('data');
    if (!raw) return null;
    const data = JSON.parse(raw) as { url?: string };
    return typeof data.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
}

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
 * Absolute core URL for a raw subtitle file.
 * Uses /v1/subtitles/file so Anubis HTML is never HLS-rewritten.
 */
export function proxySubtitleThroughCore(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  // Already file endpoint
  if (rawUrl.includes('/v1/subtitles/file?')) return rawUrl;

  // Unwrap old /v1/proxy wrappers
  let target = rawUrl;
  if (rawUrl.includes('/v1/proxy?')) {
    const inner = unwrapCoreProxyUpstream(rawUrl);
    if (inner) {
      // Keep non-OpenSubtitles provider VTT on /v1/proxy (vdrk works)
      if (!/opensubtitles\.org/i.test(inner)) {
        return rawUrl;
      }
      target = inner;
    }
  }

  const base = (
    useCineProStore.getState().serverUrl || getCineProBaseUrl()
  ).replace(/\/$/, '');
  return `${base}/v1/subtitles/file?url=${encodeURIComponent(target)}`;
}

/** @deprecated kept for tests/callers that imported headers helper */
export function headersForSubtitleUrl(rawUrl: string): Record<string, string> {
  if (/opensubtitles\.org/i.test(rawUrl)) {
    return {
      'User-Agent': 'TemporaryUserAgent',
      'X-User-Agent': 'TemporaryUserAgent',
      Accept: 'text/plain, */*',
    };
  }
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'text/plain, text/vtt, application/x-subrip, */*',
  };
}
