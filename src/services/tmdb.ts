import axios from 'axios';
import { Movie, TVShow, Video, ApiResponse, Content, Genre, ImageConfig, Collection, CollectionDetails, CollectionType, CollectionStatus, MovieCredits, PersonDetails, PersonMovieCredits, ExternalIds } from '../types';

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
type AnyObject = { [key: string]: any };

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
const sanitizeParams = (params?: AnyObject): AnyObject => {
  if (!params || typeof params !== 'object') return {};
  const clean: AnyObject = {};
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
tmdbApi.get = async (url: string, config: AnyObject = {}): Promise<any> => {
  const safePath = sanitizePath(url);
  const safeParams = sanitizeParams(config?.params);

  // Create a unique cache key based on URL and params
  const queryString = new URLSearchParams(safeParams as any).toString();
  const cacheKey = `${safePath}?${queryString}`;

  // Check cache for GET requests
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    // Return a deep copy to prevent mutation of cached data
    return JSON.parse(JSON.stringify(cachedResponse));
  }

  const mergedParams = { ...(tmdbApi.defaults.params || {}), ...safeParams };
  const mergedConfig: AnyObject = {
    ...config,
    params: mergedParams,
    timeout: config?.timeout || DEFAULT_TIMEOUT,
    headers: { ...(tmdbApi.defaults.headers.common || {}), ...(config?.headers || {}) }
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
        await delay(200 * attempt);
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

// Comprehensive Collection Discovery System
interface CollectionDiscoveryCache {
  collections: CollectionDetails[];
  lastFetched: number;
  discoveryProgress: {
    moviesScanned: number;
    collectionsFound: number;
    currentStep: string;
  };
}

let discoveryCache: CollectionDiscoveryCache = {
  collections: [],
  lastFetched: 0,
  discoveryProgress: {
    moviesScanned: 0,
    collectionsFound: 0,
    currentStep: 'Not started'
  }
};

const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for comprehensive data
const RATE_LIMIT_DELAY = 100; // Reduced for faster loading

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clear cache completely
export const clearCollectionsCache = (): void => {
  discoveryCache = {
    collections: [],
    lastFetched: 0,
    discoveryProgress: {
      moviesScanned: 0,
      collectionsFound: 0,
      currentStep: 'Cache cleared'
    }
  };
  console.log('Collections cache cleared');
};

// Check if cache is still valid
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

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
      const englishLogo = logos.find((logo: any) => logo.iso_639_1 === 'en' || logo.iso_639_1 === null);
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

export const getSimilarMovies = async (id: number, page: number = 1): Promise<ApiResponse<Movie>> => {
  const response = await tmdbApi.get(`/movie/${id}/similar`, {
    params: { page },
  });
  return response.data;
};

// Enhanced similar movies function with multiple sources and better algorithms
export const getEnhancedSimilarMovies = async (movie: Movie, page: number = 1): Promise<Movie[]> => {
  try {
    // Get multiple sources of similar content
    const [similarResponse, recommendationsResponse, creditsResponse] = await Promise.all([
      tmdbApi.get(`/movie/${movie.id}/similar`, { params: { page } }),
      tmdbApi.get(`/movie/${movie.id}/recommendations`, { params: { page } }),
      tmdbApi.get(`/movie/${movie.id}/credits`)
    ]);

    const similar = similarResponse.data.results || [];
    const recommendations = recommendationsResponse.data.results || [];
    const credits = creditsResponse.data;

    // Get movies by same director
    let directorMovies: Movie[] = [];
    if (credits?.crew) {
      const director = credits.crew.find((member: any) => member.job === 'Director');
      if (director) {
        try {
          const directorCredits = await getPersonMovieCredits(director.id);
          directorMovies = directorCredits.cast
            .filter(m => m.id !== movie.id)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 5);
        } catch (error) {
          console.error('Error fetching director movies:', error);
        }
      }
    }

    // Get movies by same genre with similar rating
    let genreMovies: Movie[] = [];
    if (movie.genres && movie.genres.length > 0) {
      try {
        const primaryGenre = movie.genres[0];
        const genreResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: primaryGenre.id,
            'vote_average.gte': Math.max(0, (movie.vote_average || 0) - 1),
            'vote_average.lte': (movie.vote_average || 0) + 1,
            sort_by: 'popularity.desc',
            page: 1
          }
        });
        genreMovies = genreResponse.data.results
          .filter((m: Movie) => m.id !== movie.id)
          .slice(0, 8);
      } catch (error) {
        console.error('Error fetching genre movies:', error);
      }
    }

    // Get movies by same production company
    let companyMovies: Movie[] = [];
    if (movie.production_companies && movie.production_companies.length > 0) {
      try {
        const primaryCompany = movie.production_companies[0];
        const companyResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_companies: primaryCompany.id,
            sort_by: 'popularity.desc',
            page: 1
          }
        });
        companyMovies = companyResponse.data.results
          .filter((m: Movie) => m.id !== movie.id)
          .slice(0, 6);
      } catch (error) {
        console.error('Error fetching company movies:', error);
      }
    }

    // Get movies by same cast members
    let castMovies: Movie[] = [];
    if (credits?.cast) {
      const topCast = credits.cast.slice(0, 3);
      for (const actor of topCast) {
        try {
          const actorCredits = await getPersonMovieCredits(actor.id);
          const actorMovies = actorCredits.cast
            .filter(m => m.id !== movie.id)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 3);
          castMovies.push(...actorMovies);
        } catch (error) {
          console.error('Error fetching cast movies:', error);
        }
      }
    }

    // Combine all sources and remove duplicates
    const allMovies = [
      ...similar,
      ...recommendations,
      ...directorMovies,
      ...genreMovies,
      ...companyMovies,
      ...castMovies
    ];

    // Remove duplicates and sort by relevance score
    const uniqueMovies = allMovies.filter((movie, index, self) =>
      index === self.findIndex(m => m.id === movie.id)
    );

    // Calculate relevance score based on multiple factors
    const scoredMovies = uniqueMovies.map(m => {
      let score = 0;

      // Base score from TMDB's similarity algorithm
      if (similar.find((s: any) => s.id === m.id)) score += 50;
      if (recommendations.find((r: any) => r.id === m.id)) score += 40;

      // Genre similarity
      const commonGenres = movie.genres?.filter(g =>
        m.genres?.some((mg: any) => mg.id === g.id)
      ).length || 0;
      score += commonGenres * 10;

      // Rating similarity
      const ratingDiff = Math.abs((movie.vote_average || 0) - (m.vote_average || 0));
      score += Math.max(0, 20 - ratingDiff * 2);

      // Year similarity (prefer movies from similar time periods)
      const movieYear = new Date(movie.release_date).getFullYear();
      const mYear = new Date(m.release_date).getFullYear();
      const yearDiff = Math.abs(movieYear - mYear);
      score += Math.max(0, 15 - yearDiff);

      // Popularity bonus
      score += Math.min(20, (m.popularity || 0) / 10);

      return { ...m, relevanceScore: score };
    });

    // Sort by relevance score and return top results
    return scoredMovies
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 20)
      .map(({ relevanceScore, ...movie }) => movie);

  } catch (error) {
    console.error('Error fetching enhanced similar movies:', error);
    // Fallback to basic similar movies
    const response = await tmdbApi.get(`/movie/${movie.id}/similar`, {
      params: { page },
    });
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
      const englishLogo = logos.find((logo: any) => logo.iso_639_1 === 'en' || logo.iso_639_1 === null);
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

export const getTVShowRecommendations = async (id: number, page: number = 1): Promise<ApiResponse<TVShow>> => {
  const response = await tmdbApi.get(`/tv/${id}/recommendations`, {
    params: { page },
  });
  return response.data;
};

// Enhanced similar content functions
export const getEnhancedSimilarTVShows = async (tvShow: TVShow, page: number = 1): Promise<TVShow[]> => {
  try {
    // Get multiple sources of similar content
    const [similarResponse, recommendationsResponse] = await Promise.all([
      tmdbApi.get(`/tv/${tvShow.id}/similar`, { params: { page } }),
      tmdbApi.get(`/tv/${tvShow.id}/recommendations`, { params: { page } })
    ]);

    const similar = similarResponse.data.results || [];
    const recommendations = recommendationsResponse.data.results || [];

    // Combine and deduplicate results
    const combined = [...similar, ...recommendations];
    const unique = combined.filter((show, index, self) =>
      index === self.findIndex(s => s.id === show.id)
    );

    // If we have genres, also fetch content by primary genre
    if (tvShow.genres && tvShow.genres.length > 0) {
      const primaryGenre = tvShow.genres[0];
      try {
        const genreResponse = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: primaryGenre.id,
            sort_by: 'popularity.desc',
            page: 1,
            'vote_count.gte': 100 // Only shows with decent ratings
          }
        });

        const genreShows = genreResponse.data.results || [];
        // Add genre-based shows, avoiding duplicates
        genreShows.forEach((show: TVShow) => {
          if (!unique.find(s => s.id === show.id)) {
            unique.push(show);
          }
        });
      } catch (error) {
        console.error('Error fetching genre-based shows:', error);
      }
    }

    // Sort by relevance (similarity score, then popularity)
    return unique
      .filter(show => show.id !== tvShow.id) // Exclude the original show
      .sort((a, b) => {
        // Prioritize shows with similar genres
        const aGenreMatch = tvShow.genres?.some(g =>
          a.genre_ids?.includes(g.id)
        ) ? 1 : 0;
        const bGenreMatch = tvShow.genres?.some(g =>
          b.genre_ids?.includes(g.id)
        ) ? 1 : 0;

        if (aGenreMatch !== bGenreMatch) {
          return bGenreMatch - aGenreMatch;
        }

        // Then sort by popularity
        return b.vote_count - a.vote_count;
      })
      .slice(0, 20); // Return top 20 most relevant
  } catch (error) {
    console.error('Error fetching enhanced similar TV shows:', error);
    // Fallback to basic similar
    const response = await tmdbApi.get(`/tv/${tvShow.id}/similar`, {
      params: { page },
    });
    return response.data.results || [];
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

export const getTVShowSeasons = async (id: number): Promise<any> => {
  const response = await tmdbApi.get(`/tv/${id}`);
  return response.data.seasons;
};

export const getTVShowSeasonDetails = async (tvId: number, seasonNumber: number): Promise<any> => {
  const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`);
  return response.data;
};

export const getTVShowEpisodeDetails = async (tvId: number, seasonNumber: number, episodeNumber: number): Promise<any> => {
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

// Collections API
export const getCollectionDetails = async (collectionId: number): Promise<CollectionDetails | null> => {
  try {
    const response = await tmdbApi.get(`/collection/${collectionId}`);
    const collection = response.data;

    // Get additional movie details for runtime calculation
    const filmsWithDetails = await Promise.all(
      collection.parts.map(async (movie: Movie) => {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          return movieDetails || movie;
        } catch {
          return movie;
        }
      })
    );

    const totalRuntime = filmsWithDetails.reduce((total, movie) => {
      return total + (movie.runtime || 0);
    }, 0);

    const sortedFilms = filmsWithDetails.sort((a, b) =>
      new Date(a.release_date || '').getTime() - new Date(b.release_date || '').getTime()
    );

    const firstReleaseDate = sortedFilms[0]?.release_date || '';
    const latestReleaseDate = sortedFilms[sortedFilms.length - 1]?.release_date || '';

    return {
      ...collection,
      parts: sortedFilms,
      film_count: collection.parts.length,
      total_runtime: totalRuntime,
      first_release_date: firstReleaseDate,
      latest_release_date: latestReleaseDate,
      type: classifyCollectionType(collection.parts.length),
      status: determineCollectionStatus(collection.parts),
      genre_categories: extractGenreCategories(sortedFilms),
      studio: extractStudio(sortedFilms)
    };
  } catch (error) {
    console.error(`Error fetching collection ${collectionId}:`, error);
    return null;
  }
};

export const searchCollections = async (query: string, page: number = 1): Promise<ApiResponse<Collection> | null> => {
  try {
    const response = await tmdbApi.get('/search/collection', {
      params: { query, page }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching collections:', error);
    return null;
  }
};

// Efficient Collection Discovery - Gets fresh collections without overwhelming API
export const discoverAllCollections = async (
  maxCollections: number = 200,
  forceRefresh: boolean = false,
  progressCallback?: (progress: { scanned: number; found: number; step: string }) => void
): Promise<CollectionDetails[]> => {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isCacheValid(discoveryCache.lastFetched) && discoveryCache.collections.length > 0) {
    console.log(`✅ Returning ${discoveryCache.collections.length} cached collections (fast load)`);
    if (progressCallback) {
      progressCallback({
        scanned: discoveryCache.collections.length,
        found: discoveryCache.collections.length,
        step: `✅ Loaded ${discoveryCache.collections.length} cached collections`
      });
    }
    return discoveryCache.collections.slice(0, maxCollections);
  }

  // Only clear cache if we're forcing refresh
  if (forceRefresh) {
    clearCollectionsCache();
  }

  try {
    console.log('🚀 Starting lightning-fast collection discovery from TMDB...');
    const discoveredCollections = new Map<number, CollectionDetails>();
    let totalMoviesScanned = 0;

    const updateProgress = (step: string) => {
      discoveryCache.discoveryProgress = {
        moviesScanned: totalMoviesScanned,
        collectionsFound: discoveredCollections.size,
        currentStep: step
      };
      if (progressCallback) {
        progressCallback({
          scanned: totalMoviesScanned,
          found: discoveredCollections.size,
          step: step
        });
      }
    };

    // Add timeout to prevent infinite loading
    const discoveryTimeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Discovery timeout - using fallback')), 45000); // 45 second timeout
    });

    const discoveryProcess = async () => {
      // Step 1: Fast movie scan (optimized)
      updateProgress('⚡ Quick scan of popular movies...');
      await efficientMovieScan(discoveredCollections, updateProgress, (scanned) => {
        totalMoviesScanned = scanned;
      });

      // Step 2: Essential franchise search
      updateProgress('🔍 Finding major franchises...');
      await targetedFranchiseSearch(discoveredCollections, updateProgress);

      // Step 3: Key genre sampling
      updateProgress('🎭 Sampling top genres...');
      await quickGenreSampling(discoveredCollections, updateProgress);
    };

    // Race between discovery and timeout
    await Promise.race([discoveryProcess(), discoveryTimeout]);

    const allCollections = Array.from(discoveredCollections.values())
      .filter(collection => collection && collection.film_count >= 2)
      .sort((a, b) => b.film_count - a.film_count);

    // Update cache
    discoveryCache.collections = allCollections;
    discoveryCache.lastFetched = Date.now();

    updateProgress(`✅ Lightning discovery complete! Found ${allCollections.length} collections`);
    console.log(`🎉 Successfully discovered ${allCollections.length} collections in record time!`);

    return allCollections.slice(0, maxCollections);

  } catch (error: any) {
    console.error('❌ Error in collection discovery:', error);

    // Check if it's a timeout error
    if (error.message?.includes('timeout')) {
      console.log('⏱️ Discovery timed out, using backup method for reliability');
      if (progressCallback) {
        progressCallback({
          scanned: 0,
          found: 0,
          step: 'ℹ️ Switching to backup discovery method...'
        });
      }
    } else {
      if (progressCallback) {
        progressCallback({
          scanned: 0,
          found: 0,
          step: '❌ Discovery failed, trying backup method...'
        });
      }
    }

    // Fallback to basic discovery (fast and reliable)
    return await basicCollectionDiscovery(maxCollections, progressCallback);
  }
};

// Fast movie scan - optimized for speed
const efficientMovieScan = async (
  collectionsMap: Map<number, CollectionDetails>,
  updateProgress: (step: string) => void,
  updateScanned: (scanned: number) => void
): Promise<void> => {
  const endpoints = [
    { name: 'Popular Movies', endpoint: '/movie/popular' },
    { name: 'Trending Movies', endpoint: '/trending/movie/week' }
  ];

  let totalScanned = 0;

  for (const { name, endpoint } of endpoints) {
    updateProgress(`Scanning ${name}...`);

    try {
      const response = await tmdbApi.get(endpoint, { params: { page: 1 } });
      const movies = response.data.results?.slice(0, 10) || []; // Only first 10 movies for speed

      for (const movie of movies) {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          totalScanned++;
          updateScanned(totalScanned);

          if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
            const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
            if (collection && collection.film_count >= 2) {
              collectionsMap.set(collection.id, collection);
              console.log(`🎬 Found collection: ${collection.name} (${collection.film_count} films)`);
            }
          }

          await delay(RATE_LIMIT_DELAY);
        } catch (error) {
          // Skip individual movie errors
        }
      }

      await delay(50); // Reduced delay between endpoints
    } catch (error) {
      console.warn(`Error scanning ${name}:`, error);
    }
  }
};

// Fast franchise search - only essential franchises
const targetedFranchiseSearch = async (
  collectionsMap: Map<number, CollectionDetails>,
  updateProgress: (step: string) => void
): Promise<void> => {
  const essentialFranchises = [
    'Marvel', 'Star Wars', 'Harry Potter', 'Fast Furious', 'Batman',
    'Lord of the Rings', 'Jurassic', 'Toy Story', 'Shrek', 'Matrix'
  ];

  for (const franchise of essentialFranchises) {
    updateProgress(`Searching for ${franchise}...`);

    try {
      const searchResponse = await searchCollections(franchise);
      if (searchResponse?.results) {
        for (const collection of searchResponse.results.slice(0, 1)) { // Only top result
          if (!collectionsMap.has(collection.id)) {
            const detailedCollection = await getCollectionDetails(collection.id);
            if (detailedCollection && detailedCollection.film_count >= 2) {
              collectionsMap.set(collection.id, detailedCollection);
              console.log(`🔍 Found franchise: ${detailedCollection.name}`);
            }
          }
          await delay(50); // Reduced delay
        }
      }
      await delay(30); // Reduced delay between franchises
    } catch (error) {
      console.warn(`Search failed for ${franchise}:`, error);
    }
  }
};

// Minimal genre sampling - fastest discovery
const quickGenreSampling = async (
  collectionsMap: Map<number, CollectionDetails>,
  updateProgress: (step: string) => void
): Promise<void> => {
  const topGenres = [
    { id: 28, name: 'Action' },
    { id: 16, name: 'Animation' },
    { id: 14, name: 'Fantasy' },
    { id: 27, name: 'Horror' }
  ];

  for (const genre of topGenres) {
    updateProgress(`Sampling ${genre.name} collections...`);

    try {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: genre.id,
          sort_by: 'popularity.desc',
          page: 1
        }
      });

      const movies = response.data.results?.slice(0, 5) || []; // Only 5 movies per genre

      for (const movie of movies) {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
            const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
            if (collection && collection.film_count >= 2) {
              collectionsMap.set(collection.id, collection);
              console.log(`🎭 Found ${genre.name} collection: ${collection.name}`);
            }
          }
          await delay(50); // Reduced delay
        } catch (error) {
          // Skip individual errors
        }
      }

      await delay(30); // Reduced delay between genres
    } catch (error) {
      console.warn(`Error sampling ${genre.name} collections:`, error);
    }
  }
};

// Basic collection discovery fallback - minimal API calls
const basicCollectionDiscovery = async (
  maxCollections: number,
  progressCallback?: (progress: { scanned: number; found: number; step: string }) => void
): Promise<CollectionDetails[]> => {
  const collections: CollectionDetails[] = [];

  try {
    if (progressCallback) {
      progressCallback({ scanned: 0, found: 0, step: 'Using backup discovery method...' });
    }

    // Just get collections from popular movies - minimal approach
    const response = await tmdbApi.get('/movie/popular');
    const movies = response.data.results?.slice(0, 15) || []; // Reduced to 15 movies

    let scanned = 0;
    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        scanned++;

        if (movieDetails?.belongs_to_collection) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            const exists = collections.find(c => c.id === collection.id);
            if (!exists) {
              collections.push(collection);
              console.log(`🎬 Basic discovery found: ${collection.name}`);
            }
          }
        }

        if (progressCallback) {
          progressCallback({
            scanned,
            found: collections.length,
            step: `Found ${collections.length} collections...`
          });
        }

        await delay(50); // Reduced delay

        if (collections.length >= maxCollections) break;
      } catch (error) {
        // Skip individual errors
      }
    }

    if (progressCallback) {
      progressCallback({
        scanned,
        found: collections.length,
        step: `✅ Backup method found ${collections.length} collections`
      });
    }

    return collections.sort((a, b) => b.film_count - a.film_count);

  } catch (error) {
    console.error('❌ Even basic discovery failed:', error);
    return [];
  }
};



// Export progress tracking function
export const getDiscoveryProgress = () => {
  return discoveryCache.discoveryProgress;
};

// Infinite scroll pagination cache
interface PaginationCache {
  collections: CollectionDetails[];
  currentPage: number;
  totalPages: number;
  lastFetched: number;
  genreIndex: number;
  moviePageIndex: number;
  searchTermIndex: number;
}

const paginationCache: PaginationCache = {
  collections: [],
  currentPage: 0,
  totalPages: 9999, // Virtually unlimited for infinite scroll
  lastFetched: 0,
  genreIndex: 0,
  moviePageIndex: 1,
  searchTermIndex: 0
};

// Clear pagination cache
export const clearPaginationCache = () => {
  paginationCache.collections = [];
  paginationCache.currentPage = 0;
  paginationCache.lastFetched = 0;
  paginationCache.genreIndex = 0;
  paginationCache.moviePageIndex = 1;
  paginationCache.searchTermIndex = 0;
  console.log('🗑️ Pagination cache cleared');
};

// Get next batch of collections for infinite scroll
export const getNextCollectionsBatch = async (
  batchSize: number = 20
): Promise<{ collections: CollectionDetails[]; hasMore: boolean }> => {
  try {
    console.log(`📄 Loading next batch of ${batchSize} collections...`);

    const newCollections = new Map<number, CollectionDetails>();
    let attempts = 0;
    const maxAttempts = 12; // Increased attempts for more discovery methods

    // Try different discovery methods until we get enough collections
    while (newCollections.size < batchSize && attempts < maxAttempts) {
      attempts++;

      const currentSize = newCollections.size;

      // Method 1: Popular movies from different pages
      if (attempts === 1) {
        await discoverFromPopularMovies(newCollections, paginationCache.moviePageIndex, 8);
        paginationCache.moviePageIndex++;
      }

      // Method 2: Genre-based discovery
      else if (attempts === 2) {
        await discoverFromGenres(newCollections, paginationCache.genreIndex, 5);
        paginationCache.genreIndex++;
      }

      // Method 3: Year-based discovery
      else if (attempts === 3) {
        await discoverFromYears(newCollections, 5);
      }

      // Method 4: Search-based discovery
      else if (attempts === 4) {
        await discoverFromSearchTerms(newCollections, paginationCache.searchTermIndex, 5);
        paginationCache.searchTermIndex++;
      }

      // Method 5: Now playing/upcoming movies
      else if (attempts === 5) {
        await discoverFromCurrentMovies(newCollections, 8);
      }

      // Method 6: Top rated movies
      else if (attempts === 6) {
        await discoverFromTopRatedMovies(newCollections, Math.floor(paginationCache.moviePageIndex / 2) + 1, 6);
      }

      // Method 7: Trending movies (weekly)
      else if (attempts === 7) {
        await discoverFromTrendingMovies(newCollections, 'week', 6);
      }

      // Method 8: Trending movies (daily)
      else if (attempts === 8) {
        await discoverFromTrendingMovies(newCollections, 'day', 6);
      }

      // Method 9: Actor-based discovery (popular actors)
      else if (attempts === 9) {
        await discoverFromPopularActors(newCollections, 4);
      }

      // Method 10: Director-based discovery
      else if (attempts === 10) {
        await discoverFromPopularDirectors(newCollections, 4);
      }

      // Method 11: Company-based discovery (studios)
      else if (attempts === 11) {
        await discoverFromProductionCompanies(newCollections, 4);
      }

      // Method 12: Random deep discovery
      else if (attempts === 12) {
        await discoverFromRandomDeepSearch(newCollections, 8);
      }

      // If no new collections found in this attempt, skip ahead
      if (newCollections.size === currentSize) {
        console.log(`⚠️ Method ${attempts} returned no new collections, trying next method...`);
      }
    }

    const collections = Array.from(newCollections.values())
      .filter(collection => {
        // Avoid duplicates from cache
        return !paginationCache.collections.some(cached => cached.id === collection.id);
      })
      .sort((a, b) => b.film_count - a.film_count)
      .slice(0, batchSize);

    // Add to cache
    paginationCache.collections.push(...collections);
    paginationCache.currentPage++;
    paginationCache.lastFetched = Date.now();

    console.log(`✅ Loaded ${collections.length} new collections (total cached: ${paginationCache.collections.length})`);

    // Always return hasMore as true for infinite scroll (only stop if truly no collections found)
    const hasMore = collections.length > 0 || paginationCache.currentPage < 100; // Give it more chances

    return {
      collections,
      hasMore
    };

  } catch (error) {
    console.error('❌ Error loading next batch:', error);
    // Even on error, return hasMore as true so user can try again
    return { collections: [], hasMore: true };
  }
};

// Discover from popular movies (different pages)
const discoverFromPopularMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  page: number,
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApi.get('/movie/popular', { params: { page } });
    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from popular movies page ${page}:`, error);
  }
};

