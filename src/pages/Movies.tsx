import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie } from '../types';
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getMovieGenres,
  discoverMoviesByGenre,
  getMovieVideos
} from '../services/tmdb';
import HeroCarousel from '../components/HeroCarousel';
import ContentCarousel from '../components/ContentCarousel';
import FilterBar from '../components/FilterBar';

interface MoviesProps { }

/**
 * Representation of a slide used by the hero carousel.
 */
interface HeroSlide {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  trailerKey?: string;
}

interface Genre {
  id: number;
  name: string;
}

/**
 * Combine multiple movie arrays into a single array while preserving order.
 * Exported for unit tests.
 */
export const combineMovieLists = (lists: Movie[][]): Movie[] => {
  const combined: Movie[] = [];
  for (const l of lists) {
    if (Array.isArray(l) && l.length > 0) {
      combined.push(...l);
    }
  }
  return combined;
};

/**
 * Return unique movies by id preserving first occurrence.
 * Exported for unit tests.
 */
export const uniqueMoviesById = (movies: Movie[]): Movie[] =>
  movies.filter((m, i, a) => i === a.findIndex(x => x.id === m.id));

/**
 * Filter movies by provided criteria: search query, genre id, year, and minimum rating.
 * Exported for unit tests.
 */
export const filterMoviesByCriteria = (
  movies: Movie[],
  options: {
    searchQuery?: string;
    genreId?: number | null;
    year?: string;
    minRating?: number;
  }
): Movie[] => {
  if (!movies || movies.length === 0) return [];
  const { searchQuery = '', genreId = null, year = '', minRating = 0 } = options;
  let filtered = movies;

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.overview || '').toLowerCase().includes(q)
    );
  }

  if (genreId) {
    filtered = filtered.filter(m => Array.isArray(m.genre_ids) && m.genre_ids.includes(genreId));
  }

  if (year) {
    filtered = filtered.filter(m => m.release_date?.startsWith(year));
  }

  if (minRating && minRating > 0) {
    filtered = filtered.filter(m => m.vote_average >= minRating);
  }

  return uniqueMoviesById(filtered);
};

/**
 * Centralize API error formatting and logging.
 * Returns a user-facing message and ensures the original error is logged for diagnostics.
 * @param err - Original error thrown by the API call
 * @param defaultMessage - Fallback message to present to the user
 */
export const formatApiError = (err: unknown, defaultMessage = 'An unexpected error occurred'): string => {
  console.error(defaultMessage, err);
  return defaultMessage;
};

/**
 * Fetch hero slides (uses trending movies as source and enriches with trailer keys).
 * This is a pure helper: dependencies can be injected for testing.
 *
 * @param limit - number of hero slides to return (defaults to 5)
 * @param getTrendingFn - injected function to fetch trending movies (defaults to service)
 * @param getVideosFn - injected function to fetch movie videos (defaults to service)
 * @returns Promise<HeroSlide[]>
 */
export const fetchHeroSlides = async (
  limit = 5,
  getTrendingFn: (page?: number) => Promise<any> = getTrendingMovies,
  getVideosFn: (movieId: number) => Promise<any> = getMovieVideos
): Promise<HeroSlide[]> => {
  const trending = await getTrendingFn(1);
  const featured = Array.isArray(trending?.results) ? trending.results.slice(0, limit) : [];

  const heroData: HeroSlide[] = await Promise.all(
    featured.map(async (movie: any) => {
      try {
        const videos = await getVideosFn(movie.id);
        const trailer = Array.isArray(videos) ? videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') : undefined;
        return {
          ...movie,
          title: movie.title,
          trailerKey: trailer?.key
        } as HeroSlide;
      } catch (err) {
        // Non-fatal for hero slides: log and continue without trailer
        console.error(`Error fetching videos for movie ${movie.id}:`, err);
        return {
          ...movie,
          title: movie.title,
          trailerKey: undefined
        } as HeroSlide;
      }
    })
  );

  return heroData;
};

/**
 * Fetch movies for a specific genre, using an optional cache and injectable discover function.
 * Throws when the discover function fails (caller can decide how to handle the error).
 *
 * @param genreId - TMDB genre id
 * @param discoverFn - injected discover function (defaults to service)
 * @param cache - optional Map<number, Movie[]> to avoid refetching
 * @returns Promise<Movie[]>
 */
