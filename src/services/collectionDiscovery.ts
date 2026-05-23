/**
 * Collection Discovery System
 *
 * Extracted from tmdb.ts to reduce that file from ~2,360 lines to ~1,000.
 * Contains all collection discovery, pagination, search, and helper logic.
 * Pure classification/extraction functions live in collectionHelpers.ts.
 */

import type { Movie, CollectionDetails, ApiResponse, Collection } from '../types';
import { classifyCollectionType, determineCollectionStatus, extractGenreCategories, extractStudio } from './collectionHelpers';

// ─── Internal Types ───────────────────────────────────────────────────────────

interface CollectionDiscoveryCache {
  collections: CollectionDetails[];
  lastFetched: number;
  discoveryProgress: {
    moviesScanned: number;
    collectionsFound: number;
    currentStep: string;
  };
}

interface PaginationCache {
  collections: CollectionDetails[];
  currentPage: number;
  totalPages: number;
  lastFetched: number;
  genreIndex: number;
  moviePageIndex: number;
  searchTermIndex: number;
}

// ─── TMDB API Reference ──────────────────────────────────────────────────────
// These functions are injected to avoid circular imports with tmdb.ts.
// They are set once during initialization.

let tmdbApiGet: (url: string, config?: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
let getMovieDetailsRef: (id: number) => Promise<Movie>;
let getCollectionDetailsRef: (id: number) => Promise<CollectionDetails | null>;
let searchCollectionsRef: (query: string, page?: number) => Promise<ApiResponse<Collection> | null>;

export interface CollectionDiscoveryDeps {
  tmdbApiGet: typeof tmdbApiGet;
  getMovieDetails: typeof getMovieDetailsRef;
  getCollectionDetails: typeof getCollectionDetailsRef;
  searchCollections: typeof searchCollectionsRef;
}

export function initCollectionDiscovery(deps: CollectionDiscoveryDeps): void {
  tmdbApiGet = deps.tmdbApiGet;
  getMovieDetailsRef = deps.getMovieDetails;
  getCollectionDetailsRef = deps.getCollectionDetails;
  searchCollectionsRef = deps.searchCollections;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const RATE_LIMIT_DELAY = 100;
const MIN_FILM_COUNT = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isCacheValid = (timestamp: number): boolean => Date.now() - timestamp < CACHE_DURATION;

// ─── Cache State ──────────────────────────────────────────────────────────────

let discoveryCache: CollectionDiscoveryCache = {
  collections: [],
  lastFetched: 0,
  discoveryProgress: { moviesScanned: 0, collectionsFound: 0, currentStep: 'Not started' }
};

const paginationCache: PaginationCache = {
  collections: [],
  currentPage: 0,
  totalPages: 9999,
  lastFetched: 0,
  genreIndex: 0,
  moviePageIndex: 1,
  searchTermIndex: 0
};

// ─── Cache Management ─────────────────────────────────────────────────────────

export const clearCollectionsCache = (): void => {
  discoveryCache = {
    collections: [],
    lastFetched: 0,
    discoveryProgress: { moviesScanned: 0, collectionsFound: 0, currentStep: 'Cache cleared' }
  };
};

export const clearPaginationCache = (): void => {
  paginationCache.collections = [];
  paginationCache.currentPage = 0;
  paginationCache.lastFetched = 0;
  paginationCache.genreIndex = 0;
  paginationCache.moviePageIndex = 1;
  paginationCache.searchTermIndex = 0;
};

export const getDiscoveryProgress = () => discoveryCache.discoveryProgress;

export const getCachedCollections = (): CollectionDetails[] => paginationCache.collections;

// ─── Core Helper: Process Movies into Collections ─────────────────────────────

/**
 * Given a list of movies, fetches details and extracts any collections
 * they belong to. This is the shared inner loop that all discovery methods use.
 */
const processMoviesForCollections = async (
  movies: Array<{ id: number }>,
  collectionsMap: Map<number, CollectionDetails>,
  interDelay: number = 50
): Promise<void> => {
  for (const movie of movies) {
    try {
      const movieDetails = await getMovieDetailsRef(movie.id);
      if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
        const collection = await getCollectionDetailsRef(movieDetails.belongs_to_collection.id);
        if (collection && collection.film_count >= MIN_FILM_COUNT) {
          collectionsMap.set(collection.id, collection);
        }
      }
      await delay(interDelay);
    } catch {
      // Skip individual movie errors
    }
  }
};

// ─── Collection Details ───────────────────────────────────────────────────────

export const getCollectionDetails = async (collectionId: number): Promise<CollectionDetails | null> => {
  try {
    const response = await tmdbApiGet(`/collection/${collectionId}`);
    const collection = response.data as unknown as CollectionDetails;

    const filmsWithDetails = await Promise.all(
      (collection.parts || []).map(async (movie: Movie) => {
        try {
          const movieDetails = await getMovieDetailsRef(movie.id);
          return movieDetails || movie;
        } catch {
          return movie;
        }
      })
    );

    const totalRuntime = filmsWithDetails.reduce((total, movie) => total + (movie.runtime || 0), 0);
    const sortedFilms = filmsWithDetails.sort((a, b) =>
      new Date(a.release_date || '').getTime() - new Date(b.release_date || '').getTime()
    );

    return {
      ...collection,
      parts: sortedFilms,
      film_count: collection.parts?.length || 0,
      total_runtime: totalRuntime,
      first_release_date: sortedFilms[0]?.release_date || '',
      latest_release_date: sortedFilms[sortedFilms.length - 1]?.release_date || '',
      type: classifyCollectionType(collection.parts?.length || 0),
      status: determineCollectionStatus(sortedFilms),
      genre_categories: extractGenreCategories(sortedFilms),
      studio: extractStudio(sortedFilms)
    };
  } catch {
    return null;
  }
};

export const searchCollections = async (query: string, page: number = 1): Promise<ApiResponse<Collection> | null> => {
  try {
    const response = await tmdbApiGet('/search/collection', { params: { query, page } });
    return response.data as unknown as ApiResponse<Collection>;
  } catch {
    return null;
  }
};

// ─── Discovery Methods (each just fetches movies differently) ─────────────────

const discoverFromPopularMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  page: number,
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApiGet('/movie/popular', { params: { page } });
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const GENRES = [
  { id: 28, name: 'Action' }, { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' }, { id: 14, name: 'Fantasy' }, { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' }, { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' }, { id: 53, name: 'Thriller' }, { id: 37, name: 'Western' }
];

const discoverFromGenres = async (
  collectionsMap: Map<number, CollectionDetails>,
  genreIndex: number,
  maxMovies: number
): Promise<void> => {
  const genre = GENRES[genreIndex % GENRES.length];
  try {
    const response = await tmdbApiGet('/discover/movie', {
      params: { with_genres: genre.id, sort_by: 'popularity.desc', page: Math.floor(genreIndex / GENRES.length) + 1 }
    });
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const discoverFromYears = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const randomYear = new Date().getFullYear() - Math.floor(Math.random() * 30);
  try {
    const response = await tmdbApiGet('/discover/movie', {
      params: { primary_release_year: randomYear, sort_by: 'popularity.desc', page: 1 }
    });
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const SEARCH_TERMS = [
  'collection', 'saga', 'trilogy', 'series', 'franchise', 'universe',
  'chronicles', 'adventures', 'legend', 'story', 'tales', 'journey',
  'war', 'battle', 'hero', 'super', 'magic', 'dragon', 'space',
  'world', 'kingdom', 'empire', 'destiny', 'revenge', 'return'
];

const discoverFromSearchTerms = async (
  collectionsMap: Map<number, CollectionDetails>,
  termIndex: number,
  maxResults: number
): Promise<void> => {
  const term = SEARCH_TERMS[termIndex % SEARCH_TERMS.length];
  try {
    const searchResponse = await searchCollectionsRef(term);
    if (searchResponse?.results) {
      for (const collection of searchResponse.results.slice(0, maxResults)) {
        if (!collectionsMap.has(collection.id)) {
          const detailed = await getCollectionDetailsRef(collection.id);
          if (detailed && detailed.film_count >= MIN_FILM_COUNT) {
            collectionsMap.set(collection.id, detailed);
          }
        }
        await delay(50);
      }
    }
  } catch {
    // Skip
  }
};

const discoverFromCurrentMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const endpoints = ['/movie/now_playing', '/movie/upcoming'];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  try {
    const response = await tmdbApiGet(endpoint);
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const discoverFromTopRatedMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  page: number,
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApiGet('/movie/top_rated', { params: { page } });
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const discoverFromTrendingMovies = async (
  collectionsMap: Map<number, CollectionDetails>,
  timeWindow: 'day' | 'week',
  maxMovies: number
): Promise<void> => {
  try {
    const response = await tmdbApiGet(`/trending/movie/${timeWindow}`);
    const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

const discoverFromPopularActors = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxActors: number
): Promise<void> => {
  try {
    const response = await tmdbApiGet('/person/popular');
    const actors = ((response.data as { results?: Array<{ id: number }> }).results || []).slice(0, maxActors);

    for (const actor of actors) {
      try {
        const creditsResponse = await tmdbApiGet(`/person/${actor.id}/movie_credits`);
        const movies = ((creditsResponse.data as { cast?: Movie[] }).cast || []).slice(0, 5);
        await processMoviesForCollections(movies, collectionsMap, 40);
        await delay(100);
      } catch {
        // Skip
      }
    }
  } catch {
    // Skip
  }
};

const FAMOUS_DIRECTORS = [1896, 138, 1032, 1327, 525, 4027, 2710, 10987, 7879, 488, 4945, 1224];

const discoverFromPopularDirectors = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxDirectors: number
): Promise<void> => {
  for (const directorId of FAMOUS_DIRECTORS.slice(0, maxDirectors)) {
    try {
      const creditsResponse = await tmdbApiGet(`/person/${directorId}/movie_credits`);
      const movies = ((creditsResponse.data as { crew?: Array<{ id: number; job: string }> }).crew || [])
        .filter(credit => credit.job === 'Director')
        .slice(0, 4);
      await processMoviesForCollections(movies, collectionsMap, 40);
      await delay(100);
    } catch {
      // Skip
    }
  }
};

const MAJOR_STUDIOS = [420, 3, 2, 174, 33, 1632, 25, 4, 5, 7, 1429, 436];

const discoverFromProductionCompanies = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxCompanies: number
): Promise<void> => {
  for (const companyId of MAJOR_STUDIOS.slice(0, maxCompanies)) {
    try {
      const response = await tmdbApiGet('/discover/movie', {
        params: { with_companies: companyId, sort_by: 'popularity.desc', page: 1 }
      });
      const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, 3);
      await processMoviesForCollections(movies, collectionsMap, 40);
      await delay(80);
    } catch {
      // Skip
    }
  }
};

const discoverFromRandomDeepSearch = async (
  collectionsMap: Map<number, CollectionDetails>,
  maxMovies: number
): Promise<void> => {
  const discoveryMethods = [
    async () => {
      const response = await tmdbApiGet('/discover/movie', {
        params: { sort_by: 'revenue.desc', 'primary_release_date.gte': '1980-01-01', page: Math.floor(Math.random() * 10) + 1 }
      });
      return ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    },
    async () => {
      const response = await tmdbApiGet('/discover/movie', {
        params: { sort_by: 'vote_count.desc', 'primary_release_date.gte': '1970-01-01', page: Math.floor(Math.random() * 20) + 1 }
      });
      return ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    },
    async () => {
      const keywords = [51540, 158431, 162846, 180547, 209714];
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      const response = await tmdbApiGet('/discover/movie', {
        params: { with_keywords: randomKeyword, sort_by: 'popularity.desc', page: Math.floor(Math.random() * 5) + 1 }
      });
      return ((response.data as { results?: Movie[] }).results || []).slice(0, maxMovies);
    }
  ];

  try {
    const method = discoveryMethods[Math.floor(Math.random() * discoveryMethods.length)];
    const movies = await method();
    await processMoviesForCollections(movies, collectionsMap);
  } catch {
    // Skip
  }
};

// ─── Orchestrators ────────────────────────────────────────────────────────────

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
      const response = await tmdbApiGet(endpoint, { params: { page: 1 } });
      const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, 10);

      for (const movie of movies) {
        try {
          const movieDetails = await getMovieDetailsRef(movie.id);
          totalScanned++;
          if (movieDetails?.belongs_to_collection && !collectionsMap.has(movieDetails.belongs_to_collection.id)) {
            const collection = await getCollectionDetailsRef(movieDetails.belongs_to_collection.id);
            if (collection && collection.film_count >= MIN_FILM_COUNT) {
              collectionsMap.set(collection.id, collection);
            }
          }
        } catch {
          // Skip
        }
      }
      updateScanned(totalScanned);
    } catch {
      // Skip endpoint
    }
  }
};