// Discover from genres (rotating through different genres)
const discoverFromGenres = async (
  collectionsMap: Map<number, CollectionDetails>,
  genreIndex: number,
  maxMovies: number
): Promise<void> => {
  const genres = [
    { id: 28, name: 'Action' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 18, name: 'Drama' },
    { id: 14, name: 'Fantasy' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 53, name: 'Thriller' },
    { id: 37, name: 'Western' }
  ];

  const genre = genres[genreIndex % genres.length];

  try {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: genre.id,
        sort_by: 'popularity.desc',
        page: Math.floor(genreIndex / genres.length) + 1
      }
    });

    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from ${genre.name} genre:`, error);
  }
};

// Discover from different years
const discoverFromYears = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const currentYear = new Date().getFullYear();
  const randomYear = currentYear - Math.floor(Math.random() * 30); // Random year from last 30 years

  try {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        primary_release_year: randomYear,
        sort_by: 'popularity.desc',
        page: 1
      }
    });

    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from year ${randomYear}:`, error);
  }
};

// Discover from search terms
const discoverFromSearchTerms = async (
  collectionsMap: Map<number, CollectionDetails>,
  termIndex: number,
  maxResults: number
): Promise<void> => {
  const searchTerms = [
    'collection', 'saga', 'trilogy', 'series', 'franchise', 'universe',
    'chronicles', 'adventures', 'legend', 'story', 'tales', 'journey',
    'war', 'battle', 'hero', 'super', 'magic', 'dragon', 'space',
    'world', 'kingdom', 'empire', 'destiny', 'revenge', 'return'
  ];

  const term = searchTerms[termIndex % searchTerms.length];

  try {
    const searchResponse = await searchCollections(term);
    if (searchResponse?.results) {
      const collections = searchResponse.results.slice(0, maxResults);

      for (const collection of collections) {
        if (!collectionsMap.has(collection.id)) {
          const detailedCollection = await getCollectionDetails(collection.id);
          if (detailedCollection && detailedCollection.film_count >= 2) {
            collectionsMap.set(collection.id, detailedCollection);
          }
        }
        await delay(50);
      }
    }
  } catch (error) {
    console.warn(`Error searching for "${term}":`, error);
  }
};

