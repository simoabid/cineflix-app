import { MovieScrapeContext, ShowScrapeContext } from './context';

// Route through server-side TMDB proxy — never expose API keys in client code
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || '/api';
const TMDB_PROXY_URL = `${API_BASE_URL}/tmdb`;

export async function fetchTMDBName(
  ctx: ShowScrapeContext | MovieScrapeContext,
  lang: string = 'en-US',
): Promise<string> {
  const type = ctx.media.type === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_PROXY_URL}/${type}/${ctx.media.tmdbId}?language=${lang}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error fetching TMDB data: ${response.statusText}`);
  }

  const data = await response.json();
  return ctx.media.type === 'movie' ? data.title : data.name;
}
