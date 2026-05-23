import axios from 'axios';
import { Movie, TVShow, Video, ApiResponse, Content, Genre, ImageConfig, MovieCredits, PersonDetails, PersonMovieCredits, ExternalIds, Season, SeasonDetails, EpisodeDetails, MovieCredit, CrewMember } from '../types';
import * as collectionDiscovery from './collectionDiscovery';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

// Runtime guards and local safe request wrapper to mitigate axios-related risks
type ApiParams = Record<string, string | number | boolean | string[] | undefined>;
type ApiConfig = { params?: ApiParams; timeout?: number; headers?: Record<string, string> };

class ControlledApiError extends Error {
  public status?: number;
  public code?: string;
  public details?: any;
  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ControlledApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT = 8000;
// Merge safe defaults into axios instance
tmdbApi.defaults.timeout = DEFAULT_TIMEOUT;
tmdbApi.defaults.headers.common = {
  ...(tmdbApi.defaults.headers.common || {}),
  Accept: 'application/json',
};

// Simple sanitize for paths/URLs: keep only pathname and query, remove any .. segments
const sanitizePath = (path: string): string => {
  if (!path || typeof path !== 'string') return '/';
  try {
    const url = new URL(path, BASE_URL);
    const rawSegments = url.pathname.split('/').filter(Boolean);
    const cleanSegments = rawSegments.filter(seg => seg !== '..');
    const cleanPath = '/' + cleanSegments.join('/');
    return `${cleanPath}${url.search || ''}`;
  } catch {
    // Fallback: strip host if present, remove .. segments
    let p = path.trim();
    p = p.replace(/^https?:\/\/[^/]+/i, '');
    const parts = p.split('?');
    const pathname = parts[0].split('/').filter(seg => seg !== '..').join('/');
    const search = parts[1] ? `?${parts[1]}` : '';
    return pathname.startsWith('/') ? `${pathname}${search}` : `/${pathname}${search}`;
  }
};

// Whitelist keys and basic value sanitization
const sanitizeParams = (params?: ApiParams): ApiParams => {
  if (!params || typeof params !== 'object') return {};
  const clean: ApiParams = {};
  const keyRegex = /^[a-zA-Z0-9_.-]+$/;
  for (const key of Object.keys(params)) {
    if (!keyRegex.test(key)) continue;
    const val = params[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') {
      const trimmed = val.trim().slice(0, 500);
      clean[key] = trimmed;
    } else if (typeof val === 'number') {
      if (!Number.isFinite(val)) continue;
      clean[key] = val;
    } else if (typeof val === 'boolean') {
      clean[key] = val;
    } else if (Array.isArray(val)) {
      const arr = val
        .map(item => {
          if (typeof item === 'string') return item.trim().slice(0, 200);
          if (typeof item === 'number' && Number.isFinite(item)) return String(item);
          return '';
        })
        .filter(Boolean);
      if (arr.length) clean[key] = arr.join(',');
    } else {
      // ignore complex objects to avoid injection
      continue;
    }
  }
  return clean;
};

const shouldRetry = (err: any): boolean => {
  if (!err) return false;
  if (err.code === 'ECONNABORTED') return true;
  const status = err?.response?.status;
  if (!status) return true; // network-level error
  if (status >= 500 && status < 600) return true;
  return false;
};

// Request Cache Implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private TTL = 5 * 60 * 1000; // 5 minutes default
  private MAX_ENTRIES = 100; // Prevent memory bloat

  constructor(ttl: number = 5 * 60 * 1000) {
    this.TTL = ttl;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    // Evict oldest if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new RequestCache();

export const clearApiCache = () => apiCache.clear();

// Override tmdbApi.get with a guarded implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tmdbApi.get = async (url: string, config: ApiConfig = {}): Promise<any> => {
  const safePath = sanitizePath(url);
  const safeParams = sanitizeParams(config?.params);

  // Create a unique cache key based on URL and params
  const queryString = new URLSearchParams(safeParams as Record<string, string>).toString();
  const cacheKey = `${safePath}?${queryString}`;

  // Check cache for GET requests
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    // Return a deep copy to prevent mutation of cached data
    return JSON.parse(JSON.stringify(cachedResponse));
  }