// Discover from current movies (now playing/upcoming)
const discoverFromCurrentMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const endpoints = ['/movie/now_playing', '/movie/upcoming'];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  try {
    const response = await tmdbApi.get(endpoint);
    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from ${endpoint}:`, error);
  }
};

// Discover from top rated movies
const discoverFromTopRatedMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  page: number,
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApi.get('/movie/top_rated', { params: { page } });
    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from top rated movies page ${page}:`, error);
  }
};

// Discover from trending movies
const discoverFromTrendingMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  timeWindow: 'day' | 'week',
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApi.get(`/trending/movie/${timeWindow}`);
    const movies = response.data.results?.slice(0, maxMovies) || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn(`Error discovering from trending movies (${timeWindow}):`, error);
  }
};

// Discover from popular actors' filmographies
const discoverFromPopularActors = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxActors: number
): Promise<void> => {
  try {
    const response = await tmdbApi.get('/person/popular');
    const actors = response.data.results?.slice(0, maxActors) || [];

    for (const actor of actors) {
      try {
        const creditsResponse = await tmdbApi.get(`/person/${actor.id}/movie_credits`);
        const movies = creditsResponse.data.cast?.slice(0, 5) || []; // Top 5 movies per actor

        for (const movie of movies) {
          try {
            const movieDetails = await getMovieDetails(movie.id);
            if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
              const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
              if (collection && collection.film_count >= 2) {
                collectionsMap.set(collection.id, collection);
              }
            }
            await delay(40);
          } catch (error) {
            // Skip individual errors
          }
        }
        await delay(100);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn('Error discovering from popular actors:', error);
  }
};

// Discover from popular directors
const discoverFromPopularDirectors = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxDirectors: number
): Promise<void> => {
  // Use known successful directors
  const famousDirectors = [
    1896, // Christopher Nolan
    138, // Quentin Tarantino
    1032, // Martin Scorsese
    1327, // Steven Spielberg
    525, // James Cameron
    4027, // Frank Darabont
    2710, // David Fincher  
    10987, // J.J. Abrams
    7879, // Ridley Scott
    488, // Steven Soderbergh
    4945, // Joe Russo
    1224, // George Lucas
  ];

  const selectedDirectors = famousDirectors.slice(0, maxDirectors);

  for (const directorId of selectedDirectors) {
    try {
      const creditsResponse = await tmdbApi.get(`/person/${directorId}/movie_credits`);
      const movies = creditsResponse.data.crew?.filter((credit: any) => credit.job === 'Director').slice(0, 4) || [];

      for (const movie of movies) {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
            const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
            if (collection && collection.film_count >= 2) {
              collectionsMap.set(collection.id, collection);
            }
          }
          await delay(40);
        } catch (error) {
          // Skip individual errors
        }
      }
      await delay(100);
    } catch (error) {
      // Skip individual errors
    }
  }
};