const targetedFranchiseSearch = async (
  collectionsMap: Map<number, CollectionDetails>,
  updateProgress: (step: string) => void
): Promise<void> => {
  const franchiseTerms = ['Marvel', 'Star Wars', 'Harry Potter', 'Fast', 'Bond', 'Batman', 'Spider-Man', 'Avengers', 'X-Men', 'Transformers'];

  for (const term of franchiseTerms) {
    updateProgress(`Searching for ${term}...`);
    try {
      const searchResponse = await searchCollectionsRef(term);
      if (searchResponse?.results) {
        for (const collection of searchResponse.results.slice(0, 3)) {
          if (!collectionsMap.has(collection.id)) {
            const detailed = await getCollectionDetailsRef(collection.id);
            if (detailed && detailed.film_count >= MIN_FILM_COUNT) {
              collectionsMap.set(collection.id, detailed);
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }
};

const quickGenreSampling = async (
  collectionsMap: Map<number, CollectionDetails>,
  updateProgress: (step: string) => void
): Promise<void> => {
  const topGenres = [28, 35, 18, 878, 27]; // Action, Comedy, Drama, Sci-Fi, Horror

  for (const genreId of topGenres) {
    const genreName = GENRES.find(g => g.id === genreId)?.name || 'Unknown';
    updateProgress(`Sampling ${genreName}...`);
    try {
      const response = await tmdbApiGet('/discover/movie', {
        params: { with_genres: genreId, sort_by: 'popularity.desc', page: 1 }
      });
      const movies = ((response.data as { results?: Movie[] }).results || []).slice(0, 5);
      await processMoviesForCollections(movies, collectionsMap);
    } catch {
      // Skip
    }
  }
};

const basicCollectionDiscovery = async (
  maxCollections: number,
  progressCallback?: (progress: { scanned: number; found: number; step: string }) => void
): Promise<CollectionDetails[]> => {
  const collections: CollectionDetails[] = [];
  let scanned = 0;

  try {
    const response = await tmdbApiGet('/movie/popular', { params: { page: 1 } });
    const movies = (response.data as { results?: Movie[] }).results || [];

    for (const movie of movies) {
      try {
        const movieDetails = await getMovieDetailsRef(movie.id);
        scanned++;

        if (movieDetails?.belongs_to_collection) {
          const collection = await getCollectionDetailsRef(movieDetails.belongs_to_collection.id);
          if (collection && collection.film_count >= MIN_FILM_COUNT) {
            const exists = collections.find(c => c.id === collection.id);
            if (!exists) {
              collections.push(collection);
            }
          }
        }

        if (progressCallback) {
          progressCallback({ scanned, found: collections.length, step: `Found ${collections.length} collections...` });
        }

        await delay(50);
        if (collections.length >= maxCollections) break;
      } catch {
        // Skip
      }
    }

    return collections.sort((a, b) => b.film_count - a.film_count);
  } catch {
    return [];
  }
};

// ─── Main Discovery Entry Point ───────────────────────────────────────────────

export const discoverAllCollections = async (
  maxCollections: number = 200,
  forceRefresh: boolean = false,
  progressCallback?: (progress: { scanned: number; found: number; step: string }) => void
): Promise<CollectionDetails[]> => {
  if (!forceRefresh && isCacheValid(discoveryCache.lastFetched) && discoveryCache.collections.length > 0) {
    if (progressCallback) {
      progressCallback({
        scanned: discoveryCache.collections.length,
        found: discoveryCache.collections.length,
        step: `Loaded ${discoveryCache.collections.length} cached collections`
      });
    }
    return discoveryCache.collections.slice(0, maxCollections);
  }

  if (forceRefresh) {
    clearCollectionsCache();
  }

  try {
    const discoveredCollections = new Map<number, CollectionDetails>();
    let totalMoviesScanned = 0;

    const updateProgress = (step: string) => {
      discoveryCache.discoveryProgress = {
        moviesScanned: totalMoviesScanned,
        collectionsFound: discoveredCollections.size,
        currentStep: step
      };
      if (progressCallback) {
        progressCallback({ scanned: totalMoviesScanned, found: discoveredCollections.size, step });
      }
    };

    const discoveryTimeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Discovery timeout - using fallback')), 45000);
    });

    const discoveryProcess = async () => {
      updateProgress('Quick scan of popular movies...');
      await efficientMovieScan(discoveredCollections, updateProgress, (scanned) => { totalMoviesScanned = scanned; });

      updateProgress('Finding major franchises...');
      await targetedFranchiseSearch(discoveredCollections, updateProgress);

      updateProgress('Sampling top genres...');
      await quickGenreSampling(discoveredCollections, updateProgress);
    };

    await Promise.race([discoveryProcess(), discoveryTimeout]);

    const allCollections = Array.from(discoveredCollections.values())
      .filter(collection => collection && collection.film_count >= MIN_FILM_COUNT)
      .sort((a, b) => b.film_count - a.film_count);

    discoveryCache.collections = allCollections;
    discoveryCache.lastFetched = Date.now();

    updateProgress(`Discovery complete! Found ${allCollections.length} collections`);

    return allCollections.slice(0, maxCollections);
  } catch (error: unknown) {
    if (progressCallback) {
      const isTimeout = error instanceof Error && error.message?.includes('timeout');
      progressCallback({
        scanned: 0,
        found: 0,
        step: isTimeout ? 'Switching to backup discovery method...' : 'Discovery failed, trying backup...'
      });
    }
    return await basicCollectionDiscovery(maxCollections, progressCallback);
  }
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const getNextCollectionsBatch = async (
  batchSize: number = 20
): Promise<{ collections: CollectionDetails[]; hasMore: boolean }> => {
  try {
    const newCollections = new Map<number, CollectionDetails>();
    let attempts = 0;
    const maxAttempts = 12;

    while (newCollections.size < batchSize && attempts < maxAttempts) {
      attempts++;

      const strategies: Array<() => Promise<void>> = [
        async () => { await discoverFromPopularMovies(newCollections, paginationCache.moviePageIndex, 8); paginationCache.moviePageIndex++; },
        async () => { await discoverFromGenres(newCollections, paginationCache.genreIndex, 5); paginationCache.genreIndex++; },
        async () => { await discoverFromYears(newCollections, 5); },
        async () => { await discoverFromSearchTerms(newCollections, paginationCache.searchTermIndex, 5); paginationCache.searchTermIndex++; },
        async () => { await discoverFromCurrentMovies(newCollections, 5); },
        async () => { await discoverFromTopRatedMovies(newCollections, 1, 5); },
        async () => { await discoverFromTrendingMovies(newCollections, 'week', 5); },
        async () => { await discoverFromPopularActors(newCollections, 3); },
        async () => { await discoverFromPopularDirectors(newCollections, 3); },
        async () => { await discoverFromProductionCompanies(newCollections, 3); },
        async () => { await discoverFromRandomDeepSearch(newCollections, 5); },
      ];
      const strategyIndex = attempts - 1;
      if (strategyIndex < strategies.length) {
        await strategies[strategyIndex]();
      }

      if (newCollections.size === 0 && attempts >= 3) break;
    }

    const newCollectionsArray = Array.from(newCollections.values());
    paginationCache.collections.push(...newCollectionsArray);
    paginationCache.currentPage++;

    return { collections: newCollectionsArray, hasMore: attempts < maxAttempts };
  } catch {
    return { collections: [], hasMore: true };
  }
};

// ─── Search & Query ───────────────────────────────────────────────────────────

export const getPopularCollections = async (): Promise<CollectionDetails[]> => {
  return await discoverAllCollections(50);
};

export const getCollectionsByCategory = async (category: string): Promise<CollectionDetails[]> => {
  const allCollections = await discoverAllCollections();

  const filterByKeyword = (keywords: string[]) =>
    allCollections.filter(c => keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))).slice(0, 10);

  switch (category) {
    case 'popular':
      return filterByKeyword(['Marvel', 'Star Wars', 'Harry Potter', 'Fast', 'Bond', 'Batman', 'Spider']);
    case 'complete':
      return allCollections.filter(c => c.status === 'complete').slice(0, 10);
    case 'trilogies':
      return allCollections.filter(c => c.type === 'trilogy').slice(0, 10);
    case 'extended':
      return allCollections.filter(c => c.type === 'extended_series' && c.film_count >= 5).slice(0, 10);
    case 'superhero':
      return filterByKeyword(['Marvel', 'Batman', 'Superman', 'Spider', 'X-Men', 'Wonder Woman', 'Avengers']);
    case 'action':
      return allCollections.filter(c => c.genre_categories.includes('Action')).slice(0, 10);
    default:
      return allCollections.slice(0, 10);
  }
};

export const getTrendingCollections = async (): Promise<CollectionDetails[]> => {
  const allCollections = await discoverAllCollections();
  const currentYear = new Date().getFullYear();

  return allCollections
    .filter(collection => {
      const latestYear = Math.max(...collection.parts.map(film => new Date(film.release_date || '').getFullYear()));
      return latestYear >= currentYear - 2;
    })
    .slice(0, 20);
};

export const searchCollectionsAdvanced = async (
  query: string,
  options: { minFilms?: number; maxFilms?: number; genres?: string[]; status?: string[]; type?: string[] } = {}
): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    const allCollections = await discoverAllCollections();
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    let results = allCollections.filter(collection => {
      const searchableText = [collection.name, collection.overview, ...collection.genre_categories, collection.type, collection.status].join(' ').toLowerCase();
      const matchesCollection = searchTerms.some(term => searchableText.includes(term));
      const matchesMovies = collection.parts.some(movie => searchTerms.some(term => (movie.title || '').toLowerCase().includes(term)));
      return matchesCollection || matchesMovies;
    });

    if (options.minFilms !== undefined) results = results.filter(c => c.film_count >= options.minFilms!);
    if (options.maxFilms !== undefined) results = results.filter(c => c.film_count <= options.maxFilms!);
    if (options.genres?.length) results = results.filter(c => options.genres!.some(g => c.genre_categories.includes(g)));
    if (options.status?.length) results = results.filter(c => options.status!.includes(c.status));
    if (options.type?.length) results = results.filter(c => options.type!.includes(c.type));

    const lowerQuery = query.toLowerCase();
    return results
      .map(collection => {
        let score = 0;
        const lowerName = collection.name.toLowerCase();
        if (lowerName === lowerQuery) score += 100;
        else if (lowerName.startsWith(lowerQuery)) score += 50;
        else if (lowerName.includes(lowerQuery)) score += 25;
        score += Math.min(collection.film_count * 2, 20);
        return { collection, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.collection);
  } catch {
    return [];
  }
};

export const searchCollectionsDirect = async (query: string): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    const searchResponse = await searchCollectionsRef(query);
    if (!searchResponse?.results) return [];

    const detailedCollections: CollectionDetails[] = [];
    for (const collection of searchResponse.results.slice(0, 10)) {
      try {
        const detailed = await getCollectionDetailsRef(collection.id);
        if (detailed && detailed.film_count >= MIN_FILM_COUNT) {
          detailedCollections.push(detailed);
        }
        await delay(RATE_LIMIT_DELAY);
      } catch {
        // Skip
      }
    }
    return detailedCollections;
  } catch {
    return [];
  }
};

