import type { Qualities, Stream } from '@/lib/providers';

export type SourceQuality = Qualities;

export type StreamType = 'hls' | 'mp4';

export interface SourceFileStream {
  type: 'mp4';
  url: string;
}

export interface LoadableSource {
  type: StreamType;
  url: string;
  headers?: Stream['headers'];
  preferredHeaders?: Stream['preferredHeaders'];
}

export type SourceSliceSource =
  | {
      type: 'file';
      qualities: Partial<Record<SourceQuality, SourceFileStream>>;
      headers?: Stream['headers'];
      preferredHeaders?: Stream['preferredHeaders'];
    }
  | {
      type: 'hls';
      url: string;
      headers?: Stream['headers'];
      preferredHeaders?: Stream['preferredHeaders'];
    };

export interface QualityPreferences {
  lastChosenQuality: SourceQuality | null;
  automaticQuality: boolean;
}


const sortedQualities: SourceQuality[] = [
  '1080',
  '4k',
  '720',
  '480',
  '360',
  'unknown',
];

export function getPreferredQuality(
  availableQualities: SourceQuality[],
  qualityPreferences: QualityPreferences,
): SourceQuality | undefined {
  if (
    qualityPreferences.automaticQuality ||
    qualityPreferences.lastChosenQuality === null ||
    qualityPreferences.lastChosenQuality === 'unknown'
  ) {
    return sortedQualities.find((v) => availableQualities.includes(v));
  }

  const chosenQualityIndex = sortedQualities.indexOf(
    qualityPreferences.lastChosenQuality,
  );
  let nearestChosenQuality: undefined | SourceQuality;

  for (let i = chosenQualityIndex; i < sortedQualities.length; i += 1) {
    if (availableQualities.includes(sortedQualities[i])) {
      nearestChosenQuality = sortedQualities[i];
      break;
    }
  }
  if (nearestChosenQuality) return nearestChosenQuality;

  for (let i = chosenQualityIndex; i >= 0; i -= 1) {
    if (availableQualities.includes(sortedQualities[i])) {
      nearestChosenQuality = sortedQualities[i];
      break;
    }
  }
  return nearestChosenQuality;
}

export function selectQuality(
  source: SourceSliceSource,
  qualityPreferences: QualityPreferences,
): {
  stream: LoadableSource;
  quality: null | SourceQuality;
} {
  if (source.type === 'hls')
    return {
      stream: source,
      quality: null,
    };
  if (source.type === 'file') {
    const availableQualities = Object.entries(source.qualities)
      .filter((entry) => entry[1] && (entry[1].url.length ?? 0) > 0)
      .map((entry) => entry[0]) as SourceQuality[];
    const manualQualityPreferences: QualityPreferences = {
      ...qualityPreferences,
      automaticQuality: false,
    };
    const quality = getPreferredQuality(
      availableQualities,
      manualQualityPreferences,
    );
    if (quality) {
      const stream = source.qualities[quality];
      if (stream) {
        return {
          stream: {
            ...stream,
            headers: source.headers,
            preferredHeaders: source.preferredHeaders,
          },
          quality,
        };
      }
    }
  }
  throw new Error("couldn't select quality");
}

const qualityNameMap: Record<SourceQuality, string> = {
  '4k': '4K',
  '1080': '1080p',
  '360': '360p',
  '480': '480p',
  '720': '720p',
  unknown: 'unknown',
};

export const allQualities = Object.keys(qualityNameMap) as SourceQuality[];

export function qualityToString(quality: SourceQuality): string {
  return qualityNameMap[quality];
}
