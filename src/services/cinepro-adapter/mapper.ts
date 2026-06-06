import { ScrapeMedia } from '../../lib/providers/engine/entrypoint/utils/media';
import { Stream, Qualities, Caption } from '../../lib/providers/engine';
import { labelToLanguageCode } from '../../lib/providers/engine/providers/captions';
import { CineProSource, CineProSubtitle, CineProScrapeRequest } from './types';

/**
 * A mapped stream bundled with the CinePro provider metadata it came from.
 * Solves the index-mismatch problem: each stream carries its own provenance
 * instead of relying on parallel array indices.
 */
export interface MappedStreamWithMeta {
  stream: Stream;
  providerId: string;
  providerName: string;
  /** Best quality label from the grouped sources (e.g. "1080p") */
  quality: string;
}

/** Quality weight lookup used for selecting the "best" quality label in a group */
const QUALITY_WEIGHT: Record<string, number> = {
  '4k': 5,
  '1080': 4,
  '720': 3,
  '480': 2,
  '360': 1,
  'unknown': 0,
} as const;

/**
 * Maps ScrapeMedia from CINEFLIX to the CinePro scrape request parameters.
 * @param {ScrapeMedia} media The CINEFLIX scrape media object.
 * @returns {CineProScrapeRequest} The query request for CinePro Core.
 */
export function mapScrapeMediaToRequest(media: ScrapeMedia): CineProScrapeRequest {
  if (media.type === 'movie') {
    return {
      tmdbId: media.tmdbId,
      type: 'movie',
      title: media.title,
      imdbId: media.imdbId,
    };
  }
  return {
    tmdbId: media.tmdbId,
    type: 'tv',
    s: media.season.number,
    e: media.episode.number,
    title: media.title,
    imdbId: media.imdbId,
  };
}

/**
 * Normalizes video quality strings from CinePro Core into P-Stream Qualities.
 * Order matters: more specific checks (fhd, 2160) run before generic ones (hd, sd).
 * @param {string} quality The quality string from CinePro.
 * @returns {Qualities} The normalized Quality.
 */
export function mapQuality(quality: string): Qualities {
  const normalized = quality.toLowerCase().trim();
  if (normalized.includes('2160') || normalized.includes('4k') || normalized.includes('uhd')) {
    return '4k';
  }
  if (normalized.includes('1080') || normalized.includes('fhd')) {
    return '1080';
  }
  // 'hd' alone maps to 720p; 'fhd' was already caught above
  if (normalized.includes('720') || normalized === 'hd') {
    return '720';
  }
  if (normalized.includes('480') || normalized === 'sd') {
    return '480';
  }
  if (normalized.includes('360')) {
    return '360';
  }
  return 'unknown';
}

/**
 * Maps a single CinePro subtitle to a P-Stream caption.
 * @param {CineProSubtitle} subtitle The raw CinePro subtitle.
 * @param {number} index Unique index to generate id.
 * @returns {Caption | null} The mapped caption, or null if unsupported.
 */
export function mapSubtitleToCaption(
  subtitle: CineProSubtitle,
  index: number,
): Caption | null {
  const format = subtitle.format.toLowerCase();
  if (format !== 'vtt' && format !== 'srt') {
    return null;
  }
  const langCode = labelToLanguageCode(subtitle.label) || subtitle.label.toLowerCase().slice(0, 2);
  return {
    id: `cinepro-sub-${langCode}-${index}`,
    type: format as 'vtt' | 'srt',
    url: subtitle.url,
    hasCorsRestrictions: false,
    language: langCode,
    display: subtitle.label,
  };
}

/**
 * Selects the highest quality label from a list of CinePro sources.
 * Used to tag grouped file-based streams with the best available quality.
 */
function pickBestQualityLabel(sources: CineProSource[]): string {
  let bestLabel = sources[0]?.quality ?? 'unknown';
  let bestWeight = 0;
  for (const src of sources) {
    const w = QUALITY_WEIGHT[mapQuality(src.quality)] ?? 0;
    if (w > bestWeight) {
      bestWeight = w;
      bestLabel = src.quality;
    }
  }
  return bestLabel;
}

/**
 * Maps CinePro sources and subtitles into enriched stream objects that carry
 * provider metadata alongside each P-Stream Stream. This eliminates the need
 * for parallel-array index lookups in the caller.
 *
 * Grouping logic:
 *  - HLS/DASH → one MappedStreamWithMeta per source
 *  - File-based (mp4/mkv/webm) → grouped by provider into a single multi-quality stream
 *
 * @param {CineProSource[]} sources List of movie/show sources.
 * @param {CineProSubtitle[]} subtitles List of subtitles.
 * @returns {MappedStreamWithMeta[]} Enriched mapped streams with provider info.
 */
export function mapCineProResultToStreamsWithMeta(
  sources: CineProSource[],
  subtitles: CineProSubtitle[],
): MappedStreamWithMeta[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  const captions: Caption[] = subtitles
    .map((sub, idx) => mapSubtitleToCaption(sub, idx))
    .filter((cap): cap is Caption => cap !== null);
  const results: MappedStreamWithMeta[] = [];
  const fileSourcesByProvider: Record<string, CineProSource[]> = {};
  let hlsCounter = 0;
  for (const source of sources) {
    const providerId = source.provider.id;
    const isHls = source.type === 'hls' || source.type === 'dash';
    if (isHls) {
      hlsCounter += 1;
      const id = `cinepro-${providerId}-hls-${hlsCounter}`;
      results.push({
        stream: {
          id,
          type: 'hls',
          playlist: source.url,
          flags: [],
          captions: [...captions],
          headers: {},
        },
        providerId,
        providerName: source.provider.name,
        quality: source.quality,
      });
    } else {
      if (!fileSourcesByProvider[providerId]) {
        fileSourcesByProvider[providerId] = [];
      }
      fileSourcesByProvider[providerId].push(source);
    }
  }
  let fileCounter = 0;
  for (const [providerId, providerSources] of Object.entries(fileSourcesByProvider)) {
    const qualitiesMap: Partial<Record<Qualities, { type: 'mp4'; url: string }>> = {};
    for (const source of providerSources) {
      const q = mapQuality(source.quality);
      qualitiesMap[q] = { type: 'mp4', url: source.url };
    }
    if (Object.keys(qualitiesMap).length > 0) {
      fileCounter += 1;
      const id = `cinepro-${providerId}-file-${fileCounter}`;
      results.push({
        stream: {
          id,
          type: 'file',
          qualities: qualitiesMap,
          flags: [],
          captions: [...captions],
          headers: {},
        },
        providerId,
        providerName: providerSources[0].provider.name,
        quality: pickBestQualityLabel(providerSources),
      });
    }
  }
  return results;
}

/**
 * Convenience wrapper that returns only the Stream[] (no metadata).
 * Kept for backward compatibility with existing tests and callers that
 * don't need provider metadata.
 */
export function mapCineProResultToStreams(
  sources: CineProSource[],
  subtitles: CineProSubtitle[],
): Stream[] {
  return mapCineProResultToStreamsWithMeta(sources, subtitles).map((m) => m.stream);
}
