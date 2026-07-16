import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TVShow, Genre } from '../types';
import {
  getTrendingTVShows,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getTVGenres,
  discoverTVShowsByGenre,
  getTVShowVideos,
  discoverTVShowsAdvanced
} from '../services/tmdb';
import HeroCarousel from '../components/HeroCarousel';
import ContentCarousel from '../components/ContentCarousel';
import LazySection from '../components/LazySection';
import FilterBar from '../components/FilterBar';
import { SEOHead } from '../components/layout/SEOHead';
import { DEFAULT_ROW_ITEM_LIMIT, limitForInitialPaint } from '../utils/progressiveRender';

interface TVShowsProps { }

interface HeroSlide {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  trailerKey?: string;
}

/** Primary rows only — injectable for tests */
export const loadPrimaryTVShows = async (
  getTrendingFn: (page?: number) => Promise<any> = getTrendingTVShows,
  getPopularFn: (page?: number) => Promise<any> = getPopularTVShows,
  getTopRatedFn: (page?: number) => Promise<any> = getTopRatedTVShows,
  getOnAirFn: (page?: number) => Promise<any> = getAiringTodayTVShows,
  getGenresFn: () => Promise<any> = getTVGenres,
  itemLimit: number = DEFAULT_ROW_ITEM_LIMIT
) => {
  const [trending, popular, topRated, onAir, genreList] = await Promise.all([
    getTrendingFn(1),
    getPopularFn(1),
    getTopRatedFn(1),
    getOnAirFn(1),
    getGenresFn(),
  ]);

  const cap = (res: { results?: TVShow[] } | null | undefined): TVShow[] => {
    const results: TVShow[] = Array.isArray(res?.results) ? res.results : [];
    return limitForInitialPaint(results, itemLimit);
  };

  return {
    trending: cap(trending),
    popular: cap(popular),
    topRated: cap(topRated),
    onAir: cap(onAir),
    genres: (Array.isArray(genreList) ? genreList : []) as Genre[],
  };
};

