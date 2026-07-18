/**
 * Resolve success ≠ playback. Filter CinePro sources that native player can use.
 *
 * Embeds (ythd.org/embed, type "embed", HTML pages) often resolve with HTTP 200
 * but cannot be demuxed by HLS.js / native video — reject them before waterfall stop.
 */

const PLAYABLE_TYPES = new Set([
  "hls",
  "dash",
  "mp4",
  "mkv",
  "webm",
  "m3u8",
]);

/** URL patterns that are classic embeds, not direct streams. */
const EMBED_URL_HINT =
  /\/embed\/|\/e\/\d|player\.|iframe|embed\.php|watch\?v=/i;

/**
 * True if this CinePro source looks like a direct stream the SPA can play natively.
 */
export function isPlayableCineProSource(source: {
  type?: string;
  url?: string;
}): boolean {
  if (!source?.url || typeof source.url !== "string") return false;
  const type = (source.type ?? "").toLowerCase().trim();

  // Explicit non-playable types
  if (
    type === "embed" ||
    type === "iframe" ||
    type === "html" ||
    type === "page"
  ) {
    return false;
  }

  // Known playable types
  if (PLAYABLE_TYPES.has(type)) {
    // Still reject embed-looking URLs even if mislabeled as hls/mp4
    if (EMBED_URL_HINT.test(source.url) && !/\.m3u8|\.mp4|\.mpd/i.test(source.url)) {
      return false;
    }
    return true;
  }

  // Unknown type: allow only if URL looks like a media file/playlist
  if (/\.m3u8(\?|$)/i.test(source.url) || /\.mpd(\?|$)/i.test(source.url)) {
    return true;
  }
  if (/\.mp4(\?|$)/i.test(source.url) || /\.webm(\?|$)/i.test(source.url)) {
    return true;
  }

  return false;
}

/**
 * Normalize player sourceId / store keys to a bare CinePro provider id.
 * e.g. "cinepro-vidup" | "cinepro-vidup-hls-1" → "vidup"
 */
export function cineproProviderIdFromSourceId(
  sourceId: string | null | undefined,
): string | null {
  if (!sourceId) return null;
  if (!sourceId.startsWith("cinepro-")) return null;
  const rest = sourceId.slice("cinepro-".length);
  // Strip optional -hls-N / -file-N suffixes from mapper ids
  const stripped = rest.replace(/-(?:hls|file)-\d+$/i, "");
  return stripped || null;
}

/**
 * Whether the **whole provider** should be skipped in the progressive waterfall.
 *
 * Only exact provider-level failures count (`vidsrc` or `cinepro-vidsrc`).
 * A single sub-server failure (`cinepro-vidsrc-hls-1` = Alpha) must NOT skip
 * Bravo/Charlie — those are tried via sibling advance first; only when all
 * siblings are exhausted do we mark `cinepro-{providerId}` failed.
 */
export function isFailedCineProProvider(
  providerId: string,
  failedSourceIds: string[],
): boolean {
  const bare = providerId.replace(/^cinepro-/, "");
  return failedSourceIds.some((f) => {
    if (f === bare || f === `cinepro-${bare}` || f === providerId) return true;
    // Legacy: exact bare id only — stream suffixes are per-server failures
    return false;
  });
}

/**
 * Whether a specific cached stream id is in the failed list.
 */
export function isFailedCineProStream(
  sourceId: string,
  failedSourceIds: string[],
): boolean {
  if (failedSourceIds.includes(sourceId)) return true;
  // If whole provider is failed, every stream under it is failed
  const bare = cineproProviderIdFromSourceId(sourceId);
  if (bare && isFailedCineProProvider(bare, failedSourceIds)) return true;
  return false;
}

/**
 * Next playable cached stream for the same provider (Alpha → Bravo → …).
 * Skips the current id and anything already failed.
 */
export function findNextCachedSibling(
  currentSourceId: string | null | undefined,
  cached: Array<{ sourceId: string; providerId: string }>,
  failedSourceIds: string[],
): string | null {
  if (!currentSourceId) return null;
  const providerId = cineproProviderIdFromSourceId(currentSourceId);
  if (!providerId) return null;
  const siblings = cached.filter(
    (s) =>
      s.providerId === providerId &&
      s.sourceId !== currentSourceId &&
      !isFailedCineProStream(s.sourceId, failedSourceIds),
  );
  return siblings[0]?.sourceId ?? null;
}