  const mergedParams = { ...(tmdbApi.defaults.params || {}), ...safeParams };
  const mergedConfig = {
    ...config,
    params: mergedParams,
    timeout: config?.timeout || DEFAULT_TIMEOUT,
    headers: { ...(tmdbApi.defaults.headers.common as Record<string, string> || {}), ...(config?.headers || {}) }
  };

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fullUrl = `${BASE_URL}${safePath}`;
      const response = await axios.get(fullUrl, mergedConfig);

      // Cache the success response
      if (response.status === 200) {
        apiCache.set(cacheKey, response);
      }

      return response;
    } catch (err: any) {
      if (attempt < maxAttempts && shouldRetry(err)) {
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        continue;
      }
      const status = err?.response?.status;
      const message = status ? `TMDB API error (status ${status})` : 'TMDB network error';
      const controlled = new ControlledApiError(message, status, err?.code, undefined);
      // Attach minimal original error message for debugging but avoid sensitive data
      (controlled as any).original = { message: err?.message };
      throw controlled;
    }
  }
  throw new ControlledApiError('Unknown TMDB request failure');
};

// Configuration
let imageConfig: ImageConfig | null = null;

export const getImageConfig = async (): Promise<ImageConfig> => {
  if (imageConfig) return imageConfig;

  try {
    const response = await tmdbApi.get('/configuration');
    const config = response.data.images;
    imageConfig = config;
    return config;
  } catch (error) {
    console.error('Error fetching image configuration:', error);
    // Fallback configuration
    const fallbackConfig: ImageConfig = {
      base_url: 'http://image.tmdb.org/t/p/',
      secure_base_url: 'https://image.tmdb.org/t/p/',
      backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
      logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
      poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
      profile_sizes: ['w45', 'w185', 'h632', 'original'],
      still_sizes: ['w92', 'w185', 'w300', 'original'],
    };
    imageConfig = fallbackConfig;
    return fallbackConfig;
  }
};

// Image URL helpers with proper fallback handling
export const getImageUrl = (path: string | null, size: string = 'w500'): string => {
  if (!path) return '';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getPosterUrl = (path: string | null, size: string = 'w500'): string => {
  if (!path) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjkwMCIgdmlld0JveD0iMCAwIDYwMCA5MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iOTAwIiBmaWxsPSIjMTQxNDE0Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjU2MCIgaGVpZ2h0PSI4NjAiIHJ4PSIxMiIgZmlsbD0iIzJBMkEyQSIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSIyNzAiIHk9IjQwMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTQgMlYyMEwxOSAxNVYxMUwxNCA2VjJaIiBmaWxsPSIjRTUwOTE0Ii8+CjxwYXRoIGQ9Ik0xMyAySDVDMy45IDIgMyAyLjkgMyA0VjIwQzMgMjEuMSAzLjkgMjIgNSAyMkgxM1YyWiIgZmlsbD0iI0U1MDkxNCIvPgo8L3N2Zz4KPHRleHQgeD0iMzAwIiB5PSI1MDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUG9zdGVyPC90ZXh0Pgo8L3N2Zz4=';
  }
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: string = 'w1280'): string => {
  if (!path) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMTQxNDE0Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjEyNDAiIGhlaWdodD0iNjgwIiByeD0iMTIiIGZpbGw9IiMyQTJBMkEiIHN0cm9rZT0iIzM3NDE1MSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxzdmcgeD0iNjEwIiB5PSIzMDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHN0eWxlPi5jbHMtMXtmaWxsOiNFNTA5MTQ7fTwvc3R5bGU+CjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTggNVYxOUwxOSAxMkw4IDVaIi8+Cjwvc3ZnPgo8dGV4dCB4PSI2NDAiIHk9IjQwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBCYWNrZHJvcDwvdGV4dD4KPC9zdmc+';
  }
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getLogoUrl = (path: string | null, size: string = 'w300'): string => {
  if (!path) return '';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// Movies
export const getTrendingMovies = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/trending/movie/week', {
    params: { page },
  });
  return response.data;
};

