import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Info,
  Volume2,
  VolumeX,
  Star,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Share2,
  Film
} from 'lucide-react';
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getMovieDetails,
  getMovieCredits,
  getImageUrl,
  getPosterUrl,
  getBackdropUrl
} from '../services/tmdb';
import LogoImage from '../components/LogoImage';
import { Movie, MovieCredits } from '../types';
import AddToListButton from '../components/AddToListButton';
import LikeButton from '../components/LikeButton';
import ContentCarousel from '../components/ContentCarousel';
import GenreCollections from '../components/GenreCollections';
import ContinueWatching from '../components/Home/ContinueWatching';

const HomePage = (): JSX.Element => {
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [heroCredits, setHeroCredits] = useState<MovieCredits | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHeroAutoPlaying, setIsHeroAutoPlaying] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trending movies for hero rotation
        const trendingResponse = await getTrendingMovies();
        if (trendingResponse.results.length > 0) {
          const heroMoviesList = trendingResponse.results.slice(0, 12); // Use top 12 for hero rotation
          setHeroMovies(heroMoviesList);

          // Fetch detailed info for the first hero movie
          const firstHeroMovie = heroMoviesList[0];
          const [movieDetails, movieCredits] = await Promise.all([
            getMovieDetails(firstHeroMovie.id),
            getMovieCredits(firstHeroMovie.id)
          ]);

          setHeroMovie(movieDetails);
          setHeroCredits(movieCredits);
          setTrendingMovies(trendingResponse.results.slice(5, 20)); // Use original slice for carousel (15 movies like original)
        }

        // Fetch other categories
        const [popularResponse, topRatedResponse, nowPlayingResponse] = await Promise.all([
          getPopularMovies(),
          getTopRatedMovies(),
          getNowPlayingMovies(),
        ]);

        setPopularMovies(popularResponse.results.slice(0, 20));
        setTopRatedMovies(topRatedResponse.results.slice(0, 20));
        setNowPlayingMovies(nowPlayingResponse.results.slice(0, 20));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hero auto-play functionality
  useEffect(() => {
    if (isHeroAutoPlaying && heroMovies.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % heroMovies.length);
      }, 10000); // Change every 10 seconds (increased for more movies)
      return () => clearInterval(interval);
    }
  }, [isHeroAutoPlaying, heroMovies.length]);

  // Update hero movie when index changes
  useEffect(() => {
    const updateHeroMovie = async () => {
      if (heroMovies.length > 0 && heroMovies[currentHeroIndex]) {
        try {
          const [movieDetails, movieCredits] = await Promise.all([
            getMovieDetails(heroMovies[currentHeroIndex].id),
            getMovieCredits(heroMovies[currentHeroIndex].id)
          ]);
          setHeroMovie(movieDetails);
          setHeroCredits(movieCredits);
        } catch (error) {
          console.error('Error fetching hero movie details:', error);
        }
      }
    };

    updateHeroMovie();
  }, [currentHeroIndex, heroMovies]);

  // Helper functions
  const getDirector = () => {
    if (!heroCredits) return 'Unknown';
    const director = heroCredits.crew.find(member => member.job === 'Director');
    return director ? director.name : 'Unknown';
  };

  const formatRating = (rating: number) => {
    return Math.round(rating * 10) / 10;
  };

  const getRuntime = () => {
    if (!heroMovie?.runtime) return '';
    const hours = Math.floor(heroMovie.runtime / 60);
    const minutes = heroMovie.runtime % 60;
    return `${hours}h ${minutes}m`;
  };

  const nextHero = () => {
    setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % heroMovies.length);
    setIsHeroAutoPlaying(false);
  };

  const prevHero = () => {
    setCurrentHeroIndex((prevIndex) => (prevIndex - 1 + heroMovies.length) % heroMovies.length);
    setIsHeroAutoPlaying(false);
  };

  const goToHero = (index: number) => {
    setCurrentHeroIndex(index);
    setIsHeroAutoPlaying(false);
  };

  const handleShare = () => {
    if (navigator.share && heroMovie) {
      navigator.share({
        title: heroMovie.title,
        text: heroMovie.overview,
        url: `${window.location.origin}/movie/${heroMovie.id}`,
      });
    } else if (heroMovie) {
      navigator.clipboard.writeText(`${window.location.origin}/movie/${heroMovie.id}`);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] bg-gradient-to-b from-black/80 via-[#050510] to-[#0A0A1F] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#020205] bg-gradient-to-b from-black/80 via-[#050510] to-[#0A0A1F]">
      {/* Enhanced Hero Section */}
      {heroMovie && (
        <div
          className="relative h-screen"
          onMouseEnter={() => setIsHeroAutoPlaying(false)}
          onMouseLeave={() => setIsHeroAutoPlaying(true)}
        >
          {/* Background Image - Responsive: Vertical poster for mobile/tablet, horizontal backdrop for desktop */}
          <div className="absolute inset-0">
            {/* Mobile/Tablet: Vertical Poster */}
            <img
              src={getPosterUrl(heroMovie.poster_path, 'w780')}
              alt={heroMovie.title}
              className="lg:hidden w-full h-full object-cover transition-all duration-1000"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
              }}
            />
            {/* Desktop: Horizontal Backdrop */}
            <img
              src={getBackdropUrl(heroMovie.backdrop_path, 'original')}
              alt={heroMovie.title}
              className="hidden lg:block w-full h-full object-cover transition-all duration-1000"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getImageUrl(heroMovie.poster_path, 'original');
              }}
            />
            {/* Left-to-right gradient - Reduced for mobile/tablet */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 sm:from-black/60 md:from-black/80 lg:from-black via-black/20 sm:via-black/40 md:via-black/60 lg:via-black/80 to-transparent"></div>
            {/* Bottom-to-top gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
          </div>

          {/* Hero Navigation */}
          {heroMovies.length > 1 && (
            <>
              <button
                onClick={prevHero}
                className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </button>

              <button
                onClick={nextHero}
                className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </button>
            </>
          )}

          {/* Hero Content */}
          <div className="relative z-10 h-full flex items-end md:items-center justify-start">
            <div className="max-w-6xl ml-4 md:ml-8 lg:ml-16 px-4 lg:px-8 pb-20 sm:pb-6 md:pb-0 grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12 items-center">
              {/* Movie Poster - Hidden on mobile and small screens */}
              <div className="hidden lg:flex lg:col-span-1 justify-start">
                <div className="max-w-xs lg:max-w-none">
                  <img
                    src={getPosterUrl(heroMovie.poster_path, 'w500')}
                    alt={heroMovie.title}
                    className="w-56 lg:w-full rounded-xl shadow-2xl border-4 border-white/10 hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Movie Info - Full width on mobile, 3/4 width on desktop */}
              <div className="col-span-1 lg:col-span-3 space-y-3 md:space-y-5 lg:pl-8 text-left">
                {/* Title with Logo */}
                <div>
                  <div className="mb-2 md:mb-4">
                    <LogoImage
                      logoPath={heroMovie.logo_path}
                      title={heroMovie.title}
                      size="xl"
                      className="justify-start"
                      textClassName="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
                      maxHeight="max-h-20 md:max-h-28 lg:max-h-32"
                      contentId={heroMovie.id}
                      contentType="movie"
                      enableOnDemandFetch={true}
                    />
                  </div>
                  {heroMovie.tagline && (
                    <p className="text-base md:text-lg lg:text-xl text-gray-300 italic">
                      "{heroMovie.tagline}"
                    </p>
                  )}
                </div>

                {/* Enhanced Metadata */}
                <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm lg:text-base">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">{formatRating(heroMovie.vote_average)}</span>
                    <span className="text-gray-400 hidden sm:inline">({heroMovie.vote_count?.toLocaleString()} votes)</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                    <span>{new Date(heroMovie.release_date).getFullYear()}</span>
                  </div>
                  {getRuntime() && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                      <span>{getRuntime()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 sm:gap-2 hidden md:flex">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                    <span className="truncate max-w-32">{getDirector()}</span>
                  </div>
                </div>

                {/* Enhanced Genres */}
                <div className="flex flex-wrap justify-start gap-3">
                  {heroMovie.genres?.slice(0, 4).map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-netflix-red/20 border border-netflix-red/30 text-netflix-red px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium hover:bg-netflix-red/30 transition-colors"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Enhanced Action Buttons */}
                <div className="space-y-3 md:space-y-4">
                  {/* Primary Actions */}
                  <div className="flex flex-col sm:flex-row justify-start gap-3 sm:gap-4">
                    <Link
                      to={`/movie/${heroMovie.id}`}
                      className="flex items-center justify-center gap-2 sm:gap-3 bg-netflix-red hover:bg-netflix-red/80 px-6 sm:px-8 py-3 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-xl hover:scale-105 w-full sm:w-auto"
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                      <span>Watch Now</span>
                    </Link>

                    <Link
                      to={`/movie/${heroMovie.id}`}
                      className="flex items-center justify-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 sm:px-8 py-3 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105 w-full sm:w-auto"
                    >
                      <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>More Info</span>
                    </Link>
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex flex-wrap justify-start gap-2 sm:gap-3 mb-16 sm:mb-0">
                    <AddToListButton
                      content={heroMovie}
                      contentType="movie"
                      variant="button"
                      showText={true}
                      className="flex items-center gap-1 sm:gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    />

                    <LikeButton
                      content={heroMovie}
                      contentType="movie"
                      variant="button"
                      showText={true}
                      className="flex items-center gap-1 sm:gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    />

                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1 sm:gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    >
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Additional Quick Actions */}
                <div className="hidden sm:flex items-center justify-start space-x-3 sm:space-x-4 pt-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-600/50 transition-all duration-300 group border border-white/20 hover:border-white/40"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    )}
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-400">
                    <Film className="w-3 h-3" />
                    <span className="hidden sm:inline">Featured Movie</span>
                    <span className="sm:hidden">Featured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Navigation Dots */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-2 sm:bottom-6 md:bottom-24 lg:bottom-28 xl:bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/40 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 border border-white/10">
                {heroMovies.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToHero(index)}
                    aria-label={`Go to featured movie ${index + 1}`}
                    aria-current={index === currentHeroIndex}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${index === currentHeroIndex
                      ? 'bg-netflix-red scale-110 ring-2 ring-netflix-red/40'
                      : 'bg-white/50 hover:bg-white/70'
                      }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Carousels */}
      <div className="relative mt-8 sm:mt-12 md:-mt-32 z-10">
        <div className="space-y-6 pb-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <ContinueWatching />
          </div>

          {trendingMovies.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <ContentCarousel
                title="🔥 Trending Now"
                items={trendingMovies}
                type="movie"
              />
            </div>
          )}

          {popularMovies.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <ContentCarousel
                title="⭐ Popular on CineFlix"
                items={popularMovies}
                type="movie"
              />
            </div>
          )}

          {topRatedMovies.length > 0 && (
            <div className="-mt-32 animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
              <ContentCarousel
                title="🏆 Top Rated"
                items={topRatedMovies}
                type="movie"
              />
            </div>
          )}

          {nowPlayingMovies.length > 0 && (
            <div className="-mt-32 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
              <ContentCarousel
                title="🎬 Now Playing"
                items={nowPlayingMovies}
                type="movie"
              />
            </div>
          )}

          {/* Genre Collections - Now available on Browse page */}
          {/* Commented out to avoid duplication - can be restored if needed */}
          {/* 
          <div className="-mt-32 animate-fade-in-up" style={{ animationDelay: '1.0s', animationFillMode: 'both' }}>
            <GenreCollections />
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

export { HomePage as default };
