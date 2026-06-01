import { labelToLanguageCode } from './engine';
import type { Stream, Qualities, ScrapeMedia } from './engine';

/** Quality tiers aligned with the P-Stream quality system */
export type SourceQuality = Qualities;

/** Internal representation of a loadable stream source */
export type SourceSliceSource =
  | {
      type: 'file';
      qualities: Partial<Record<SourceQuality, { type: 'mp4'; url: string }>>;
      headers?: Stream['headers'];
      preferredHeaders?: Stream['preferredHeaders'];
    }
  | {
      type: 'hls';
      url: string;
      headers?: Stream['headers'];
      preferredHeaders?: Stream['preferredHeaders'];
    };

/** Internal caption format for the player store */
export interface CaptionListItem {
  id: string;
  language: string;
  url: string;
  type?: string;
  needsProxy: boolean;
  opensubtitles?: boolean;
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
  flagUrl?: string;
  release?: string | null;
  releases?: string[];
  origin?: string | null;
}

/**
 * Converts a provider RunOutput stream into our internal SourceSliceSource format.
 * Maps HLS streams to a url-based source and file streams to a quality map.
 */
export function convertStreamToSource(output: { stream: Stream }): SourceSliceSource {
  const stream = output.stream;

  if (stream.type === 'hls') {
    return {
      type: 'hls',
      url: stream.playlist,
      headers: stream.headers,
      preferredHeaders: stream.preferredHeaders,
    };
  }

  if (stream.type === 'file') {
    const qualities: Partial<Record<SourceQuality, { type: 'mp4'; url: string }>> = {};

    for (const [quality, file] of Object.entries(stream.qualities)) {
      if (file) {
        qualities[quality as SourceQuality] = { type: 'mp4', url: file.url };
      }
    }

    return {
      type: 'file',
      qualities,
      headers: stream.headers,
      preferredHeaders: stream.preferredHeaders,
    };
  }

  const typeStr: string = (stream as { type: string }).type;
  throw new Error(`Unknown stream type: ${typeStr}`);
}

/**
 * Converts provider caption array to our internal CaptionListItem format.
 * Preserves CORS restriction flags for proxy decision making.
 */
export function convertCaptions(captions: Stream['captions']): CaptionListItem[] {
  return captions.map((caption) => ({
    id: caption.id,
    language: labelToLanguageCode(caption.language) ?? caption.language.toLowerCase(),
    url: caption.url,
    type: caption.type,
    needsProxy: caption.hasCorsRestrictions,
    opensubtitles: caption.opensubtitles,
    display: caption.display,
    media: caption.media,
    isHearingImpaired: caption.isHearingImpaired,
    source: caption.source,
    encoding: caption.encoding,
    flagUrl: caption.flagUrl,
    release: caption.release,
    releases: caption.releases,
    origin: caption.origin,
  }));
}

/**
 * Converts CINEFLIX content metadata into the ScrapeMedia format
 * expected by the provider engine's runAll() method.
 */
export function metaToScrapeMedia(meta: {
  type: 'movie' | 'show';
  title: string;
  tmdbId: string;
  imdbId?: string;
  releaseYear: number;
  season?: { number: number; tmdbId: string; title: string };
  episode?: { number: number; tmdbId: string };
}): ScrapeMedia {
  if (meta.type === 'show') {
    if (!meta.episode || !meta.season) {
      throw new Error('Missing season/episode data for show');
    }
    return {
      title: meta.title,
      releaseYear: meta.releaseYear,
      tmdbId: meta.tmdbId,
      imdbId: meta.imdbId,
      type: 'show',
      episode: { number: meta.episode.number, tmdbId: meta.episode.tmdbId },
      season: {
        number: meta.season.number,
        tmdbId: meta.season.tmdbId,
        title: meta.season.title,
      },
    };
  }

  return {
    title: meta.title,
    releaseYear: meta.releaseYear,
    tmdbId: meta.tmdbId,
    imdbId: meta.imdbId,
    type: 'movie',
  };
}