// Discover from production companies
const discoverFromProductionCompanies = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxCompanies: number
): Promise<void> => {
  // Major studios known for franchises
  const majorStudios = [
    420, // Marvel Studios
    3, // Pixar
    2, // Walt Disney Pictures
    174, // Warner Bros.
    33, // Universal Pictures
    1632, // Lionsgate
    25, // 20th Century Fox
    4, // Paramount Pictures
    5, // Columbia Pictures
    7, // DreamWorks
    1429, // Plan B Entertainment
    436, // Sony Pictures
  ];

  const selectedStudios = majorStudios.slice(0, maxCompanies);

  for (const companyId of selectedStudios) {
    try {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          with_companies: companyId,
          sort_by: 'popularity.desc',
          page: 1
        }
      });

      const movies = response.data.results?.slice(0, 3) || [];

      for (const movie of movies) {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
            const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
            if (collection && collection.film_count >= 2) {
              collectionsMap.set(collection.id, collection);
            }
          }
          await delay(40);
        } catch (error) {
          // Skip individual errors
        }
      }
      await delay(80);
    } catch (error) {
      // Skip individual errors
    }
  }
};

// Random deep discovery using various keywords and filters
const discoverFromRandomDeepSearch = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const discoveryMethods = [
    // High budget movies (more likely to be franchises)
    async () => {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          sort_by: 'revenue.desc',
          'primary_release_date.gte': '1980-01-01',
          page: Math.floor(Math.random() * 10) + 1
        }
      });
      return response.data.results?.slice(0, maxMovies) || [];
    },

    // Movies with high vote counts (popular franchises)
    async () => {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          sort_by: 'vote_count.desc',
          'primary_release_date.gte': '1970-01-01',
          page: Math.floor(Math.random() * 20) + 1
        }
      });
      return response.data.results?.slice(0, maxMovies) || [];
    },

    // Movies with specific keywords that often indicate collections
    async () => {
      const keywords = [51540, 158431, 162846, 180547, 209714]; // sequel, prequel, franchise, etc.
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          with_keywords: randomKeyword,
          sort_by: 'popularity.desc',
          page: Math.floor(Math.random() * 5) + 1
        }
      });
      return response.data.results?.slice(0, maxMovies) || [];
    }
  ];

  // Try a random discovery method
  const method = discoveryMethods[Math.floor(Math.random() * discoveryMethods.length)];

  try {
    const movies = await method();

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetails(movie.id);
        if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
          const collection = await getCollectionDetails(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= 2) {
            collectionsMap.set(collection.id, collection);
          }
        }
        await delay(50);
      } catch (error) {
        // Skip individual errors
      }
    }
  } catch (error) {
    console.warn('Error in random deep discovery:', error);
  }
};

