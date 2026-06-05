import { flags } from '../../entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '../base';
import { MovieScrapeContext, ShowScrapeContext } from '../../utils/context';
import { NotFoundError } from '../../utils/errors';
import { createM3U8ProxyUrl } from '../../utils/proxy';

const baseUrl = 'https://api.coitus.ca';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const apiUrl =
    ctx.media.type === 'movie'
      ? `${baseUrl}/movie/${ctx.media.tmdbId}`
      : `${baseUrl}/tv/${ctx.media.tmdbId}/${ctx.media.season.number}/${ctx.media.episode.number}`;

  const apiRes = await ctx.proxiedFetcher(apiUrl);

  if (!apiRes.videoSource) throw new NotFoundError('No watchable item found');

  let processedUrl = apiRes.videoSource;
  let streamHeaders: Record<string, string> = {};

  if (processedUrl.includes('orbitproxy')) {
    try {
      const urlParts = processedUrl.split(/orbitproxy\.[^/]+\//);
      if (urlParts.length >= 2) {
        const encryptedPart = urlParts[1].split('.m3u8')[0];
        try {
          // H-2: Use browser-native atob + TextDecoder instead of Node.js Buffer
          const binaryStr = atob(encryptedPart);
          const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
          const decodedData = new TextDecoder().decode(bytes);
          const jsonData = JSON.parse(decodedData);
          const originalUrl = jsonData.u as string;
          const referer = (jsonData.r as string) || '';
          streamHeaders = { referer };
          processedUrl = createM3U8ProxyUrl(originalUrl, ctx.features, streamHeaders);
        } catch (jsonError) {
          console.error('Error decoding/parsing orbitproxy data:', jsonError);
        }
      }
    } catch (error) {
      console.error('Error processing orbitproxy URL:', error);
    }
  }

  ctx.progress(90);


  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        captions: [],
        playlist: processedUrl,
        type: 'hls',
        headers: streamHeaders,
        flags: [flags.CORS_ALLOWED],
      },
    ],
  };
}

export const coitusScraper = makeSourcerer({
  id: 'coitus',
  name: 'Autoembed+',
  rank: 91,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
