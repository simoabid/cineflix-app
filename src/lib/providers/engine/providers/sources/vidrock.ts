import { flags } from '../../entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '../base';
import { MovieScrapeContext } from '../../utils/context';
import { NotFoundError } from '../../utils/errors';

const headers = {
  Origin: 'https://vidrock.net',
  Referer: 'https://vidrock.net/',
};

// Server-side encryption endpoint — the passphrase never touches the client
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || '/api';
const VIDROCK_ENCRYPT_URL = `${API_BASE_URL}/vidrock/encrypt`;

const baseUrl = 'https://vidrock.net/api';
const userAgent =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

/**
 * Request the encrypted path from the server (passphrase stays server-side).
 */
async function getEncryptedPath(itemId: string, itemType: string): Promise<string> {
  const response = await fetch(VIDROCK_ENCRYPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ itemId, itemType }),
  });
  if (!response.ok) {
    throw new NotFoundError('Failed to encrypt Vidrock request');
  }
  const data = await response.json();
  if (!data.success || !data.data?.path) {
    throw new NotFoundError('Vidrock encryption returned invalid data');
  }
  return data.data.path;
}


async function comboScraper(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const itemType = 'movie';
  const itemId = ctx.media.tmdbId;

  // Get encrypted path from server (passphrase stays server-side)
  const encryptedPath = await getEncryptedPath(String(itemId), itemType);
  const url = `${baseUrl}/${encryptedPath}`;

  const res = await ctx.proxiedFetcher<any>(url, {
    headers: {
      ...headers,
      'User-Agent': userAgent,
    },
  });

  let parsedRes = res;

  if (typeof res === 'string') {
    try {
      parsedRes = JSON.parse(res);
    } catch (e) {
      throw new NotFoundError('No sources found from Vidrock API: Invalid JSON response');
    }
  }

  if (!parsedRes || typeof parsedRes !== 'object' || Array.isArray(parsedRes)) {
    throw new NotFoundError('No sources found from Vidrock API: Invalid response');
  }

  const embeds = [];

  const createMirrorEmbed = (serverName: string, serverData: { url?: string }) => {
    if (!serverData?.url) return null;
    if (serverName.includes('Astra') || serverData.url.includes('.workers.dev')) return null;

    const context = {
      type: 'hls',
      stream: serverData.url,
      headers,
      flags: [flags.CORS_ALLOWED],
      captions: [],
    };

    return {
      embedId: 'mirror',
      url: JSON.stringify(context),
    };
  };

  for (const sourceKey of Object.keys(parsedRes)) {
    const sourceData = parsedRes[sourceKey] as { url?: string } | null;
    if (sourceData?.url && sourceData.url !== null) {
      // Handle Atlas server which returns a playlist URL
      if (sourceKey === 'Atlas' || sourceData.url.includes('cdn.vidrock.store/playlist/')) {
        try {
          const playlistRes = await ctx.proxiedFetcher<any>(sourceData.url, {
            headers: {
              ...headers,
              'User-Agent': userAgent,
            },
          });

          let playlistData = playlistRes;
          if (typeof playlistRes === 'string') {
            try {
              playlistData = JSON.parse(playlistRes);
            } catch (e) {
              continue;
            }
          }

          if (Array.isArray(playlistData) && playlistData.length > 0) {
            // Build qualities object from playlist
            const qualities: Record<string, { type: 'mp4'; url: string }> = {};

            for (const stream of playlistData) {
              if (stream?.url && stream?.resolution) {
                const resolution = stream.resolution.toString();
                qualities[resolution] = {
                  type: 'mp4',
                  url: stream.url,
                };
              }
            }

            if (Object.keys(qualities).length > 0) {
              const context = {
                type: 'file',
                qualities,
                headers,
                flags: [flags.CORS_ALLOWED],
                captions: [],
              };

              embeds.push({
                embedId: 'mirror',
                url: JSON.stringify(context),
              });
            }
          }
        } catch (e) {
          // If playlist fetch fails, skip this source
          continue;
        }
      } else {
        const embed = createMirrorEmbed(sourceKey, sourceData);
        if (embed) embeds.push(embed);
      }
    }
  }

  if (embeds.length === 0) {
    throw new NotFoundError('No valid sources found from Vidrock API');
  }

  return {
    embeds,
  };
}

export const vidrockScraper = makeSourcerer({
  id: 'vidrock',
  name: 'Granite',
  rank: 170,
  disabled: false,
  flags: [],
  scrapeMovie: comboScraper,
});
