import { labelToLanguageCode } from '@/lib/providers';
import { proxiedFetch } from '@/backend/helpers/fetch';
import type { CaptionListItem } from '@/stores/player/slices/source';

type VdrkSubtitle = {
  file?: string;
  label?: string;
};

export async function scrapeVdrkCaptions(
  tmdbId: string | number,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const tmdbIdNum =
      typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : tmdbId;
    const url =
      season && episode
        ? `https://sub.vdrk.site/v1/tv/${tmdbIdNum}/${season}/${episode}`
        : `https://sub.vdrk.site/v1/movie/${tmdbIdNum}`;

    const data = await proxiedFetch<VdrkSubtitle[]>(url);
    if (!Array.isArray(data)) return [];

    return data
      .map((subtitle): CaptionListItem | null => {
        if (!subtitle.file || !subtitle.label) return null;
        const isHearingImpaired = subtitle.label.includes(' Hi') || subtitle.label.includes('Hi');
        const languageName = subtitle.label
          .replace(/\s*Hi\d*$/, '')
          .replace(/\s*Hi$/, '')
          .replace(/\d+$/, '');
        const language = labelToLanguageCode(languageName) || '';
        if (!language) return null;
        return {
          id: subtitle.file,
          language,
          url: subtitle.file,
          type: 'vtt',
          needsProxy: true,
          opensubtitles: true,
          display: subtitle.label,
          isHearingImpaired,
          source: 'granite',
        };
      })
      .filter((caption): caption is CaptionListItem => !!caption);
  } catch {
    return [];
  }
}