// Get cached collections for quick access
export const getCachedCollections = (): CollectionDetails[] => {
  return paginationCache.collections;
};

// Updated function using dynamic discovery
export const getPopularCollections = async (): Promise<CollectionDetails[]> => {
  return await discoverAllCollections(50); // Get top 50 collections
};

// Get collections by category with better filtering
export const getCollectionsByCategory = async (category: string): Promise<CollectionDetails[]> => {
  const allCollections = await discoverAllCollections();

  switch (category) {
    case 'popular':
      return allCollections
        .filter(c => ['Marvel', 'Star Wars', 'Harry Potter', 'Fast', 'Bond', 'Batman', 'Spider'].some(keyword =>
          c.name.toLowerCase().includes(keyword.toLowerCase())
        ))
        .slice(0, 10);

    case 'complete':
      return allCollections
        .filter(c => c.status === 'complete')
        .slice(0, 10);

    case 'trilogies':
      return allCollections
        .filter(c => c.type === 'trilogy')
        .slice(0, 10);

    case 'extended':
      return allCollections
        .filter(c => c.type === 'extended_series' && c.film_count >= 5)
        .slice(0, 10);

    case 'superhero':
      return allCollections
        .filter(c => ['Marvel', 'Batman', 'Superman', 'Spider', 'X-Men', 'Wonder Woman', 'Avengers'].some(keyword =>
          c.name.toLowerCase().includes(keyword.toLowerCase())
        ))
        .slice(0, 10);

    case 'action':
      return allCollections
        .filter(c => c.genre_categories.includes('Action'))
        .slice(0, 10);

    default:
      return allCollections.slice(0, 10);
  }
};

