import React, { useState, useEffect, useRef, useCallback } from 'react';
import AddToListButton from '../components/AddToListButton';
import LikeButton from '../components/LikeButton';
import { Link } from 'react-router-dom';
import { useScreenSize } from '../hooks/useScreenSize';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Filter,
  Grid,
  List,
  Volume2,
  Share2
} from 'lucide-react';
import {
  getTrendingMovies,
  getTrendingTVShows,
  getPopularMovies,
  getPopularTVShows,
  getUpcomingMovies,
  getAiringTodayTVShows,
  getNowPlayingMovies,
  getImageUrl
} from '../services/tmdb';
import LogoImage from '../components/LogoImage';
import { Movie, TVShow } from '../types';
import { handleImageError } from '../utils/imageLoader';

// Genre mapping for display
const GENRES = {
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
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
} as const;

const getGenreNames = (genreIds: number[] = []) => {
  return genreIds.map(id => GENRES[id as keyof typeof GENRES] || 'Unknown').slice(0, 2);
};

interface ContentItem extends Partial<Movie & TVShow> {
  media_type?: 'movie' | 'tv';
}

interface SectionData {
  title: string;
  items: ContentItem[];
  type: 'movie' | 'tv' | 'mixed';
}

const NewPopularPage: React.FC = () => {
  const [sections, setSections] = useState<{
    newReleases: SectionData;
    trendingNow: SectionData;
    comingSoon: SectionData;
    top10Movies: SectionData;
    top10TV: SectionData;
    recentlyAddedMovies: SectionData;
    recentlyAddedTV: SectionData;
  }>({
    newReleases: { title: 'New Releases', items: [], type: 'mixed' },
    trendingNow: { title: 'Trending Now', items: [], type: 'mixed' },
    comingSoon: { title: 'Coming Soon', items: [], type: 'mixed' },
    top10Movies: { title: 'Top 10 Movies', items: [], type: 'movie' },
    top10TV: { title: 'Top 10 TV Shows', items: [], type: 'tv' },
    recentlyAddedMovies: { title: 'Recently Added Movies', items: [], type: 'movie' },
    recentlyAddedTV: { title: 'Recently Added TV Shows', items: [], type: 'tv' },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'all' | 'movies' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'release_date' | 'popularity' | 'rating' | 'title'>('popularity');
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [heroIndex, setHeroIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('grid');

  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllData();
  }, [contentType, sortBy, timePeriod]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.max(3, sections.trendingNow.items.length));
    }, 5000);
    return () => clearInterval(interval);
  }, [sections.trendingNow.items]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        trendingMoviesData,
        trendingTVData,
        popularMoviesData,
        popularTVData,
        upcomingMoviesData,
        recentMoviesResponse,
        airingTodayTVData
      ] = await Promise.all([
        getTrendingMovies(),
        getTrendingTVShows(),
        getPopularMovies(),
        getPopularTVShows(),
        getUpcomingMovies(),
        getNowPlayingMovies(1),
        getAiringTodayTVShows()
      ]);



      // Combine and process data based on filters
      const processItems = (items: any[], type: 'movie' | 'tv') => {
        return items.map(item => ({
          ...item,
          media_type: type,
          release_date: item.release_date || item.first_air_date,
          title: item.title || item.name,
          original_title: item.original_title || item.original_name
        }));
      };

      const movies = processItems(trendingMoviesData.results.slice(0, 20), 'movie');
      const tvShows = processItems(trendingTVData.results.slice(0, 20), 'tv');
      const popularMovies = processItems(popularMoviesData.results.slice(0, 20), 'movie');
      const popularTV = processItems(popularTVData.results.slice(0, 20), 'tv');
      const upcoming = processItems(upcomingMoviesData.results.slice(0, 20), 'movie');
      const nowPlaying = processItems(recentMoviesResponse.results.slice(0, 20), 'movie');
      const airingToday = processItems(airingTodayTVData.results.slice(0, 20), 'tv');

      // Filter by content type
      let filteredMovies = movies;
      let filteredTV = tvShows;
      let filteredPopularMovies = popularMovies;
      let filteredPopularTV = popularTV;
      let filteredUpcoming = upcoming;
      let filteredNowPlaying = nowPlaying;
      let filteredAiringToday = airingToday;

      if (contentType === 'movies') {
        filteredTV = [];
        filteredPopularTV = [];
        filteredAiringToday = [];
      } else if (contentType === 'tv') {
        filteredMovies = [];
        filteredPopularMovies = [];
        filteredUpcoming = [];
        filteredNowPlaying = [];
      }

      setSections({
        newReleases: {
          title: 'New Releases',
          items: [...filteredNowPlaying, ...filteredAiringToday].sort((a, b) =>
            new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime()
          ).slice(0, 20),
          type: 'mixed'
        },
        trendingNow: {
          title: 'Trending Now',
          items: [...filteredMovies, ...filteredTV].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)),
          type: 'mixed'
        },
        comingSoon: {
          title: 'Coming Soon',
          items: filteredUpcoming.sort((a, b) =>
            new Date(a.release_date || 0).getTime() - new Date(b.release_date || 0).getTime()
          ),
          type: 'movie'
        },
        top10Movies: {
          title: 'Top 10 Movies',
          items: filteredPopularMovies.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 10),
          type: 'movie'
        },
        top10TV: {
          title: 'Top 10 TV Shows',
          items: filteredPopularTV.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 10),
          type: 'tv'
        },
        recentlyAddedMovies: {
          title: 'Recently Added Movies',
          items: filteredNowPlaying.slice(0, 20),
          type: 'movie'
        },
        recentlyAddedTV: {
          title: 'Recently Added TV Shows',
          items: filteredAiringToday.slice(0, 20),
          type: 'tv'
        },
      });

    } catch (err) {
      setError('Failed to load content. Please try again later.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };



  const heroContent = sections.trendingNow.items.slice(0, 5);

  const handleHeroNavigation = useCallback((direction: 'prev' | 'next') => {
    setHeroIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? heroContent.length - 1 : prev - 1;
      }
      return prev === heroContent.length - 1 ? 0 : prev + 1;
    });
  }, [heroContent.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1F]">
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              {/* Main thick spinner */}
              <div className="h-32 w-32 netflix-spinner-thick" />

              {/* Ripple effects */}
              <div className="h-32 w-32 netflix-ripple" />
              <div className="h-32 w-32 netflix-ripple" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Loading text with dots */}
            <div className="text-center loading-text">
              <p className="text-white text-xl font-medium mb-3">Loading New & Popular</p>
              <div className="flex gap-2 justify-center">
                <div className="netflix-dot" />
                <div className="netflix-dot" />
                <div className="netflix-dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A1F]">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
            <p className="text-netflix-lightgray mb-4">{error}</p>
            <button
              onClick={fetchAllData}
              className="bg-netflix-red text-white px-6 py-2 rounded hover:bg-red-600 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      {/* Hero Section */}
      {heroContent.length > 0 && (
        <div
          ref={heroRef}
          className="relative h-[70vh] md:h-[85vh] overflow-hidden"
        >
          <div className="absolute inset-0">
            <img
              src={getImageUrl(heroContent[heroIndex]?.backdrop_path || null, 'original')}
              alt={heroContent[heroIndex]?.title || heroContent[heroIndex]?.name}
              className="w-full h-full object-cover transition-transform duration-1000 ease-in-out"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A1F] via-[#0A0A1F]/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-transparent to-transparent"></div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => handleHeroNavigation('prev')}
            className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <button
            onClick={() => handleHeroNavigation('next')}
            className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          <div className="absolute inset-0 flex items-center px-4 md:px-16">
            <div className="max-w-2xl animate-fade-in">
              <div className="mb-4 animate-slide-up">
                <LogoImage
                  logoPath={heroContent[heroIndex]?.logo_path}
                  title={heroContent[heroIndex]?.title || heroContent[heroIndex]?.name || ''}
                  size="xl"
                  className="justify-start"
                  textClassName="text-4xl md:text-6xl font-bold"
                  maxHeight="max-h-20 md:max-h-28 lg:max-h-32"
                  contentId={heroContent[heroIndex]?.id}
                  contentType={heroContent[heroIndex]?.media_type || 'movie'}
                  enableOnDemandFetch={true}
                />
              </div>
              <p className="text-lg md:text-xl text-netflix-lightgray mb-6 line-clamp-3 animate-slide-up animation-delay-200">
                {heroContent[heroIndex]?.overview}
              </p>
              <div className="flex gap-4 animate-slide-up animation-delay-400">
                <button className="bg-white text-black px-8 py-3 rounded flex items-center gap-2 hover:bg-opacity-80 transition hover:scale-105">
                  <Play className="w-5 h-5" fill="black" />
                  Play
                </button>
                {heroContent[heroIndex] && heroContent[heroIndex].id && (
                  <AddToListButton
                    content={heroContent[heroIndex] as Movie | TVShow}
                    contentType={heroContent[heroIndex].media_type || 'movie'}
                    variant="button"
                    className="bg-gray-600/70 hover:bg-gray-600 transition hover:scale-105"
                    showText={true}
                  />
                )}
                <button className="bg-gray-600/70 text-white px-8 py-3 rounded flex items-center gap-2 hover:bg-gray-600 transition hover:scale-105">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Hero indicators */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
            {heroContent.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === heroIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
                  }`}
                onClick={() => setHeroIndex(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-[#0A0A1F]/95 backdrop-blur-md shadow-lg' : 'bg-[#0A0A1F]/90 backdrop-blur-sm'
        } border-b border-gray-800`}>
        <div className="px-4 md:px-16 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-netflix-lightgray bg-clip-text text-transparent">
                New & Popular
              </h2>
              <p className="text-sm text-netflix-lightgray mt-1">Discover trending content</p>
            </div>

            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('carousel')}
                  className={`p-2 rounded transition ${viewMode === 'carousel'
                    ? 'bg-netflix-red text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  title="Carousel view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition ${viewMode === 'grid'
                    ? 'bg-netflix-red text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-netflix-red focus:outline-none transition"
                  >
                    <option value="all">All Content</option>
                    <option value="movies">Movies Only</option>
                    <option value="tv">TV Shows Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-netflix-red focus:outline-none transition"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="release_date">Release Date</option>
                    <option value="rating">Rating</option>
                    <option value="title">Alphabetical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Time Period</label>
                  <select
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-netflix-red focus:outline-none transition"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">View Mode</label>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-netflix-red focus:outline-none transition"
                  >
                    <option value="carousel">Carousel</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-4 md:px-16 py-8 space-y-12">
        {Object.entries(sections).map(([key, section]) => (
          <ContentSection
            key={key}
            id={key}
            title={section.title}
            items={section.items}
            type={section.type}
          />
        ))}
      </div>

      {/* Back to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 bg-netflix-red text-white p-3 rounded-full hover:bg-red-600 transition shadow-lg"
      >
        <ChevronLeft className="w-6 h-6 rotate-90" />
      </button>
    </div>
  );
};

interface ContentSectionProps {
  id: string;
  title: string;
  items: ContentItem[];
  type: 'movie' | 'tv' | 'mixed';
}

const ContentSection: React.FC<ContentSectionProps> = ({ id, title, items, type }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  // Keeping hovered state reserved for future micro-interactions if needed
  // const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth > 768 ? 600 : 300;
      const currentScroll = scrollRef.current.scrollLeft;
      const newScroll = direction === 'left'
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;

      scrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  if (items.length === 0) return null;

  const SectionHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-netflix-lightgray bg-clip-text text-transparent">
          {title}
        </h3>
        <p className="text-sm text-netflix-lightgray mt-1">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Carousel navigation">
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`p-2 rounded-full transition ${canScrollLeft
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`p-2 rounded-full transition ${canScrollRight
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <section id={id} className="space-y-6">
      <SectionHeader />
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        role="region"
        aria-label={`${title} carousel`}
        tabIndex={0}
      >
        {items.map((item, index) => (
          <ContentCard
            key={`${item.id}-${index}`}
            item={item}
            index={index}
            type={type}
            onHover={() => { }}
            isHovered={false}
          />
        ))}
      </div>
    </section>
  );
}

export default NewPopularPage;

interface ContentCardPropsInline {
  item: ContentItem;
  index: number;
  type: 'movie' | 'tv' | 'mixed';
  onHover?: (index: number | null) => void;
  isHovered?: boolean;
}

const ContentCard: React.FC<ContentCardPropsInline> = ({
  item,
  index,
  type,
  onHover,
  isHovered
}) => {
  const [localIsHovered, setLocalIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isMobile, isTablet } = useScreenSize();

  // Disable hover effects on mobile and tablet
  const shouldShowHover = !isMobile && !isTablet;

  const isNew = () => {
    if (!item.release_date) return false;
    const releaseDate = new Date(item.release_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return releaseDate >= sevenDaysAgo;
  };

  const handleMouseEnter = () => {
    if (shouldShowHover) {
      setLocalIsHovered(true);
      onHover?.(index);
    }
  };

  const handleMouseLeave = () => {
    if (shouldShowHover) {
      setLocalIsHovered(false);
      onHover?.(null);
    }
  };

  const actualHovered = shouldShowHover && (isHovered !== undefined ? isHovered : localIsHovered);

  return (
    <div
      className={`relative flex-shrink-0 w-36 sm:w-40 md:w-48 lg:w-64 group cursor-pointer transition-all duration-300 ${actualHovered ? 'scale-105 z-10' : 'scale-100'
        }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link to={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.id}`}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-lg">
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}

          <img
            src={getImageUrl(item.poster_path || null, 'w500')}
            alt={item.title || item.name}
            className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${actualHovered ? 'scale-110' : 'scale-100'}`}
            onError={handleImageError}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300 ${actualHovered ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h4 className="text-sm font-bold mb-2 line-clamp-2">
                {item.title || item.name}
              </h4>

              <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{(item.vote_average || 0).toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>{new Date(item.release_date || '').getFullYear()}</span>
                {item.runtime && (
                  <>
                    <span>•</span>
                    <span>{Math.floor(item.runtime / 60)}h {item.runtime % 60}m</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {getGenreNames(item.genre_ids).map(genre => (
                  <span key={genre} className="text-xs bg-gray-700/80 px-2 py-1 rounded">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${actualHovered ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="flex gap-3">
              <button className="bg-white/90 text-black rounded-full p-3 hover:bg-white transition hover:scale-110">
                <Play className="w-5 h-5 fill-black" />
              </button>
              <LikeButton
                content={item as Movie | TVShow}
                contentType={type === 'mixed' ? (item.media_type || 'movie') : type}
                variant="icon"
                className="bg-gray-800/90 text-white rounded-full p-3 hover:bg-gray-700 transition hover:scale-110"
                showText={false}
              />
              <button className="bg-gray-800/90 text-white rounded-full p-3 hover:bg-gray-700 transition hover:scale-110">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-2">
            {isNew() && (
              <div className="bg-netflix-red text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                NEW
              </div>
            )}

            {type === 'movie' && index < 10 && (
              <div className="bg-black/80 text-white text-sm font-bold px-2 py-1 rounded backdrop-blur-sm">
                #{index + 1}
              </div>
            )}

            {item.vote_average && item.vote_average >= 8 && (
              <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                TOP RATED
              </div>
            )}
          </div>

          {/* Rating badge */}
          {item.vote_average && (
            <div className="absolute top-2 right-2 bg-black/80 text-white text-sm font-bold px-2 py-1 rounded backdrop-blur-sm">
              {(item.vote_average * 10).toFixed(0)}%
            </div>
          )}
        </div>
      </Link>

      {/* Title below card */}
      <div className="mt-2 px-1">
        <h4 className="text-sm font-semibold line-clamp-2 hover:text-netflix-red transition-colors">
          {item.title || item.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-netflix-lightgray mt-1">
          <span>{new Date(item.release_date || '').getFullYear()}</span>
          <span>•</span>
          <span>{(item.vote_average || 0).toFixed(1)} ★</span>
          {getGenreNames(item.genre_ids)[0] && (
            <>
              <span>•</span>
              <span className="text-netflix-red">{getGenreNames(item.genre_ids)[0]}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
