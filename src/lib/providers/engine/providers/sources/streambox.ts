import { flags } from '../../entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '../base';
import { MovieScrapeContext, ShowScrapeContext } from '../../utils/context';
import { NotFoundError } from '../../utils/errors';

interface StreamEntry {
  resulation: string;
  link: string;
  type?: string;
}

interface CaptionTrack {
  lang: string;
  url: string;
  code: string;
}

interface StreamBoxResponse {
  url: StreamEntry[];
  tracks: CaptionTrack[];
  provider?: string;
  headers?: { Referer?: string };
}


const streamboxBase = 'https://vidjoy.pro/embed/api/fastfetch';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const apiRes = await ctx.proxiedFetcher<StreamBoxResponse>(
    ctx.media.type === 'movie'
      ? `${streamboxBase}/${ctx.media.tmdbId}?sr=0`
      : `${streamboxBase}/${ctx.media.tmdbId}/${ctx.media.season.number}/${ctx.media.episode.number}?sr=0`,
  );

  if (!apiRes) {
    throw new NotFoundError('Failed to fetch StreamBox data');
  }

  const data = apiRes;

  const streams: Record<string, string> = {};
  data.url.forEach((stream: StreamEntry) => {
    streams[stream.resulation] = stream.link;
  });

  const captions = data.tracks.map((track: CaptionTrack) => ({
    id: track.lang,
    url: track.url,
    language: track.code,
    type: 'srt' as const,
  }));


  if (data.provider === 'MovieBox') {
    return {
      embeds: [],
      stream: [
        {
          id: 'primary',
          captions,
          qualities: {
            ...(streams['1080'] && {
              1080: {
                type: 'mp4',
                url: streams['1080'],
              },
            }),
            ...(streams['720'] && {
              720: {
                type: 'mp4',
                url: streams['720'],
              },
            }),
            ...(streams['480'] && {
              480: {
                type: 'mp4',
                url: streams['480'],
              },
            }),
            ...(streams['360'] && {
              360: {
                type: 'mp4',
                url: streams['360'],
              },
            }),
          },
          type: 'file',
          flags: [flags.CORS_ALLOWED],
          preferredHeaders: {
            Referer: data.headers?.Referer,
          },
        },
      ],
    };
  }

  const hlsStream = data.url.find((stream: StreamEntry) => stream.type === 'hls') ?? data.url[0];
  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        captions,
        playlist: hlsStream.link,
        type: 'hls',
        flags: [flags.CORS_ALLOWED],
        preferredHeaders: {
          Referer: data.headers?.Referer,
        },
      },
    ],
  };
}

export const streamboxScraper = makeSourcerer({
  id: 'streambox',
  name: 'StreamBox',
  rank: 119,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
