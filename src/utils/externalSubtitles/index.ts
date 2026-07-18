import type {
  CaptionListItem,
  PlayerMeta,
} from '@/stores/player/slices/source';
import { fetchCineProSubtitles } from '@/services/cinepro-adapter/subtitles';
import { labelToLanguageCode } from '@/lib/providers';
import { useCineProStore } from '@/stores/cinepro';

import { scrapeOpenSubtitlesCaptions } from './opensubtitles';
import { scrapeVdrkCaptions } from './vdrk';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise
      .then((val) => {
        clearTimeout(timeoutId);
        return val;
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      }),
    timeoutPromise,
  ]);
}

function dedupeCaptions(captions: CaptionListItem[]): CaptionListItem[] {
  const seen = new Set<string>();
  return captions.filter((caption) => {
    const key = caption.id || caption.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Map CinePro /v1/subtitles rows into player CaptionListItem (external path B).
 */
function mapCoreSubtitles(
  subs: Array<{
    url: string;
    label: string;
    format: string;
    language?: string;
    isHearingImpaired?: boolean;
    source?: string;
    flagUrl?: string;
    release?: string | null;
  }>,
): CaptionListItem[] {
  return subs.map((sub, index) => {
    const fmt = (sub.format || 'srt').toLowerCase();
    const type =
      fmt === 'vtt' || fmt === 'srt' || fmt === 'ass' || fmt === 'ssa'
        ? (fmt === 'vtt' ? 'vtt' : 'srt')
        : 'srt';
    const language =
      labelToLanguageCode(sub.label) ||
      (sub.language ? labelToLanguageCode(sub.language) : null) ||
      sub.language?.slice(0, 2) ||
      'unknown';
    return {
      id: `core-wyzie-${language}-${index}-${sub.url.slice(-24)}`,
      language,
      url: sub.url,
      type,
      needsProxy: true,
      opensubtitles: true,
      display: sub.label,
      isHearingImpaired: sub.isHearingImpaired,
      source: sub.source || 'wyzie (core)',
      flagUrl: sub.flagUrl,
      release: sub.release ?? null,
    };
  });
}

/**
 * Path B: load external subtitles independent of which stream provider won.
 *
 * Priority:
 *  1. CinePro core GET /v1/subtitles (Wyzie multi-key rotation, secret on EC2)
 *  2. OpenSubtitles (needs imdbId)
 *  3. VDRK public catalog
 *
 * Client-side Wyzie keys are intentionally NOT used (Wyzie warns against it).
 */
export async function scrapeExternalSubtitles(
  meta: PlayerMeta,
): Promise<CaptionListItem[]> {
  const imdbId = meta.imdbId;
  const tmdbId = meta.tmdbId;

  if (!imdbId && !tmdbId) return [];

  const season = meta.season?.number;
  const episode = meta.episode?.number;
  const cineproEnabled = useCineProStore.getState().isEnabled;
  const serverUrl = useCineProStore.getState().serverUrl;

  const captionSets = await Promise.allSettled([
    cineproEnabled
      ? withTimeout(
          fetchCineProSubtitles(
            {
              tmdbId: tmdbId ? String(tmdbId) : undefined,
              imdbId: imdbId || undefined,
              season,
              episode,
            },
            serverUrl,
          ).then((res) => mapCoreSubtitles(res.subtitles)),
          30_000,
          [],
        )
      : Promise.resolve([]),
    imdbId
      ? withTimeout(scrapeOpenSubtitlesCaptions(imdbId, season, episode), 10_000, [])
      : Promise.resolve([]),
    withTimeout(scrapeVdrkCaptions(tmdbId, season, episode), 10_000, []),
  ]);

  return dedupeCaptions(
    captionSets.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    ),
  );
}

export { scrapeOpenSubtitlesCaptions } from './opensubtitles';
// Client Wyzie kept for optional direct use / tests — prefer core path B.
export { scrapeWyzieCaptions } from './wyzie';
