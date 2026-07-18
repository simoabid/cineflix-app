import { labelToLanguageCode } from '@/lib/providers';
import { proxiedFetch } from '@/backend/helpers/fetch';
import type { CaptionListItem } from '@/stores/player/slices/source';

type OpenSubtitleResult = {
  SubDownloadLink?: string;
  LanguageName?: string;
  SubFormat?: string;
};

export async function scrapeOpenSubtitlesCaptions(
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const url = `https://rest.opensubtitles.org/search/${
      season && episode ? `episode-${episode}/` : ''
    }imdbid-${imdbId.slice(2)}${season && episode ? `/season-${season}` : ''}`;

    const data = await proxiedFetch<OpenSubtitleResult[]>(url, {
      headers: {
        'X-User-Agent': 'VLSub 0.10.2',
      },
    });

    if (!Array.isArray(data)) return [];

    return data
      .map((caption): CaptionListItem | null => {
        if (!caption.SubDownloadLink || !caption.LanguageName) return null;
        const downloadUrl = caption.SubDownloadLink.replace('.gz', '').replace(
          'download/',
          'download/subencoding-utf8/',
        );
        const language = labelToLanguageCode(caption.LanguageName) || '';
        if (!downloadUrl || !language) return null;
        return {
          id: downloadUrl,
          language,
          display: caption.LanguageName,
          url: downloadUrl,
          type: caption.SubFormat || 'srt',
          // Browser downloads CDN (CORS *); user residential IP.
          needsProxy: false,
          opensubtitles: true,
          source: 'opensubs',
        };
      })
      .filter((caption): caption is CaptionListItem => !!caption);
  } catch {
    return [];
  }
}