const TVShows: React.FC<TVShowsProps> = () => {
  const [heroShows, setHeroShows] = useState<HeroSlide[]>([]);
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [topRatedShows, setTopRatedShows] = useState<TVShow[]>([]);
  const [onAirShows, setOnAirShows] = useState<TVShow[]>([]);
  const [genreRows, setGenreRows] = useState<{ [key: string]: TVShow[] }>({});
  const [genres, setGenres] = useState<Genre[]>([]);
  const [filteredShows, setFilteredShows] = useState<TVShow[]>([]);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [genreLoadingIds, setGenreLoadingIds] = useState<Record<number, boolean>>({});
  const genreFetchInflight = useRef<Set<number>>(new Set());
  const genreCache = useMemo(() => new Map<number, TVShow[]>(), []);

  const fetchHeroShows = useCallback(async () => {
    try {
      const trending = await getTrendingTVShows(1);
      const featured = trending.results.slice(0, 5);

      // Only enrich first 2 with trailer network calls
      const heroData = await Promise.all(
        featured.map(async (show, index) => {
          if (index >= 2) {
            return {
              ...show,
              title: show.name,
              trailerKey: undefined,
            };
          }
          try {
            const videos = await getTVShowVideos(show.id);
            const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            return {
              ...show,
              title: show.name,
              trailerKey: trailer?.key,
            };
          } catch (error) {
            console.error(`Error fetching videos for show ${show.id}:`, error);
            return {
              ...show,
              title: show.name,
              trailerKey: undefined,
            };
          }
        })
      );

      setHeroShows(heroData);
    } catch (error) {
      console.error('Error fetching hero shows:', error);
    }
  }, []);

  const fetchGenreShows = useCallback(async (genreId: number) => {
    if (genreCache.has(genreId)) {
      return genreCache.get(genreId)!;
    }

    try {
      const response = await discoverTVShowsByGenre(genreId, 1);
      const results = limitForInitialPaint(response.results);
      genreCache.set(genreId, results);
      return results;
    } catch (error) {
      console.error(`Error fetching shows for genre ${genreId}:`, error);
      return [];
    }
  }, [genreCache]);

  const fetchPrimaryData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadPrimaryTVShows();
      setTrendingShows(data.trending);
      setPopularShows(data.popular);
      setTopRatedShows(data.topRated);
      setOnAirShows(data.onAir);
      setGenres(data.genres);
      setGenreRows({});
      setFilteredShows(data.trending);
    } catch (error) {
      console.error('Error fetching TV shows data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureGenreRow = useCallback(async (genre: Genre) => {
    if (genreRows[genre.name] !== undefined) return;
    if (genreFetchInflight.current.has(genre.id)) return;
    genreFetchInflight.current.add(genre.id);
    setGenreLoadingIds((prev) => ({ ...prev, [genre.id]: true }));
    try {
      const shows = await fetchGenreShows(genre.id);
      setGenreRows((prev) => ({ ...prev, [genre.name]: shows }));
    } catch (err) {
      console.error(`Error loading genre row ${genre.name}:`, err);
      setGenreRows((prev) => ({ ...prev, [genre.name]: [] }));
    } finally {
      genreFetchInflight.current.delete(genre.id);
      setGenreLoadingIds((prev) => {
        const next = { ...prev };
        delete next[genre.id];
        return next;
      });
    }
  }, [genreRows, fetchGenreShows]);

  useEffect(() => {
    void fetchPrimaryData();
    void fetchHeroShows();
  }, [fetchPrimaryData, fetchHeroShows]);

  useEffect(() => {
    const isFilteringActive = Boolean(searchQuery) || Boolean(selectedGenre) || Boolean(selectedYear) || selectedRating > 0;

    if (!isFilteringActive) {
      setFilteredShows([]);
      setIsFilteringLoading(false);
      return;
    }

    const genreId = genres.find(g => g.name === selectedGenre)?.id ?? null;
    let active = true;

    const fetchFilteredResults = async () => {
      setIsFilteringLoading(true);
      try {
        const response = await discoverTVShowsAdvanced({
          query: searchQuery,
          genreId,
          year: selectedYear,
          minRating: selectedRating,
          page: 1
        });

        if (active) {
          setFilteredShows(response.results || []);
        }
      } catch (err) {
        console.error('Error fetching advanced filtered TV shows:', err);
        if (active) {
          setFilteredShows([]);
        }
      } finally {
        if (active) {
          setIsFilteringLoading(false);
        }
      }
    };

    void fetchFilteredResults();
    return () => {
      active = false;
    };
  }, [searchQuery, selectedGenre, selectedYear, selectedRating, genres]);

  const handleWatchTrailer = (trailerKey?: string) => {
    if (trailerKey) {
      window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank');
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-main flex items-center justify-center">
        <div className="relative">
          <div className="h-32 w-32 netflix-spinner-thick" />
          <div className="h-32 w-32 netflix-ripple" />
          <div className="h-32 w-32 netflix-ripple" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-main text-white">
      <SEOHead
        title="TV Shows"
        description="Browse trending, popular, top-rated, and on-the-air TV shows on CINEFLIX."
      />
      {heroShows.length > 0 && (
        <HeroCarousel
          items={heroShows}
          onTrailerClick={handleWatchTrailer}
          type="tv"
        />
      )}

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
        type="tv"
      />

      <div className="px-4 sm:px-8 py-8 space-y-12">
        {searchQuery || selectedGenre || selectedYear || selectedRating > 0 ? (
          isFilteringLoading ? (
            <div className="flex flex-col gap-4 py-8">
              <h2 className="text-2xl font-bold tracking-tight text-white/90 px-4">Searching catalog...</h2>
              <div className="flex gap-4 overflow-x-hidden px-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-[180px] sm:w-[240px] h-[270px] sm:h-[360px] bg-white/5 animate-pulse rounded-2xl border border-white/5 flex-shrink-0" />
                ))}
              </div>
            </div>
          ) : filteredShows.length > 0 ? (
            <ContentCarousel
              title="Search Results"
              items={filteredShows}
              type="tv"
              eager
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-2">No shows found matching your criteria</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search keywords</p>
            </div>
          )
        ) : (
          <>
            <ContentCarousel
              title="Trending Now"
              items={trendingShows}
              type="tv"
              eager
            />

            <LazySection minHeight={340} rootMargin="140px 0px" aria-label="Popular TV shows">
              <ContentCarousel
                title="Popular on CINEFLIX"
                items={popularShows}
                type="tv"
              />
            </LazySection>

            <LazySection minHeight={340} rootMargin="140px 0px" aria-label="Top rated TV shows">
              <ContentCarousel
                title="Top Rated"
                items={topRatedShows}
                type="tv"
              />
            </LazySection>

            <LazySection minHeight={340} rootMargin="140px 0px" aria-label="On the air shows">
              <ContentCarousel
                title="On the Air"
                items={onAirShows}
                type="tv"
              />
            </LazySection>

            {genres.map((genre) => (
              <LazySection
                key={genre.id}
                minHeight={340}
                rootMargin="160px 0px"
                onActivate={() => {
                  void ensureGenreRow(genre);
                }}
                aria-label={`${genre.name} TV shows`}
              >
                <ContentCarousel
                  title={genre.name}
                  items={genreRows[genre.name] || []}
                  type="tv"
                  loading={Boolean(genreLoadingIds[genre.id]) || genreRows[genre.name] === undefined}
                />
              </LazySection>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TVShows;
