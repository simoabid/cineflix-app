/**
 * Normalize external subtitle URLs for Path B (browser-first download).
 *
 * OpenSubtitles must be fetched by the browser (user residential IP).
 * Do NOT wrap them in core /v1/subtitles/file — EC2/DC IPs are blocked.
 * Legacy wrapped URLs from older core deploys are unwrapped to raw CDN.
 */

import { getCineProBaseUrl } from '@/services/cinepro-adapter/client';
import { useCineProStore } from '@/stores/cinepro';

export function isOpenSubtitlesUrl(url: string): boolean {
  return /opensubtitles\.org/i.test(url);
}

/** True if URL is a core-served proxy/file endpoint. */
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

/** CORS-open CDN hosts the SPA can fetch with the user's IP. */
export function isBrowserDirectSubtitleUrl(url: string): boolean {
  return isOpenSubtitlesUrl(url);
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
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      /* use raw */
    }
    const data = JSON.parse(decoded) as { url?: string };
    return typeof data.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
}

/**
 * Peel core wrappers; prefer raw OpenSubtitles CDN for browser download.
 */
export function normalizeCaptionDownloadUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  // Raw OS — keep
  if (
    isOpenSubtitlesUrl(rawUrl) &&
    !rawUrl.includes('/v1/subtitles/file') &&
    !rawUrl.includes('/v1/proxy?')
  ) {
    return rawUrl;
  }

  // Core file endpoint → unwrap (especially OS)
  if (rawUrl.includes('/v1/subtitles/file?') || rawUrl.includes('/v1/subtitles/file&')) {
    const inner = unwrapCoreProxyUpstream(rawUrl);
    if (inner) return normalizeCaptionDownloadUrl(inner);
  }

  // OMSS proxy wrapper
  if (rawUrl.includes('/v1/proxy?')) {
    const inner = unwrapCoreProxyUpstream(rawUrl);
    if (inner) {
      if (isOpenSubtitlesUrl(inner)) {
        return normalizeCaptionDownloadUrl(inner);
      }
      // Non-OS (vdrk VTT etc.) — keep public core proxy
      return rawUrl;
    }
  }

  return rawUrl;
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
 * @deprecated Path B no longer proxies OpenSubtitles through core.
 * Returns normalized browser-download URL (raw OS when applicable).
 */
export function proxySubtitleThroughCore(rawUrl: string): string {
  return normalizeCaptionDownloadUrl(rawUrl);
}

/** @deprecated headers cannot be set for browser UA restricted headers */
export function headersForSubtitleUrl(rawUrl: string): Record<string, string> {
  if (/opensubtitles\.org/i.test(rawUrl)) {
    return {
      Accept: 'text/plain, */*',
    };
  }
  return {
    Accept: 'text/plain, text/vtt, application/x-subrip, */*',
  };
}

/** Resolve core base if ever needed for non-OS public proxy links. */
export function getCoreSubtitleBase(): string {
  return (
    useCineProStore.getState().serverUrl || getCineProBaseUrl()
  ).replace(/\/$/, '');
}
