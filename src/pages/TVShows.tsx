import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TVShow, Genre } from '../types';
import {
  getTrendingTVShows,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getTVGenres,
  discoverTVShowsByGenre,
  getTVShowVideos
} from '../services/tmdb';
import HeroCarousel from '../components/HeroCarousel';
import ContentCarousel from '../components/ContentCarousel';
import FilterBar from '../components/FilterBar';

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

  // Filter logic
  useEffect(() => {
    let filtered = [...trendingShows, ...popularShows, ...topRatedShows, ...onAirShows];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(show =>
        show.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.overview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply genre filter
    if (selectedGenre) {
      const genreId = genres.find(g => g.name === selectedGenre)?.id;
      if (genreId) {
        const genreShows = genreRows[selectedGenre] || [];
        filtered = [...filtered, ...genreShows];
        filtered = filtered.filter(show => show.genre_ids.includes(genreId));
      }
    }

    // Apply year filter
    if (selectedYear) {
      filtered = filtered.filter(show =>
        show.first_air_date?.startsWith(selectedYear)
      );
    }

    // Apply rating filter
    if (selectedRating > 0) {
      filtered = filtered.filter(show => show.vote_average >= selectedRating);
    }

    // Remove duplicates
    const uniqueShows = filtered.filter((show, index, self) =>
      index === self.findIndex(s => s.id === show.id)
    );

    setFilteredShows(uniqueShows);
  }, [searchQuery, selectedGenre, selectedYear, selectedRating, trendingShows, popularShows, topRatedShows, onAirShows, genres, genreRows]);

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
      />

      {/* Content Rows */}
      <div className="px-4 sm:px-8 py-8 space-y-12">
        {searchQuery || selectedGenre || selectedYear || selectedRating > 0 ? (
          // Filtered results
          filteredShows.length > 0 ? (
            <ContentCarousel
              title="Search Results"
              items={filteredShows}
              type="tv"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No shows found matching your criteria</p>
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