export const getPopularMovies = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/movie/popular', {
    params: { page },
  });
  return response.data;
};

export const getTopRatedMovies = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/movie/top_rated', {
    params: { page },
  });
  return response.data;
};

export const getNowPlayingMovies = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/movie/now_playing', {
    params: { page },
  });
  return response.data;
};

export const getUpcomingMovies = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/movie/upcoming', {
    params: { page },
  });
  return response.data;
};

export const getMovieDetails = async (id: number): Promise<Movie> => {
  const response = await tmdbApi.get(`/movie/${id}`);
  const movie = response.data;

  // Check cache first
  const { logoCache } = await import('./logoCache');
  const cachedLogo = logoCache.getLogo(id, 'movie');

  if (cachedLogo) {
    movie.logo_path = cachedLogo.logoPath;
    return movie;
  }

  // Fetch logos from images endpoint if not cached
  try {
    const imagesResponse = await tmdbApi.get(`/movie/${id}/images`);
    const logos = imagesResponse.data.logos;
    if (logos && logos.length > 0) {
      // Prefer English logos, or fallback to first available
      const englishLogo = logos.find((logo: { iso_639_1: string | null; file_path: string }) => logo.iso_639_1 === 'en' || logo.iso_639_1 === null);
      movie.logo_path = englishLogo ? englishLogo.file_path : logos[0].file_path;
      logoCache.setLogo(id, 'movie', movie.logo_path);
    } else {
      logoCache.setLogo(id, 'movie', null);
    }
  } catch (error) {
    // Logo fetching failed, cache the failure
    console.warn(`Failed to fetch logos for movie ${id}:`, error);
    logoCache.setLogo(id, 'movie', null, true);
  }

  return movie;
};

export const getMovieExternalIds = async (id: number): Promise<ExternalIds> => {
  const response = await tmdbApi.get(`/movie/${id}/external_ids`);
  return response.data;
};

export const getMovieVideos = async (id: number): Promise<Video[]> => {
  const response = await tmdbApi.get(`/movie/${id}/videos`);
  return response.data.results;
};

export const getMovieCredits = async (id: number): Promise<MovieCredits> => {
  const response = await tmdbApi.get(`/movie/${id}/credits`);
  return response.data;
};

export const getMovieKeywords = async (id: number): Promise<{ id: number; name: string }[]> => {
  const response = await tmdbApi.get(`/movie/${id}/keywords`);
  return response.data.keywords || [];
};

export const getSimilarMovies = async (id: number, page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get(`/movie/${id}/similar`, {
    params: { page },
  });
  return response.data;
};

// ─── Similarity Scoring Helpers ───────────────────────────────────────────────

/** Remove duplicate movies by id, keeping the first occurrence */
const deduplicateMovies = (movies: Movie[]): Movie[] =>
  movies.filter((movie, index, self) =>
    index === self.findIndex(m => m.id === movie.id)
  );

/** Resolve genre IDs from either genre_ids (list endpoints) or genres (detail endpoints) */
const resolveGenreIds = (movie: Movie): number[] =>
  movie.genre_ids || movie.genres?.map(g => g.id) || [];

