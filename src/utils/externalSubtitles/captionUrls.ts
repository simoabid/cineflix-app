/**
 * Caption download URL helpers (Path B).
 *
 * OpenSubtitles: browser fetches raw CDN (user residential IP, CORS *).
 * Legacy core wrappers (/v1/subtitles/file, OS-on-/v1/proxy) are unwrapped.
 * Non-OS public core /v1/proxy (e.g. provider VTT) is left as-is.
 */

export function isOpenSubtitlesUrl(url: string): boolean {
  return /opensubtitles\.org/i.test(url);
}

/** Public core proxy/file URL (CORS open to the SPA origin). */
export function isCorePublicCaptionUrl(url: string): boolean {
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

/** Hosts the SPA can fetch without extension / MERN proxy. */
export function canBrowserFetchCaption(url: string): boolean {
  return isOpenSubtitlesUrl(url) || isCorePublicCaptionUrl(url);
}

export function unwrapCaptionUpstream(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/v1/subtitles/file')) {
      return u.searchParams.get('url');
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
 * Normalize to a browser-downloadable URL.
 * OpenSubtitles always ends as raw CDN.
 */
export function normalizeCaptionDownloadUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  if (
    isOpenSubtitlesUrl(rawUrl) &&
    !rawUrl.includes('/v1/subtitles/file') &&
    !rawUrl.includes('/v1/proxy')
  ) {
    return rawUrl;
  }

  if (rawUrl.includes('/v1/subtitles/file')) {
    const inner = unwrapCaptionUpstream(rawUrl);
    if (inner) return normalizeCaptionDownloadUrl(inner);
  }

  if (rawUrl.includes('/v1/proxy')) {
    const inner = unwrapCaptionUpstream(rawUrl);
    if (inner) {
      if (isOpenSubtitlesUrl(inner)) {
        return normalizeCaptionDownloadUrl(inner);
      }
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
  const key = unwrapCaptionUpstream(url) || url;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}-${language}-${index}-${(h >>> 0).toString(16)}`;
}

/** Whether select should set needsProxy (extension /api/proxy). */
export function captionNeedsProxy(url: string): boolean {
  const normalized = normalizeCaptionDownloadUrl(url);
  return !canBrowserFetchCaption(normalized);
}