// Updated trending collections using dynamic discovery
export const getTrendingCollections = async (): Promise<CollectionDetails[]> => {
  const allCollections = await discoverAllCollections();

  // Return collections that have recent releases or are currently popular
  const currentYear = new Date().getFullYear();
  return allCollections
    .filter(collection => {
      const latestYear = Math.max(...collection.parts.map(film =>
        new Date(film.release_date || '').getFullYear()
      ));
      return latestYear >= currentYear - 2; // Released within last 2 years
    })
    .slice(0, 20);
};

// Comprehensive search function - searches collections, movies within collections, cast, crew, and keywords
export const searchCollectionsAdvanced = async (
  query: string,
  options: {
    minFilms?: number;
    maxFilms?: number;
    genres?: string[];
    status?: string[];
    type?: string[];
  } = {}
): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    const allCollections = await discoverAllCollections();
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    let results = allCollections.filter(collection => {
      const searchableText = [
        collection.name,
        collection.overview,
        ...collection.genre_categories,
        collection.type,
        collection.status
      ].join(' ').toLowerCase();

      // Search in collection metadata
      const matchesCollection = searchTerms.some(term => searchableText.includes(term));

      // Search within individual movies in the collection
      const matchesMovies = collection.parts.some(movie => {
        const movieText = [
          movie.title,
          movie.overview || ''
        ].join(' ').toLowerCase();

        return searchTerms.some(term => movieText.includes(term));
      });

      // Search keywords and tags
      const matchesKeywords = searchTerms.some(term => {
        // Common franchise keywords
        const franchiseKeywords = [
          'superhero', 'action', 'adventure', 'comedy', 'horror', 'thriller',
          'animation', 'family', 'fantasy', 'sci-fi', 'crime', 'drama',
          'marvel', 'dc', 'disney', 'pixar', 'sequel', 'prequel', 'trilogy',
          'universe', 'saga', 'series', 'franchise', 'collection'
        ];

        return franchiseKeywords.some(keyword =>
          keyword.includes(term) || term.includes(keyword)
        );
      });

      // Character name matching (common character names)
      const matchesCharacters = searchTerms.some(term => {
        const characterNames = [
          'batman', 'superman', 'spider-man', 'iron man', 'captain america',
          'thor', 'hulk', 'wolverine', 'deadpool', 'wonder woman',
          'bond', 'bourne', 'potter', 'gandalf', 'frodo', 'vader', 'luke',
          'indiana jones', 'terminator', 'alien', 'predator', 'godzilla'
        ];

        return characterNames.some(char =>
          char.includes(term) || term.includes(char) ||
          collection.name.toLowerCase().includes(char)
        );
      });

      return matchesCollection || matchesMovies || matchesKeywords || matchesCharacters;
    });

    // Apply additional filters
    if (options.minFilms !== undefined) {
      results = results.filter(c => c.film_count >= options.minFilms!);
    }

    if (options.maxFilms !== undefined) {
      results = results.filter(c => c.film_count <= options.maxFilms!);
    }

    if (options.genres && options.genres.length > 0) {
      results = results.filter(c =>
        options.genres!.some(genre => c.genre_categories.includes(genre))
      );
    }

    if (options.status && options.status.length > 0) {
      results = results.filter(c => options.status!.includes(c.status));
    }

    if (options.type && options.type.length > 0) {
      results = results.filter(c => options.type!.includes(c.type));
    }

    // Score and sort results by relevance
    const scoredResults = results.map(collection => {
      let score = 0;
      const lowerQuery = query.toLowerCase();
      const lowerName = collection.name.toLowerCase();

      // Exact name match gets highest score
      if (lowerName === lowerQuery) score += 100;
      // Name starts with query gets high score  
      else if (lowerName.startsWith(lowerQuery)) score += 50;
      // Name contains query gets medium score
      else if (lowerName.includes(lowerQuery)) score += 25;

      // Boost popular collections (more films = more popular)
      score += Math.min(collection.film_count * 2, 20);

      // Boost collections with exact genre match
      if (collection.genre_categories.some(genre =>
        genre.toLowerCase().includes(lowerQuery)
      )) {
        score += 15;
      }

      return { collection, score };
    });

    // Sort by score (highest first) and return collections
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .map(item => item.collection);

  } catch (error) {
    console.error('Error in comprehensive search:', error);
    return [];
  }
};