/** Calculate relevance score for a candidate movie relative to a source movie */
const calculateRelevanceScore = (
  candidate: Movie,
  sourceMovie: Movie,
  similarIds: Set<number>,
  recommendationIds: Set<number>
): number => {
  let score = 0;
  if (similarIds.has(candidate.id)) score += 50;
  if (recommendationIds.has(candidate.id)) score += 40;
  const sourceGenres = resolveGenreIds(sourceMovie);
  const candidateGenres = resolveGenreIds(candidate);
  score += sourceGenres.filter(id => candidateGenres.includes(id)).length * 10;
  const ratingDiff = Math.abs((sourceMovie.vote_average || 0) - (candidate.vote_average || 0));
  score += Math.max(0, 20 - ratingDiff * 2);
  const sourceDate = new Date(sourceMovie.release_date || '');
  const candidateDate = new Date(candidate.release_date || '');
  if (!isNaN(sourceDate.getTime()) && !isNaN(candidateDate.getTime())) {
    const yearDiff = Math.abs(sourceDate.getFullYear() - candidateDate.getFullYear());
    score += Math.max(0, 15 - yearDiff);
  }
  score += Math.min(20, (candidate.popularity || 0) / 10);
  return score;
};

/** Fetch movies directed by the same director, excluding the source movie */
const fetchDirectorMovies = async (credits: MovieCredits, excludeMovieId: number): Promise<Movie[]> => {
  if (!credits?.crew) return [];
  const director = credits.crew.find((member: CrewMember) => member.job === 'Director');
  if (!director) return [];
  try {
    const directorCredits = await getPersonMovieCredits(director.id);
    return (directorCredits.crew || [])
      .filter((c: MovieCredit) => c.job === 'Director' && c.id !== excludeMovieId)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 5);
  } catch {
    return [];
  }
};

/** Fetch movies by the same top cast members, excluding the source movie */
const fetchCastMovies = async (credits: MovieCredits, excludeMovieId: number): Promise<Movie[]> => {
  if (!credits?.cast) return [];
  const castMovies: Movie[] = [];
  for (const actor of credits.cast.slice(0, 3)) {
    try {
      const actorCredits = await getPersonMovieCredits(actor.id);
      const actorMovies = actorCredits.cast
        .filter(m => m.id !== excludeMovieId)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 3);
      castMovies.push(...actorMovies);
    } catch {
      // Skip individual actor errors
    }
  }
  return castMovies;
};

// Enhanced similar movies function with multiple sources and better algorithms
export const getEnhancedSimilarMovies = async (movie: Movie, page: number = 1): Promise<Movie[]> => {
  try {
    const [similarResponse, recommendationsResponse, creditsResponse] = await Promise.all([
      tmdbApi.get(`/movie/${movie.id}/similar`, { params: { page } }),
      tmdbApi.get(`/movie/${movie.id}/recommendations`, { params: { page } }),
      getMovieCredits(movie.id)
    ]);
    const similar: Movie[] = similarResponse.data.results || [];
    const recommendations: Movie[] = recommendationsResponse.data.results || [];
    const credits = creditsResponse;
    const directorMovies = await fetchDirectorMovies(credits, movie.id);
    let genreMovies: Movie[] = [];
    if (movie.genres && movie.genres.length > 0) {
      try {
        const genreResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movie.genres[0].id,
            'vote_average.gte': Math.max(0, (movie.vote_average || 0) - 1),
            'vote_average.lte': (movie.vote_average || 0) + 1,
            sort_by: 'popularity.desc',
            page: 1
          }
        });
        genreMovies = (genreResponse.data.results || []).filter((m: Movie) => m.id !== movie.id).slice(0, 8);
      } catch { /* skip genre discovery */ }
    }
    let companyMovies: Movie[] = [];
    if (movie.production_companies && movie.production_companies.length > 0) {
      try {
        const companyResponse = await tmdbApi.get('/discover/movie', {
          params: { with_companies: movie.production_companies[0].id, sort_by: 'popularity.desc', page: 1 }
        });
        companyMovies = (companyResponse.data.results || []).filter((m: Movie) => m.id !== movie.id).slice(0, 6);
      } catch { /* skip company discovery */ }
    }
    const castMovies = await fetchCastMovies(credits, movie.id);
    const uniqueMovies = deduplicateMovies([...similar, ...recommendations, ...directorMovies, ...genreMovies, ...companyMovies, ...castMovies]);
    const similarIds = new Set(similar.map((m: Movie) => m.id));
    const recommendationIds = new Set(recommendations.map((m: Movie) => m.id));
    const scoredMovies = uniqueMovies.map(m => ({
      ...m,
      relevanceScore: calculateRelevanceScore(m, movie, similarIds, recommendationIds)
    }));
    return scoredMovies
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 20)
      .map(({ relevanceScore, ...rest }) => rest);
  } catch (error) {
    console.error('Error fetching enhanced similar movies:', error);
    const response = await tmdbApi.get(`/movie/${movie.id}/similar`, { params: { page } });
    return response.data.results || [];
  }
};