export const fetchMoviesForGenre = async (
  genreId: number,
  discoverFn: (genreId: number, page?: number) => Promise<any> = discoverMoviesByGenre,
  cache?: Map<number, Movie[]>
): Promise<Movie[]> => {
  if (cache && cache.has(genreId)) {
    return cache.get(genreId)!;
  }

  const response = await discoverFn(genreId, 1);
  const results = Array.isArray(response?.results) ? response.results : [];
  if (cache) cache.set(genreId, results);
  return results;
};

/**
 * Load all primary movie data in parallel (trending, popular, top rated, now playing, upcoming, and genres).
 * Genre-specific movie rows are also fetched; individual genre failures result in empty arrays for that genre.
 *
 * Dependencies are injectable for testing.
 *
 * @returns Promise<{
 *   trending: Movie[];
 *   popular: Movie[];
 *   topRated: Movie[];
 *   nowPlaying: Movie[];
 *   upcoming: Movie[];
 *   genres: Genre[];
 *   genreRows: { [key: string]: Movie[] };
 * }>
 */
export const loadAllMovies = async (
  getTrendingFn: (page?: number) => Promise<any> = getTrendingMovies,
  getPopularFn: (page?: number) => Promise<any> = getPopularMovies,
  getTopRatedFn: (page?: number) => Promise<any> = getTopRatedMovies,
  getNowPlayingFn: (page?: number) => Promise<any> = getNowPlayingMovies,
  getUpcomingFn: (page?: number) => Promise<any> = getUpcomingMovies,
  getGenresFn: () => Promise<any> = getMovieGenres,
  discoverFn: (genreId: number, page?: number) => Promise<any> = discoverMoviesByGenre
) => {
  const [
    trendingRes,
    popularRes,
    topRatedRes,
    nowPlayingRes,
    upcomingRes,
    genreList
  ] = await Promise.all([
    getTrendingFn(1),
    getPopularFn(1),
    getTopRatedFn(1),
    getNowPlayingFn(1),
    getUpcomingFn(1),
    getGenresFn()
  ]);

  const genresArray: Genre[] = Array.isArray(genreList) ? genreList : genreList || [];

  const genreRows: { [key: string]: Movie[] } = {};
  await Promise.all(
    genresArray.map(async (genre) => {
      try {
        const res = await discoverFn(genre.id, 1);
        genreRows[genre.name] = Array.isArray(res?.results) ? res.results : [];
      } catch (err) {
        // Log and continue with empty list for this genre
        console.error(`Error fetching movies for genre ${genre.id}:`, err);
        genreRows[genre.name] = [];
      }
    })
  );

  return {
    trending: Array.isArray(trendingRes?.results) ? trendingRes.results : [],
    popular: Array.isArray(popularRes?.results) ? popularRes.results : [],
    topRated: Array.isArray(topRatedRes?.results) ? topRatedRes.results : [],
    nowPlaying: Array.isArray(nowPlayingRes?.results) ? nowPlayingRes.results : [],
    upcoming: Array.isArray(upcomingRes?.results) ? upcomingRes.results : [],
    genres: genresArray,
    genreRows
  };
};

/**
 * Movies page component - displays hero carousel, filter bar, and content rows.
 */