// Direct TMDB search for collections (fallback when local search fails)
export const searchCollectionsDirect = async (query: string): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    console.log(`🔍 Direct TMDB search for: "${query}"`);

    // Search TMDB directly for collections
    const searchResponse = await searchCollections(query);

    if (!searchResponse?.results || searchResponse.results.length === 0) {
      return [];
    }

    // Get detailed collection info for the results
    const detailedCollections: CollectionDetails[] = [];

    for (const collection of searchResponse.results.slice(0, 10)) { // Limit to top 10
      try {
        const detailed = await getCollectionDetails(collection.id);
        if (detailed && detailed.film_count >= 2) {
          detailedCollections.push(detailed);
        }
        await delay(RATE_LIMIT_DELAY);
      } catch (error) {
        console.warn(`Failed to get details for collection ${collection.id}:`, error);
      }
    }

    console.log(`✅ Direct search found ${detailedCollections.length} collections`);
    return detailedCollections;

  } catch (error) {
    console.error('Error in direct TMDB search:', error);
    return [];
  }
};

// Hybrid search - combines local and direct TMDB search
export const searchCollectionsHybrid = async (query: string): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    // First try local advanced search
    const localResults = await searchCollectionsAdvanced(query);

    // If we have good results, return them
    if (localResults.length >= 5) {
      console.log(`📦 Using ${localResults.length} local search results`);
      return localResults;
    }

    // If local results are limited, also try direct TMDB search
    console.log(`📡 Enhancing with direct TMDB search...`);
    const directResults = await searchCollectionsDirect(query);

    // Combine and deduplicate results
    const combinedMap = new Map<number, CollectionDetails>();

    // Add local results first (they have better scoring)
    localResults.forEach(collection => {
      combinedMap.set(collection.id, collection);
    });

    // Add direct results if they're not already included
    directResults.forEach(collection => {
      if (!combinedMap.has(collection.id)) {
        combinedMap.set(collection.id, collection);
      }
    });

    const finalResults = Array.from(combinedMap.values());
    console.log(`🎯 Hybrid search returned ${finalResults.length} total results`);

    return finalResults;

  } catch (error) {
    console.error('Error in hybrid search:', error);
    return [];
  }
};

