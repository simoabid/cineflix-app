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
    <div className="min-h-screen bg-[#020205] bg-gradient-to-b from-black/80 via-[#050510] to-[#0A0A1F] overflow-x-hidden">
      {/* Enhanced Hero Section */}
      {heroMovie && (
        <div
          className="relative min-h-screen lg:h-screen overflow-hidden"
          onMouseEnter={() => setIsHeroAutoPlaying(false)}
          onMouseLeave={() => setIsHeroAutoPlaying(true)}
        >
          {/* Background Image - Responsive: Ambient glow for mobile, horizontal backdrop for desktop */}
          <div className="absolute inset-0">
            {/* Mobile/Tablet: Blurred poster for ambient color background */}
            <img
              src={getPosterUrl(heroMovie.poster_path, 'w342')}
              alt=""
              aria-hidden="true"
              className="lg:hidden w-full h-full object-cover scale-110 transition-all duration-1000"
              style={{ filter: 'blur(60px) saturate(1.8) brightness(0.35)' }}
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

            {/* Mobile/Tablet: Dark overlay to keep ambient subtle */}
            <div className="lg:hidden absolute inset-0 bg-black/40"></div>

            {/* Desktop: Original gradient overlays */}
            <div className="hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
          </div>

          {/* Hero Navigation Arrows */}
          {heroMovies.length > 1 && (
            <>
              {/* Desktop arrows */}
              <button
                onClick={prevHero}
                className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
                aria-label="Previous featured movie"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={nextHero}
                className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
                aria-label="Next featured movie"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* ============================================
              MOBILE / TABLET HERO CONTENT (< lg) — Floating Card
              ============================================ */}
          <div className="lg:hidden relative z-10 h-full flex flex-col items-center pt-24 sm:pt-28 px-5 pb-6 overflow-y-auto no-scrollbar">
            {/* Floating Poster Card */}
            <div className="w-[58%] max-w-[220px] sm:max-w-[240px] flex-shrink-0 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <img
                src={getPosterUrl(heroMovie.poster_path, 'w500')}
                alt={heroMovie.title}
                className="w-full rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/10 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                }}
              />
            </div>

            {/* Movie Title Logo */}
            <div className="mb-2 w-[70%] max-w-[240px] sm:max-w-[280px] animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <LogoImage
                logoPath={heroMovie.logo_path}
                title={heroMovie.title}
                size="xl"
                className="justify-center"
                textClassName="text-xl sm:text-2xl font-bold text-center"
                maxHeight="max-h-16 sm:max-h-20"
                contentId={heroMovie.id}
                contentType="movie"
                enableOnDemandFetch={true}
              />
            </div>

            {/* Genre Tags — Netflix-style inline dot-separated */}
            <div className="flex flex-wrap justify-center items-center gap-1.5 mb-3 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              {heroMovie.genres?.slice(0, 3).map((genre, index) => (
                <span key={genre.id} className="flex items-center gap-1.5">
                  {index > 0 && <span className="hero-meta-dot"></span>}
                  <span className="text-xs sm:text-sm font-medium text-white/80">{genre.name}</span>
                </span>
              ))}
            </div>

            {/* Metadata Row */}
            <div className="flex items-center justify-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span className="text-xs font-bold">{formatRating(heroMovie.vote_average)}</span>
              </div>
              <div className="hero-meta-dot"></div>
              <span className="text-xs text-white/60">{new Date(heroMovie.release_date).getFullYear()}</span>
              {getRuntime() && (
                <>
                  <div className="hero-meta-dot"></div>
                  <span className="text-xs text-white/60">{getRuntime()}</span>
                </>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex w-full gap-2.5 max-w-xs mb-3 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <Link
                to={`/watch/movie/${heroMovie.id}`}
                className="hero-watch-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm text-white active:scale-[0.97] transition-transform"
                aria-label={`Watch ${heroMovie.title} now`}
              >
                <Play className="w-4 h-4 fill-current" />
                Play
              </Link>
              <Link
                to={`/movie/${heroMovie.id}`}
                className="hero-glass-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-white active:scale-[0.97] transition-transform"
                aria-label={`More info about ${heroMovie.title}`}
              >
                <Info className="w-4 h-4" />
                More Info
              </Link>
            </div>

            {/* Secondary Actions */}
            <div className="flex justify-center gap-2 w-full max-w-xs animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <AddToListButton
                content={heroMovie}
                contentType="movie"
                variant="button"
                showText={true}
                className="hero-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              />
              <LikeButton
                content={heroMovie}
                contentType="movie"
                variant="button"
                showText={true}
                className="hero-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              />
              <button
                onClick={handleShare}
                className="hero-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                aria-label="Share this movie"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* ============================================
              DESKTOP HERO CONTENT (lg+)
              ============================================ */}
          <div className="hidden lg:flex relative z-10 h-full items-center justify-start">
            <div className="max-w-6xl ml-16 px-8 grid grid-cols-4 gap-12 items-center">
              {/* Movie Poster */}
              <div className="col-span-1 flex justify-start">
                <div>
                  <img
                    src={getPosterUrl(heroMovie.poster_path, 'w500')}
                    alt={heroMovie.title}
                    className="w-full rounded-xl shadow-2xl border-4 border-white/10 hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Movie Info */}
              <div className="col-span-3 space-y-5 pl-8 text-left">
                {/* Title with Logo */}
                <div>
                  <div className="mb-4">
                    <LogoImage
                      logoPath={heroMovie.logo_path}
                      title={heroMovie.title}
                      size="xl"
                      className="justify-start"
                      textClassName="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
                      maxHeight="max-h-28 lg:max-h-32"
                      contentId={heroMovie.id}
                      contentType="movie"
                      enableOnDemandFetch={true}
                    />
                  </div>
                  {heroMovie.tagline && (
                    <p className="text-lg lg:text-xl text-gray-300 italic">
                      "{heroMovie.tagline}"
                    </p>
                  )}
                </div>

                {/* Enhanced Metadata */}
                <div className="flex flex-wrap items-center justify-start gap-6 text-base">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">{formatRating(heroMovie.vote_average)}</span>
                    <span className="text-gray-400">({heroMovie.vote_count?.toLocaleString()} votes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span>{new Date(heroMovie.release_date).getFullYear()}</span>
                  </div>
                  {getRuntime() && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span>{getRuntime()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <span className="truncate max-w-32">{getDirector()}</span>
                  </div>
                </div>

                {/* Enhanced Genres */}
                <div className="flex flex-wrap justify-start gap-3">
                  {heroMovie.genres?.slice(0, 4).map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-netflix-red/20 border border-netflix-red/30 text-netflix-red px-3 py-1.5 rounded-full text-sm font-medium hover:bg-netflix-red/30 transition-colors"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Enhanced Action Buttons */}
                <div className="space-y-4">
                  {/* Primary Actions */}
                  <div className="flex flex-row justify-start gap-4">
                    <Link
                      to={`/watch/movie/${heroMovie.id}`}
                      className="flex items-center justify-center gap-3 bg-netflix-red hover:bg-netflix-red/80 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:scale-105"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>Watch Now</span>
                    </Link>
                    <Link
                      to={`/movie/${heroMovie.id}`}
                      className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    >
                      <Info className="w-6 h-6" />
                      <span>More Info</span>
                    </Link>
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex flex-wrap justify-start gap-3">
                    <AddToListButton
                      content={heroMovie}
                      contentType="movie"
                      variant="button"
                      showText={true}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    />
                    <LikeButton
                      content={heroMovie}
                      contentType="movie"
                      variant="button"
                      showText={true}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    />
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Additional Quick Actions */}
                <div className="flex items-center justify-start space-x-4 pt-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-10 h-10 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-600/50 transition-all duration-300 group border border-white/20 hover:border-white/40"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Film className="w-3 h-3" />
                    <span>Featured Movie</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Navigation Dots */}
          {heroMovies.length > 1 && (
            <>
              {/* Mobile dots - pill indicator style */}
              <div className="lg:hidden absolute bottom-2 md:bottom-36 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm px-3 py-2">
                  {heroMovies.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToHero(index)}
                      aria-label={`Go to featured movie ${index + 1}`}
                      aria-current={index === currentHeroIndex}
                      className={`hero-carousel-dot ${index === currentHeroIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop dots */}
              <div className="hidden lg:block absolute bottom-28 xl:bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-2 border border-white/10">
                  {heroMovies.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToHero(index)}
                      aria-label={`Go to featured movie ${index + 1}`}
                      aria-current={index === currentHeroIndex}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${index === currentHeroIndex
                        ? 'bg-netflix-red scale-110 ring-2 ring-netflix-red/40'
                        : 'bg-white/50 hover:bg-white/70'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </>
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
                title="⭐ Popular on CINEFLIX"
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
