import type {
  CaptionListItem,
  PlayerMeta,
} from '@/stores/player/slices/source';

import { scrapeOpenSubtitlesCaptions } from './opensubtitles';
import { scrapeVdrkCaptions } from './vdrk';
import { scrapeWyzieCaptions } from './wyzie';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }).catch((err) => {
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

export async function scrapeExternalSubtitles(
  meta: PlayerMeta,
): Promise<CaptionListItem[]> {
  const imdbId = meta.imdbId;
  const tmdbId = meta.tmdbId;

  if (!imdbId && !tmdbId) return [];

  const season = meta.season?.number;
  const episode = meta.episode?.number;
  const captionSets = await Promise.allSettled([
    withTimeout(scrapeWyzieCaptions(tmdbId, imdbId ?? '', season, episode), 30_000, []),
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

export { scrapeWyzieCaptions } from './wyzie';
export { scrapeOpenSubtitlesCaptions } from './opensubtitles';
export { scrapeVdrkCaptions } from './vdrk';
