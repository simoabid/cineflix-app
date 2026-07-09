import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import FilterBar from '../components/FilterBar';
import { SEOHead } from '../components/layout/SEOHead';

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

  // Cache for genre data
  const genreCache = useMemo(() => new Map(), []);

  const fetchHeroShows = useCallback(async () => {
    try {
      const trending = await getTrendingTVShows(1);
      const featured = trending.results.slice(0, 5);

      // Fetch trailer data for each featured show
      const heroData = await Promise.all(
        featured.map(async (show) => {
          try {
            const videos = await getTVShowVideos(show.id);
            const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            return {
              ...show,
              title: show.name,
              trailerKey: trailer?.key
            };
          } catch (error) {
            console.error(`Error fetching videos for show ${show.id}:`, error);
            return {
              ...show,
              title: show.name,
              trailerKey: undefined
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
      return genreCache.get(genreId);
    }

    try {
      const response = await discoverTVShowsByGenre(genreId, 1);
      genreCache.set(genreId, response.results);
      return response.results;
    } catch (error) {
      console.error(`Error fetching shows for genre ${genreId}:`, error);
      return [];
    }
  }, [genreCache]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        trending,
        popular,
        topRated,
        onAir,
        genreList
      ] = await Promise.all([
        getTrendingTVShows(1),
        getPopularTVShows(1),
        getTopRatedTVShows(1),
        getAiringTodayTVShows(1),
        getTVGenres()
      ]);

      setTrendingShows(trending.results);
      setPopularShows(popular.results);
      setTopRatedShows(topRated.results);
      setOnAirShows(onAir.results);
      setGenres(genreList);

      // Fetch shows for each genre
      const genreShowsData: { [key: string]: TVShow[] } = {};
      await Promise.all(
        genreList.map(async (genre) => {
          const shows = await fetchGenreShows(genre.id);
          genreShowsData[genre.name] = shows;
        })
      );
      setGenreRows(genreShowsData);

      // Initialize filtered shows with trending
      setFilteredShows(trending.results);
    } catch (error) {
      console.error('Error fetching TV shows data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchGenreShows]);

  useEffect(() => {
    fetchAllData();
    fetchHeroShows();
  }, [fetchAllData, fetchHeroShows]);

  // Fetch advanced search/filter results from TMDB API dynamically
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

    fetchFilteredResults();
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

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      <SEOHead
        title="TV Shows"
        description="Browse trending, popular, top-rated, and on-the-air TV shows on CINEFLIX."
      />
      {/* Hero Carousel */}
      {heroShows.length > 0 && (
        <HeroCarousel
          items={heroShows}
          onTrailerClick={handleWatchTrailer}
          type="tv"
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
        type="tv"
      />

      {/* Content Rows */}
      <div className="px-4 sm:px-8 py-8 space-y-12">
        {searchQuery || selectedGenre || selectedYear || selectedRating > 0 ? (
          // Filtered results
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
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-2">No shows found matching your criteria</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search keywords</p>
            </div>
          )
        ) : (
          // Default rows
          <>
            <ContentCarousel
              title="Trending Now"
              items={trendingShows}
              type="tv"
            />

            <ContentCarousel
              title="Popular on CineFlix"
              items={popularShows}
              type="tv"
            />

            <ContentCarousel
              title="Top Rated"
              items={topRatedShows}
              type="tv"
            />

            <ContentCarousel
              title="On the Air"
              items={onAirShows}
              type="tv"
            />

            {/* Genre Rows */}
            {genres.map((genre) => {
              const shows = genreRows[genre.name];
              return shows && shows.length > 0 ? (
                <ContentCarousel
                  key={genre.id}
                  title={genre.name}
                  items={shows}
                  type="tv"
                />
              ) : null;
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default TVShows;