// Get collection statistics
export const getCollectionStats = async (): Promise<{
  totalCollections: number;
  totalFilms: number;
  averageFilmsPerCollection: number;
  topGenres: string[];
  completionStats: { [key: string]: number };
}> => {
  const collections = await discoverAllCollections();

  const totalFilms = collections.reduce((sum, c) => sum + c.film_count, 0);
  const genreCount = new Map<string, number>();
  const statusCount = new Map<string, number>();

  collections.forEach(collection => {
    collection.genre_categories.forEach(genre => {
      genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    });
    statusCount.set(collection.status, (statusCount.get(collection.status) || 0) + 1);
  });

  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre]) => genre);

  const completionStats = Object.fromEntries(statusCount);

  return {
    totalCollections: collections.length,
    totalFilms,
    averageFilmsPerCollection: Math.round(totalFilms / collections.length),
    topGenres,
    completionStats
  };
};

// Helper functions
const classifyCollectionType = (filmCount: number): CollectionType => {
  if (filmCount === 3) return 'trilogy';
  if (filmCount === 4) return 'quadrilogy';
  if (filmCount === 5) return 'pentology';
  if (filmCount === 6) return 'hexalogy';
  if (filmCount === 7) return 'septology';
  if (filmCount === 8) return 'octology';
  if (filmCount === 9) return 'nonology';
  if (filmCount > 9) return 'extended_series';
  return 'incomplete_series';
};

const determineCollectionStatus = (films: Movie[]): CollectionStatus => {
  if (films.length < 3) return 'incomplete';

  const currentYear = new Date().getFullYear();
  const latestYear = Math.max(...films.map(f => new Date(f.release_date || '').getFullYear()));

  // If latest film is within 3 years, consider ongoing
  if (currentYear - latestYear <= 3) return 'ongoing';
  return 'complete';
};

const extractGenreCategories = (films: Movie[]): string[] => {
  const genreMap: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
  };

  const genreSet = new Set<string>();
  films.forEach(film => {
    film.genre_ids?.forEach(genreId => {
      if (genreMap[genreId]) {
        genreSet.add(genreMap[genreId]);
      }
    });
  });

  return Array.from(genreSet);
};

const extractStudio = (films: Movie[]): string => {
  // Simple heuristic based on common patterns
  const firstFilm = films[0];
  if (!firstFilm) return 'Unknown';

  // You could enhance this by fetching production companies from movie details
  return 'Various Studios';
};

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