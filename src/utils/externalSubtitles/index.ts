import type {
  CaptionListItem,
  PlayerMeta,
} from '@/stores/player/slices/source';
import { fetchCineProSubtitles } from '@/services/cinepro-adapter/subtitles';
import { labelToLanguageCode } from '@/lib/providers';
import { useCineProStore } from '@/stores/cinepro';

import {
  captionNeedsProxy,
  normalizeCaptionDownloadUrl,
  stableSubtitleId,
} from './captionUrls';
import { scrapeOpenSubtitlesCaptions } from './opensubtitles';
import { scrapeVdrkCaptions } from './vdrk';

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
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

function prepareCaptionUrl(rawUrl: string): {
  url: string;
  needsProxy: boolean;
} {
  const url = normalizeCaptionDownloadUrl(rawUrl);
  return { url, needsProxy: captionNeedsProxy(url) };
}

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
        ? fmt === 'vtt'
          ? 'vtt'
          : 'srt'
        : 'srt';
    const language =
      labelToLanguageCode(sub.label) ||
      (sub.language ? labelToLanguageCode(sub.language) : null) ||
      sub.language?.slice(0, 2) ||
      'unknown';
    const { url, needsProxy } = prepareCaptionUrl(sub.url);
    return {
      id: stableSubtitleId('core-wyzie', language, index, url),
      language,
      url,
      type,
      needsProxy,
      opensubtitles: true,
      display: sub.label,
      isHearingImpaired: sub.isHearingImpaired,
      source: sub.source || 'wyzie (core)',
      flagUrl: sub.flagUrl,
      release: sub.release ?? null,
    };
  });
}

function remapForSelect(captions: CaptionListItem[]): CaptionListItem[] {
  return captions.map((c) => {
    const { url, needsProxy } = prepareCaptionUrl(c.url);
    return { ...c, url, needsProxy };
  });
}

/**
 * Path B external captions (independent of stream provider).
 *
 * 1. Core GET /v1/subtitles (Wyzie keys on EC2)
 * 2. OpenSubtitles catalog (imdbId)
 * 3. VDRK public catalog
 *
 * OpenSubtitles files download in the browser (user IP).
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
      ? withTimeout(
          scrapeOpenSubtitlesCaptions(imdbId, season, episode).then(
            remapForSelect,
          ),
          10_000,
          [],
        )
      : Promise.resolve([]),
    withTimeout(
      scrapeVdrkCaptions(tmdbId, season, episode).then(remapForSelect),
      10_000,
      [],
    ),
  ]);

  return dedupeCaptions(
    captionSets.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    ),
  );
}

export { scrapeOpenSubtitlesCaptions } from './opensubtitles';
export { scrapeWyzieCaptions } from './wyzie';