// Get movies by keywords extracted from movie data
export const getMoviesByKeywords = async (keywords: string[]): Promise<Movie[]> => {
  try {
    const keywordQueries = keywords.slice(0, 3); // Limit to 3 keywords
    const keywordMovies: Movie[] = [];

    for (const keyword of keywordQueries) {
      try {
        const response = await tmdbApi.get('/search/movie', {
          params: {
            query: keyword,
            page: 1,
            sort_by: 'popularity.desc'
          }
        });
        keywordMovies.push(...response.data.results.slice(0, 5));
      } catch (error) {
        console.error(`Error searching for keyword "${keyword}":`, error);
      }
    }

    // Remove duplicates and return
    return keywordMovies.filter((movie, index, self) =>
      index === self.findIndex(m => m.id === movie.id)
    );
  } catch (error) {
    console.error('Error fetching movies by keywords:', error);
    return [];
  }
};

// Enhanced recommendations function using multiple high-quality signals
export const getEnhancedRecommendationsMovies = async (movie: Movie, page: number = 1): Promise<Movie[]> => {
  try {
    const movieId = movie.id;

    // Fetch multiple signals in parallel
    const [recommendationsRes, keywordsRes, creditsRes] = await Promise.all([
      tmdbApi.get(`/movie/${movieId}/recommendations`, { params: { page } }),
      getMovieKeywords(movieId),
      getMovieCredits(movieId)
    ]);

    const tmdbRecs = recommendationsRes.data.results || [];
    const keywords = keywordsRes || [];
    const credits = creditsRes;

    // Signal 1: TMDB Official Recommendations (High weight)
    let results = [...tmdbRecs];

    // Signal 2: Same Director (High weight for cinema lovers)
    const director = credits.crew?.find((m: CrewMember) => m.job === 'Director');
    if (director) {
      try {
        const directorCredits = await getPersonMovieCredits(director.id);
        const otherDirectorMovies = (directorCredits.crew || [])
          .filter((c: MovieCredit) => c.job === 'Director' && c.id !== movieId)
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 5);
        results.push(...otherDirectorMovies);
      } catch (e) { console.warn('Director discovery failed', e); }
    }

    // Signal 3: Specific Plot Keywords (Discover movies with same theme, not same name)
    // We use the first 3 keywords to discover similar-themed movies
    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 3).map(k => k.id).join('|');
      try {
        const keywordBasedRes = await tmdbApi.get('/discover/movie', {
          params: {
            with_keywords: topKeywords,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            page: 1
          }
        });
        results.push(...(keywordBasedRes.data.results || []).filter((m: Movie) => m.id !== movieId));
      } catch (e) { console.warn('Keyword discovery failed', e); }
    }

    // Deduplicate and Score
    const uniqueMap = new Map<number, Movie & { score: number }>();

    results.forEach((m, idx) => {
      const existing = uniqueMap.get(m.id);
      let weight = (results.length - idx); // Base weight on order

      // Bonus for being in official recommendations
      if (tmdbRecs.find((r: Movie) => r.id === m.id)) weight += 100;

      if (existing) {
        existing.score += weight;
      } else {
        uniqueMap.set(m.id, { ...m, score: weight });
      }
    });

    // Final sort by score
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ score, ...rest }) => rest as Movie);

  } catch (error) {
    console.error('Enhanced recommendations failed:', error);
    const fallback = await getMovieRecommendations(movie.id, page);
    return fallback.results;
  }
};

export const getMovieRecommendations = async (id: number, page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get(`/movie/${id}/recommendations`, {
    params: { page },
  });
  return response.data;
};