const Movies: React.FC<MoviesProps> = () => {
  const [heroMovies, setHeroMovies] = useState<HeroSlide[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [genreRows, setGenreRows] = useState<{ [key: string]: Movie[] }>({});
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache for genre data (used when fetching individual genre pages)
  // const genreCache = useMemo(() => new Map<number, Movie[]>(), []);

  const fetchHero = useCallback(async () => {
    try {
      const slides = await fetchHeroSlides(5, getTrendingMovies, getMovieVideos);
      setHeroMovies(slides);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load hero movies. Please try again.'));
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadAllMovies(
        getTrendingMovies,
        getPopularMovies,
        getTopRatedMovies,
        getNowPlayingMovies,
        getUpcomingMovies,
        getMovieGenres,
        discoverMoviesByGenre
      );

      setTrendingMovies(data.trending);
      setPopularMovies(data.popular);
      setTopRatedMovies(data.topRated);
      setNowPlayingMovies(data.nowPlaying);
      setUpcomingMovies(data.upcoming);
      setGenres(data.genres);
      setGenreRows(data.genreRows);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load movies. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    fetchHero();
  }, [fetchAllData, fetchHero]);

  // Memoize combined lists for performance
  const combinedMovies = useMemo(() => {
    return combineMovieLists([trendingMovies, popularMovies, topRatedMovies, nowPlayingMovies, upcomingMovies]);
  }, [trendingMovies, popularMovies, topRatedMovies, nowPlayingMovies, upcomingMovies]);

  // Compute filtered movies based on criteria and memoize result
  const filteredMovies = useMemo(() => {
    // If no filtering criteria are active, return an empty array to indicate default rows should be shown
    const isFilteringActive = Boolean(searchQuery) || Boolean(selectedGenre) || Boolean(selectedYear) || selectedRating > 0;
    if (!isFilteringActive) return [];

    let baseMovies = combinedMovies;

    // If a genre is selected, include genreRows for that genre so discover results are considered
    if (selectedGenre) {
      const genreMovies = genreRows[selectedGenre] || [];
      if (genreMovies.length > 0) {
        baseMovies = combineMovieLists([baseMovies, genreMovies]);
      }
    }

    const genreId = genres.find(g => g.name === selectedGenre)?.id ?? null;

    return filterMoviesByCriteria(baseMovies, {
      searchQuery,
      genreId,
      year: selectedYear,
      minRating: selectedRating
    });
  }, [combinedMovies, searchQuery, selectedGenre, selectedYear, selectedRating, genres, genreRows]);

  const handleWatchTrailer = (trailerKey?: string) => {
    if (trailerKey) {
      window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank');
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());
  }, []);

  const handleRetry = async () => {
    setError(null);
    await fetchAllData();
    await fetchHero();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1F] flex items-center justify-center">
        <div className="relative">
          {/* Main thick spinner */}
          <div className="h-32 w-32 netflix-spinner-thick" />

          {/* Ripple effects */}
          <div className="h-32 w-32 netflix-ripple" />
          <div className="h-32 w-32 netflix-ripple" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A1F] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      {/* Hero Carousel */}
      {heroMovies.length > 0 && (
        <HeroCarousel
          items={heroMovies}
          onTrailerClick={handleWatchTrailer}
          type="movie"
        />
      )}

      {/* Filter Bar */}
      <FilterBar
        genres={genres}
        years={years}
        searchQuery={searchQuery}
        selectedGenre={selectedGenre}
        selectedYear={selectedYear}
        selectedRating={selectedRating}
        showFilters={showFilters}
        onSearchChange={setSearchQuery}
        onGenreChange={setSelectedGenre}
        onYearChange={setSelectedYear}
        onRatingChange={setSelectedRating}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Content Rows */}
      <div className="px-4 sm:px-8 py-8 space-y-12">
        {searchQuery || selectedGenre || selectedYear || selectedRating > 0 ? (
          // Filtered results
          filteredMovies.length > 0 ? (
            <ContentCarousel
              title="Search Results"
              items={filteredMovies}
              type="movie"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No movies found matching your criteria</p>
            </div>
          )
        ) : (
          // Default rows
          <>
            <ContentCarousel
              title="Trending Now"
              items={trendingMovies}
              type="movie"
            />

            <ContentCarousel
              title="Popular on CineFlix"
              items={popularMovies}
              type="movie"
            />

            <ContentCarousel
              title="Top Rated"
              items={topRatedMovies}
              type="movie"
            />

            <ContentCarousel
              title="Now Playing"
              items={nowPlayingMovies}
              type="movie"
            />

            <ContentCarousel
              title="Upcoming"
              items={upcomingMovies}
              type="movie"
            />

            {/* Genre Rows */}
            {genres.map((genre) => {
              const movies = genreRows[genre.name];
              return movies && movies.length > 0 ? (
                <ContentCarousel
                  key={genre.id}
                  title={genre.name}
                  items={movies}
                  type="movie"
                />
              ) : null;
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default Movies;