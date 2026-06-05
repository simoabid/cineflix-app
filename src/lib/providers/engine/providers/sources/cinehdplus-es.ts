import { load } from 'cheerio';

import { SourcererOutput, makeSourcerer } from '../base';
import { ShowScrapeContext } from '../../utils/context';
import { NotFoundError } from '../../utils/errors';

const baseUrl = 'https://cinehdplus.zone';

async function comboScraper(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  // Search by title (the site uses Spanish titles, so search the original title)
  const searchUrl = `${baseUrl}/index.php?do=search&subaction=search&story=${encodeURIComponent(ctx.media.title)}`;

  // Fetch the search results page
  const searchPage = await ctx.proxiedFetcher<string>(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Referer: baseUrl,
    },
  });

  const $search = load(searchPage);

  // Find the series page URL from search results
  // HTML structure: <a href="..."> Title</a>
  const searchResults: { title: string; url: string; year?: number }[] = [];
  $search('a[href*="/peliculas/"]').each((_, el) => {
    const $el = $search(el);
    const url = $el.attr('href');
    const title = $el.text().trim();
    if (!url || !title || title.length < 2) return;
    // Skip navigation links (e.g., "/peliculas/" without a specific movie)
    if (url.endsWith('/peliculas/') || url.endsWith('/peliculas')) return;
    // Try to extract year from URL pattern like -2024- or from sibling text
    const yearMatch = url.match(/-(\d{4})(?:-|\.html)/) || $el.parent().text().match(/(\d{4})/);
    searchResults.push({ title, url, year: yearMatch ? parseInt(yearMatch[1], 10) : undefined });
  });

  // Find the best match by title similarity
  const normalizedTitle = ctx.media.title.toLowerCase();
  const match = searchResults.find((r) => {
    const rTitle = r.title.toLowerCase();
    // Check if the search result title contains the media title or vice versa
    return rTitle.includes(normalizedTitle) || normalizedTitle.includes(rTitle);
  }) || searchResults.find((r) => {
    // Fuzzy match: check if any word from the title appears in the result
    const words = normalizedTitle.split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => r.title.toLowerCase().includes(w));
  }) || searchResults[0];

  if (!match?.url) {
    throw new NotFoundError('Series not found in search results');
  }

  ctx.progress(30);

  // Fetch the series page
  const seriesPageUrl = new URL(match.url, baseUrl);
  const seriesPage = await ctx.proxiedFetcher<string>(seriesPageUrl.href, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Referer: baseUrl,
    },
  });

  const $ = load(seriesPage);

  // Build episode selector using season and episode numbers
  const episodeSelector = `[data-num="${ctx.media.season.number}x${ctx.media.episode.number}"]`;

  // Find mirror links for the specific episode
  const mirrorUrls = $(episodeSelector)
    .siblings('.mirrors')
    .children('[data-link]')
    .map((_, el) => $(el).attr('data-link'))
    .get()
    .filter(Boolean)
    .filter((link) => !link.match(/cinehdplus/)) // Filter out internal cinehdplus links
    .map((link) => {
      // Ensure URLs are properly formatted with https
      const url = link.startsWith('http') ? link : `https://${link}`;
      try {
        return new URL(url);
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => url !== null && url.hostname !== 'cinehdplus.zone');

  if (!mirrorUrls.length) {
    throw new NotFoundError('No streaming links found for this episode');
  }

  ctx.progress(70);

  // Map URLs to appropriate embed scrapers
  const embeds = mirrorUrls
    .map((url) => {
      let embedId: string;

      // Map hostname to embed scraper ID
      if (url.hostname.includes('supervideo')) {
        embedId = 'supervideo';
      } else if (url.hostname.includes('dropload')) {
        embedId = 'dropload';
      } else {
        // Fallback for unknown hosts - skip this embed
        return null;
      }

      return {
        embedId,
        url: url.href,
      };
    })
    .filter((embed): embed is NonNullable<typeof embed> => embed !== null);

  ctx.progress(90);

  return {
    embeds,
  };
}

export const cinehdplusScraper = makeSourcerer({
  id: 'cinehdplus',
  name: 'CineHDPlus (Latino)',
  rank: 4,
  disabled: true,
  flags: [],
  scrapeShow: comboScraper,
});