// Person/Actor APIs
export const getPersonDetails = async (id: number): Promise<PersonDetails> => {
  const response = await tmdbApi.get(`/person/${id}`);
  return response.data;
};

export const getPersonMovieCredits = async (id: number): Promise<PersonMovieCredits> => {
  const response = await tmdbApi.get(`/person/${id}/movie_credits`);
  return response.data;
};

// TV Shows
export const getTrendingTVShows = async (page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get('/trending/tv/week', {
    params: { page },
  });
  return response.data;
};

export const getPopularTVShows = async (page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get('/tv/popular', {
    params: { page },
  });
  return response.data;
};

export const getTopRatedTVShows = async (page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get('/tv/top_rated', {
    params: { page },
  });
  return response.data;
};

export const getAiringTodayTVShows = async (page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get('/tv/airing_today', {
    params: { page },
  });
  return response.data;
};

export const getTVShowDetails = async (id: number): Promise<TVShow> => {
  const response = await tmdbApi.get(`/tv/${id}`);
  const tvShow = response.data;

  // Check cache first
  const { logoCache } = await import('./logoCache');
  const cachedLogo = logoCache.getLogo(id, 'tv');

  if (cachedLogo) {
    tvShow.logo_path = cachedLogo.logoPath;
    return tvShow;
  }

  // Fetch logos from images endpoint if not cached
  try {
    const imagesResponse = await tmdbApi.get(`/tv/${id}/images`);
    const logos = imagesResponse.data.logos;
    if (logos && logos.length > 0) {
      // Prefer English logos, or fallback to first available
      const englishLogo = logos.find((logo: { iso_639_1: string | null; file_path: string }) => logo.iso_639_1 === 'en' || logo.iso_639_1 === null);
      tvShow.logo_path = englishLogo ? englishLogo.file_path : logos[0].file_path;
      logoCache.setLogo(id, 'tv', tvShow.logo_path);
    } else {
      logoCache.setLogo(id, 'tv', null);
    }
  } catch (error) {
    // Logo fetching failed, cache the failure
    console.warn(`Failed to fetch logos for TV show ${id}:`, error);
    logoCache.setLogo(id, 'tv', null, true);
  }

  return tvShow;
};

export const getTVShowExternalIds = async (id: number): Promise<ExternalIds> => {
  const response = await tmdbApi.get(`/tv/${id}/external_ids`);
  return response.data;
};

export const getTVShowVideos = async (id: number): Promise<Video[]> => {
  const response = await tmdbApi.get(`/tv/${id}/videos`);
  return response.data.results;
};

export const getTVShowCredits = async (id: number): Promise<MovieCredits> => {
  const response = await tmdbApi.get(`/tv/${id}/credits`);
  return response.data;
};

export const getSimilarTVShows = async (id: number, page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get(`/tv/${id}/similar`, {
    params: { page },
  });
  return response.data;
};

export const getTVShowKeywords = async (id: number): Promise<{ id: number; name: string }[]> => {
  const response = await tmdbApi.get(`/tv/${id}/keywords`);
  return response.data.results || [];
};

export const getTVShowRecommendations = async (id: number, page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get(`/tv/${id}/recommendations`, {
    params: { page },
  });
  return response.data;
};

