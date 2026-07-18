/**
 * Optional direct browser Wyzie client.
 * Prefer core GET /v1/subtitles so API keys never ship in the SPA.
 * Only runs if VITE_WYZIE_API_KEY is set (discouraged).
 */

import { type SubtitleData, configure, searchSubtitles } from 'wyzie-lib';

import type { CaptionListItem } from '@/stores/player/slices/source';

const clientKey = import.meta.env?.VITE_WYZIE_API_KEY as string | undefined;
if (clientKey) {
  configure({ key: clientKey });
}

export async function scrapeWyzieCaptions(
  tmdbId: string | number,
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  if (!clientKey) return [];

  try {
    const searchParams: Record<string, unknown> = {
      encoding: 'utf-8',
      source: 'all',
    };

    if (imdbId) {
      searchParams.imdb_id = imdbId;
    } else if (tmdbId) {
      searchParams.tmdb_id =
        typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : tmdbId;
    } else {
      return [];
    }

    if (season && episode) {
      searchParams.season = season;
      searchParams.episode = episode;
    }

    const subtitles: SubtitleData[] = await searchSubtitles(
      searchParams as never,
    );

    return subtitles.map((subtitle) => ({
      id: subtitle.id,
      language: subtitle.language || 'unknown',
      url: subtitle.url,
      type:
        subtitle.format === 'srt' || subtitle.format === 'vtt'
          ? subtitle.format
          : 'srt',
      needsProxy: false,
      opensubtitles: true,
      display: subtitle.display,
      media: subtitle.media,
      isHearingImpaired: subtitle.isHearingImpaired,
      source: `wyzie ${
        subtitle.source?.toString() === 'opensubtitles'
          ? 'opensubs'
          : subtitle.source
      }`,
      encoding: subtitle.encoding,
      flagUrl: subtitle.flagUrl,
      release: subtitle.release,
      releases: subtitle.releases,
      origin: subtitle.origin,
    }));
  } catch {
    return [];
  }
}