export const searchCollectionsHybrid = async (query: string): Promise<CollectionDetails[]> => {
  if (!query.trim()) return [];

  try {
    const localResults = await searchCollectionsAdvanced(query);
    if (localResults.length >= 5) return localResults;

    const directResults = await searchCollectionsDirect(query);
    const combinedMap = new Map<number, CollectionDetails>();
    localResults.forEach(c => combinedMap.set(c.id, c));
    directResults.forEach(c => { if (!combinedMap.has(c.id)) combinedMap.set(c.id, c); });

    return Array.from(combinedMap.values());
  } catch {
    return [];
  }
};

export const getCollectionStats = async (): Promise<{
  totalCollections: number;
  totalFilms: number;
  averageFilmsPerCollection: number;
  topGenres: string[];
  completionStats: Record<string, number>;
}> => {
  const collections = await discoverAllCollections();
  const totalFilms = collections.reduce((sum, c) => sum + c.film_count, 0);
  const genreCount = new Map<string, number>();
  const statusCount = new Map<string, number>();

  collections.forEach(collection => {
    collection.genre_categories.forEach(genre => genreCount.set(genre, (genreCount.get(genre) || 0) + 1));
    statusCount.set(collection.status, (statusCount.get(collection.status) || 0) + 1);
  });

  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre]) => genre);

  return {
    totalCollections: collections.length,
    totalFilms,
    averageFilmsPerCollection: Math.round(totalFilms / collections.length),
    topGenres,
    completionStats: Object.fromEntries(statusCount)
  };
};

// ─── Re-export helpers for backward compatibility ─────────────────────────────
export { classifyCollectionType, determineCollectionStatus, extractGenreCategories, extractStudio } from './collectionHelpers';