// Enhanced recommendations function for TV Shows
export const getEnhancedRecommendationsTVShows = async (tvShow: TVShow, page: number = 1): Promise<TVShow[]> => {
  try {
    const tvId = tvShow.id;

    // Parallel fetch of recommendations and keywords
    const [recommendationsRes, keywordsRes] = await Promise.all([
      tmdbApi.get(`/tv/${tvId}/recommendations`, { params: { page } }),
      getTVShowKeywords(tvId)
    ]);

    const tmdbRecs = recommendationsRes.data.results || [];
    const keywords = keywordsRes || [];

    let results = [...tmdbRecs];

    // Signal: Same Creator/Director if available in details (often hard for TV, but we try keywords)
    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 3).map(k => k.id).join('|');
      try {
        const keywordBasedRes = await tmdbApi.get('/discover/tv', {
          params: {
            with_keywords: topKeywords,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
            page: 1
          }
        });
        results.push(...(keywordBasedRes.data.results || []).filter((s: TVShow) => s.id !== tvId));
      } catch (e) { console.warn('TV Keyword discovery failed', e); }
    }

    // Deduplicate and Score
    const uniqueMap = new Map<number, TVShow & { score: number }>();

    results.forEach((s, idx) => {
      const existing = uniqueMap.get(s.id);
      let weight = (results.length - idx);

      if (tmdbRecs.find((r: TVShow) => r.id === s.id)) weight += 100;

      if (existing) {
        existing.score += weight;
      } else {
        uniqueMap.set(s.id, { ...s, score: weight });
      }
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ score, ...rest }) => rest as TVShow);

  } catch (error) {
    console.error('Enhanced TV recommendations failed:', error);
    const fallback = await getTVShowRecommendations(tvShow.id, page);
    return fallback.results;
  }
};

export const getEnhancedSimilarTVShows = async (tvShow: TVShow, page: number = 1): Promise<TVShow[]> => {
  try {
    const tvId = tvShow.id;
    const [similarRes, recommendationsRes] = await Promise.all([
      tmdbApi.get(`/tv/${tvId}/similar`, { params: { page } }),
      tmdbApi.get(`/tv/${tvId}/recommendations`, { params: { page } })
    ]);

    const similar = similarRes.data.results || [];
    const recommendations = recommendationsRes.data.results || [];

    // Combine and deduplicate
    const combined = [...similar, ...recommendations];

    // Add same genre high-rated shows
    if (tvShow.genres && tvShow.genres.length > 0) {
      try {
        const genreRes = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: tvShow.genres[0].id,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            page: 1
          }
        });
        combined.push(...(genreRes.data.results || []));
      } catch (e) { /* ignore */ }
    }

    const uniqueMap = new Map<number, TVShow>();
    combined.forEach(s => {
      if (s.id !== tvId) uniqueMap.set(s.id, s);
    });

    return Array.from(uniqueMap.values()).slice(0, 20);
  } catch (error) {
    console.error('Enhanced TV similarity failed:', error);
    const fallback = await getSimilarTVShows(tvShow.id, page);
    return fallback.results;
  }
};

export const getTVShowsByKeywords = async (keywords: string[]): Promise<TVShow[]> => {
  try {
    const keywordQueries = keywords.slice(0, 3); // Limit to 3 keywords
    const keywordPromises = keywordQueries.map(keyword =>
      tmdbApi.get('/search/tv', {
        params: {
          query: keyword,
          page: 1,
          'vote_count.gte': 50
        }
      })
    );

    const responses = await Promise.all(keywordPromises);
    const allResults = responses.flatMap(response => response.data.results || []);

    // Remove duplicates and sort by popularity
    const unique = allResults.filter((show, index, self) =>
      index === self.findIndex(s => s.id === show.id)
    );

    return unique
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 15);
  } catch (error) {
    console.error('Error fetching TV shows by keywords:', error);
    return [];
  }
};

export const getTVShowSeasons = async (id: number): Promise<Season[]> => {
  const response = await tmdbApi.get(`/tv/${id}`);
  return response.data.seasons;
};

export const getTVShowSeasonDetails = async (tvId: number, seasonNumber: number): Promise<SeasonDetails> => {
  const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`);
  return response.data;
};

export const getTVShowEpisodeDetails = async (tvId: number, seasonNumber: number, episodeNumber: number): Promise<EpisodeDetails> => {
  const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  return response.data;
};

// Genres
export const getMovieGenres = async (): Promise<Genre[]> => {
  const response = await tmdbApi.get('/genre/movie/list');
  return response.data.genres;
};

export const getTVGenres = async (): Promise<Genre[]> => {
  const response = await tmdbApi.get('/genre/tv/list');
  return response.data.genres;
};

// Search
export const searchContent = async (query: string, page: number = 1): Promise<ApiResponse<Content>> => {
  const response = await tmdbApi.get('/search/multi', {
    params: { query, page },
  });
  return response.data;
};

// Discover by genre
export const discoverMoviesByGenre = async (genreId: number, page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get('/discover/movie', {
    params: { with_genres: genreId, page },
  });
  return response.data;
};

export const discoverTVShowsByGenre = async (genreId: number, page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get('/discover/tv', {
    params: { with_genres: genreId, page },
  });
  return response.data;
};

// ─── Initialize Collection Discovery ──────────────────────────────────────────
// Pass tmdbApi functions to the extracted module to avoid circular imports.

const getCollectionDetailsFromDiscovery = collectionDiscovery.getCollectionDetails;
const searchCollectionsFromDiscovery = collectionDiscovery.searchCollections;

collectionDiscovery.initCollectionDiscovery({
  tmdbApiGet: tmdbApi.get,
  getMovieDetails,
  getCollectionDetails: getCollectionDetailsFromDiscovery,
  searchCollections: searchCollectionsFromDiscovery,
});

// ─── Re-export Collection Discovery ───────────────────────────────────────────
// All collection-related functions are now provided by collectionDiscovery.ts.
// Re-exported here so existing consumers don't need to change imports.

export const getCollectionDetails = collectionDiscovery.getCollectionDetails;
export const searchCollections = collectionDiscovery.searchCollections;
export const clearCollectionsCache = collectionDiscovery.clearCollectionsCache;
export const clearPaginationCache = collectionDiscovery.clearPaginationCache;
export const getDiscoveryProgress = collectionDiscovery.getDiscoveryProgress;
export const getCachedCollections = collectionDiscovery.getCachedCollections;
export const discoverAllCollections = collectionDiscovery.discoverAllCollections;
export const getNextCollectionsBatch = collectionDiscovery.getNextCollectionsBatch;
export const getPopularCollections = collectionDiscovery.getPopularCollections;
export const getCollectionsByCategory = collectionDiscovery.getCollectionsByCategory;
export const getTrendingCollections = collectionDiscovery.getTrendingCollections;
export const searchCollectionsAdvanced = collectionDiscovery.searchCollectionsAdvanced;
export const searchCollectionsDirect = collectionDiscovery.searchCollectionsDirect;
export const searchCollectionsHybrid = collectionDiscovery.searchCollectionsHybrid;
export const getCollectionStats = collectionDiscovery.getCollectionStats;
export const classifyCollectionType = collectionDiscovery.classifyCollectionType;
export const determineCollectionStatus = collectionDiscovery.determineCollectionStatus;
export const extractGenreCategories = collectionDiscovery.extractGenreCategories;
export const extractStudio = collectionDiscovery.extractStudio;

// ─── Logo Preloading ──────────────────────────────────────────────────────────

// Batch fetch logos for multiple items
export const batchFetchLogos = async (
  items: Array<{ id: number; type: 'movie' | 'tv' }>
): Promise<void> => {
  const { logoCache } = await import('./logoCache');
  await logoCache.preloadLogos(items);
};

// Enhanced content fetching with logo preloading
export const getTrendingMoviesWithLogos = async (page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await getTrendingMovies(page);

  // Preload logos for trending movies in background
  if (response.results.length > 0) {
    batchFetchLogos(response.results.map(movie => ({ id: movie.id, type: 'movie' as const })))
      .catch(error => console.warn('Failed to preload movie logos:', error));
  }

  return response;
};

export const getTrendingTVShowsWithLogos = async (page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await getTrendingTVShows(page);

  // Preload logos for trending TV shows in background
  if (response.results.length > 0) {
    batchFetchLogos(response.results.map(tvShow => ({ id: tvShow.id, type: 'tv' as const })))
      .catch(error => console.warn('Failed to preload TV show logos:', error));
  }

  return response;
};

// Error handling wrapper
export const safeApiCall = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
};
