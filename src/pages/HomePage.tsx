import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useSmartPlayer } from '../hooks/useSmartPlayer';
import {
  Play,
  Info,
  Star,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-react';
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getTrendingTVShows,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getMovieDetails,
  getMovieCredits,
  getImageUrl,
  getPosterUrl,
  getBackdropUrl
} from '../services/tmdb';
import LogoImage from '../components/LogoImage';
import { Movie, TVShow, MovieCredits } from '../types';
import AddToListButton from '../components/AddToListButton';
import LikeButton from '../components/LikeButton';
import ContentCarousel from '../components/ContentCarousel';
import LazySection from '../components/LazySection';
import { SEOHead } from '../components/layout/SEOHead';

import ContinueWatching from '../components/Home/ContinueWatching';

// Below-the-fold home sections — code-split so they don't block first paint
const BrowseByGenre = lazy(() => import('../components/Home/BrowseByGenre'));
const PlatformsSection = lazy(() => import('../components/Home/PlatformsSection'));

interface TypeToggleProps {
  readonly selected: 'movie' | 'tv';
  readonly onChange: (type: 'movie' | 'tv') => void;
}

const TypeToggle: React.FC<TypeToggleProps> = ({ selected, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-[#121216]/80 border border-white/5 p-1 rounded-xl w-fit shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      <button
        onClick={() => onChange('movie')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          selected === 'movie'
            ? 'bg-[#1e1e26] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
        }`}
      >
        Movies
      </button>
      <button
        onClick={() => onChange('tv')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          selected === 'tv'
            ? 'bg-[#1e1e26] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
        }`}
      >
        TV Shows
      </button>
    </div>
  );
};

const HomePage = (): JSX.Element => {
  const { openPlayer } = useSmartPlayer();
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [heroCredits, setHeroCredits] = useState<MovieCredits | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHeroAutoPlaying, setIsHeroAutoPlaying] = useState(true);

  // States for cinema crossfade transitions
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null);
  const [prevBackdrop, setPrevBackdrop] = useState<string | null>(null);
  const [activePoster, setActivePoster] = useState<string | null>(null);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);
  const [isCrossFading, setIsCrossFading] = useState(false);

  const currentBackdrop = heroMovie?.backdrop_path || heroMovie?.poster_path;
  const currentPoster = heroMovie?.poster_path;

  useEffect(() => {
    if (currentBackdrop) {
      if (activeBackdrop && currentBackdrop !== activeBackdrop) {
        setPrevBackdrop(activeBackdrop);
        setIsCrossFading(true);
        const timer = setTimeout(() => setIsCrossFading(false), 1000);
        setActiveBackdrop(currentBackdrop);
        if (currentPoster) {
          setPrevPoster(activePoster);
          setActivePoster(currentPoster);
        }
        return () => clearTimeout(timer);
      } else if (!activeBackdrop) {
        setActiveBackdrop(currentBackdrop);
        if (currentPoster) {
          setActivePoster(currentPoster);
        }
      }
    }
  }, [currentBackdrop, activeBackdrop, currentPoster, activePoster]);

  // Content Types
  const [trendingType, setTrendingType] = useState<'movie' | 'tv'>('movie');
  const [popularType, setPopularType] = useState<'movie' | 'tv'>('movie');
  const [topRatedType, setTopRatedType] = useState<'movie' | 'tv'>('movie');
  const [nowPlayingType, setNowPlayingType] = useState<'movie' | 'tv'>('movie');

  // TV Show Lists
  const [trendingTVShows, setTrendingTVShows] = useState<TVShow[]>([]);
  const [popularTVShows, setPopularTVShows] = useState<TVShow[]>([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState<TVShow[]>([]);
  const [nowPlayingTVShows, setNowPlayingTVShows] = useState<TVShow[]>([]);

  // Section Loading states
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isPopularLoading, setIsPopularLoading] = useState(false);
  const [isTopRatedLoading, setIsTopRatedLoading] = useState(false);
  const [isNowPlayingLoading, setIsNowPlayingLoading] = useState(false);
  const [secondaryRowsLoaded, setSecondaryRowsLoaded] = useState(false);

  const handleToggleSection = async (section: 'trending' | 'popular' | 'topRated' | 'nowPlaying', type: 'movie' | 'tv'): Promise<void> => {
    if (section === 'trending') {
      setTrendingType(type);
      if (type === 'tv' && trendingTVShows.length === 0) {
        setIsTrendingLoading(true);
        try {
          const response = await getTrendingTVShows();
          setTrendingTVShows(response.results.slice(0, 16));
        } catch (error) {
          console.error('Error fetching trending TV shows:', error);
        } finally {
          setIsTrendingLoading(false);
        }
      }
    } else if (section === 'popular') {
      setPopularType(type);
      if (type === 'tv' && popularTVShows.length === 0) {
        setIsPopularLoading(true);
        try {
          const response = await getPopularTVShows();
          setPopularTVShows(response.results.slice(0, 16));
        } catch (error) {
          console.error('Error fetching popular TV shows:', error);
        } finally {
          setIsPopularLoading(false);
        }
      }
    } else if (section === 'topRated') {
      setTopRatedType(type);
      if (type === 'tv' && topRatedTVShows.length === 0) {
        setIsTopRatedLoading(true);
        try {
          const response = await getTopRatedTVShows();
          setTopRatedTVShows(response.results.slice(0, 16));
        } catch (error) {
          console.error('Error fetching top rated TV shows:', error);
        } finally {
          setIsTopRatedLoading(false);
        }
      }
    } else if (section === 'nowPlaying') {
      setNowPlayingType(type);
      if (type === 'tv' && nowPlayingTVShows.length === 0) {
        setIsNowPlayingLoading(true);
        try {
          const response = await getAiringTodayTVShows();
          setNowPlayingTVShows(response.results.slice(0, 16));
        } catch (error) {
          console.error('Error fetching now playing TV shows:', error);
        } finally {
          setIsNowPlayingLoading(false);
        }
      }
    }
  };

  /** Critical path: hero + trending only — paint ASAP */
  useEffect(() => {
    const fetchCritical = async () => {
      try {
        setLoading(true);

        const trendingResponse = await getTrendingMovies();
        if (trendingResponse.results.length > 0) {
          // Fewer hero slides = fewer detail/credits round-trips while rotating
          const heroMoviesList = trendingResponse.results.slice(0, 6);
          setHeroMovies(heroMoviesList);

          const firstHeroMovie = heroMoviesList[0];
          const [movieDetails, movieCredits] = await Promise.all([
            getMovieDetails(firstHeroMovie.id),
            getMovieCredits(firstHeroMovie.id)
          ]);

          setHeroMovie(movieDetails);
          setHeroCredits(movieCredits);
          setTrendingMovies(trendingResponse.results.slice(5, 18));
        }
      } catch (error) {
        console.error('Error fetching critical home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCritical();
  }, []);

  /** Secondary rows: idle / after first paint so they don't compete with hero images */
  const loadSecondaryRows = useCallback(async () => {
    if (secondaryRowsLoaded) return;
    setSecondaryRowsLoaded(true);
    try {
      const [popularResponse, topRatedResponse, nowPlayingResponse] = await Promise.all([
        getPopularMovies(),
        getTopRatedMovies(),
        getNowPlayingMovies(),
      ]);

      setPopularMovies(popularResponse.results.slice(0, 16));
      setTopRatedMovies(topRatedResponse.results.slice(0, 16));
      setNowPlayingMovies(nowPlayingResponse.results.slice(0, 16));
    } catch (error) {
      console.error('Error fetching secondary home rows:', error);
      setSecondaryRowsLoaded(false);
    }
  }, [secondaryRowsLoaded]);

  useEffect(() => {
    if (loading) return;

    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 1500 })
        : (cb: () => void) => window.setTimeout(cb, 200);

    const cancel =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (id: number) => window.cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    const id = schedule(() => {
      void loadSecondaryRows();
    }) as number;

    return () => cancel(id);
  }, [loading, loadSecondaryRows]);

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
      <div className="min-h-screen bg-background-main bg-gradient-to-b from-black/80 via-black/60 to-background-main flex items-center justify-center">
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
    <div className="min-h-screen bg-background-main bg-gradient-to-b from-black/80 via-black/60 to-background-main" style={{ overflowX: 'clip' }}>
      <SEOHead
        title="Home"
        description="Discover and stream movies and TV shows with a premium cinema experience on CINEFLIX."
      />
      {/* Enhanced Hero Section */}
      {heroMovie && (
        <div
          className="relative min-h-screen md:h-screen overflow-hidden"
          onMouseEnter={() => setIsHeroAutoPlaying(false)}
          onMouseLeave={() => setIsHeroAutoPlaying(true)}
        >
          {/* Background Image - Responsive: Ambient glow for mobile, horizontal backdrop for desktop */}
          <div className="absolute inset-0 select-none pointer-events-none">
            <style>{`
              @keyframes bgCrossFade {
                from {
                  opacity: 0;
                  transform: scale(1.04);
                }
                to {
                  opacity: 1;
                  transform: scale(1.01);
                }
              }
              .animate-bg-fade {
                animation: bgCrossFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              @keyframes heroFadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .animate-hero-fade {
                animation: heroFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                opacity: 0;
              }
              .delay-100 { animation-delay: 100ms; }
              .delay-200 { animation-delay: 200ms; }
              .delay-300 { animation-delay: 300ms; }
              .delay-350 { animation-delay: 350ms; }
              .delay-400 { animation-delay: 400ms; }
              .delay-500 { animation-delay: 500ms; }
              @keyframes activeDotFill {
                from { transform: scaleX(0); }
                to { transform: scaleX(1); }
              }
              .animate-dot-fill {
                animation: activeDotFill 8s linear forwards;
                transform-origin: left;
              }
            `}</style>

            {/* Mobile/Tablet: Blurred poster for ambient color glow (not a readable poster behind the card) */}
            {prevPoster && (
              <img
                src={getPosterUrl(prevPoster, 'w342')}
                alt=""
                aria-hidden="true"
                className="md:hidden absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: 'blur(60px) saturate(1.8) brightness(0.35)' }}
              />
            )}
            {activePoster && (
              <img
                key={`mobile-${activePoster}`}
                src={getPosterUrl(activePoster, 'w342')}
                alt=""
                aria-hidden="true"
                className={`md:hidden absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-1000 ${
                  isCrossFading ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ filter: 'blur(60px) saturate(1.8) brightness(0.35)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                }}
              />
            )}

            {/* Desktop: w1280 is enough for full-bleed hero (original can be 5MB+) */}
            {prevBackdrop && isCrossFading && (
              <img
                src={getBackdropUrl(prevBackdrop, 'w1280')}
                alt=""
                className="hidden md:block absolute inset-0 w-full h-full object-cover brightness-[0.95] md:brightness-100"
                decoding="async"
              />
            )}
            {activeBackdrop && (
              <img
                key={`desktop-${activeBackdrop}`}
                src={getBackdropUrl(activeBackdrop, 'w1280')}
                alt={heroMovie.title}
                className={`hidden md:block absolute inset-0 w-full h-full object-cover brightness-[0.95] md:brightness-100 ${
                  isCrossFading ? 'opacity-0 animate-bg-fade' : 'opacity-100'
                }`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getImageUrl(heroMovie.poster_path, 'w780');
                }}
              />
            )}

            {/* Mobile/Tablet: Dark overlay to keep ambient subtle */}
            <div className="md:hidden absolute inset-0 bg-black/40"></div>

            {/* Desktop: Original gradient overlays */}
            <div className="hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-[2]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-[2]"></div>
            </div>
          </div>

          {/* Hero Navigation Arrows */}
          {heroMovies.length > 1 && (
            <>
              {/* Desktop arrows */}
              <button
                onClick={prevHero}
                className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
                aria-label="Previous featured movie"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={nextHero}
                className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm p-3 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 shadow-xl hover:scale-110"
                aria-label="Next featured movie"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* ============================================
              MOBILE / TABLET HERO CONTENT (< md) — Floating Card
              ============================================ */}
          <div key={`mobile-content-${currentHeroIndex}`} className="md:hidden relative z-10 h-full flex flex-col items-center pt-24 sm:pt-28 px-5 pb-6 no-scrollbar">
            {/* Floating Poster Card */}
            <div className="w-[58%] max-w-[220px] sm:max-w-[240px] flex-shrink-0 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <img
                src={getPosterUrl(heroMovie.poster_path, 'w342')}
                alt={heroMovie.title}
                className="w-full rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/10"
                loading="eager"
                decoding="async"
                fetchPriority="high"
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
              <button
                onClick={() => openPlayer({ tmdbId: heroMovie.id, type: 'movie' })}
                className="hero-watch-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm text-white active:scale-[0.97] transition-transform"
                aria-label={`Watch ${heroMovie.title} now`}
              >
                <Play className="w-4 h-4 fill-current" />
                Play
              </button>
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
            {heroMovies.length > 1 && (
              <div className="mt-5 flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-2 flex-shrink-0 animate-fade-in-up border border-white/10 shadow-lg" style={{ animationDelay: '0.55s', animationFillMode: 'both' }}>
                {heroMovies.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToHero(index)}
                    aria-label={`Go to featured movie ${index + 1}`}
                    aria-current={index === currentHeroIndex}
                    className={`relative h-2 rounded-full transition-all duration-300 focus:outline-none ${
                      index === currentHeroIndex 
                        ? 'w-10 bg-white/20 overflow-hidden' 
                        : 'w-2 bg-white/40 hover:bg-white/80'
                    }`}
                  >
                    {index === currentHeroIndex && (
                      <div 
                        key={currentHeroIndex}
                        className="absolute top-0 left-0 h-full w-full bg-buttons-purple rounded-full origin-left animate-dot-fill"
                        style={{
                          animationPlayState: isHeroAutoPlaying ? 'running' : 'paused'
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ============================================
              DESKTOP HERO CONTENT (md+)
              ============================================ */}
          <div className="hidden md:flex relative z-10 h-full items-center justify-start">
            <div key={`desktop-content-${currentHeroIndex}`} className="max-w-6xl ml-16 px-8 grid grid-cols-4 gap-12 items-center">
              {/* Movie Poster */}
              <div className="col-span-1 flex justify-start animate-hero-fade delay-100">
                <div>
                  <img
                    src={getPosterUrl(heroMovie.poster_path, 'w500')}
                    alt={heroMovie.title}
                    className="w-full rounded-xl shadow-2xl border-4 border-white/10 hover:scale-105 transition-transform duration-300"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Movie Info */}
              <div className="col-span-3 space-y-5 pl-8 text-left">
                {/* Title with Logo */}
                <div className="animate-hero-fade delay-200">
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
                <div className="flex flex-wrap items-center justify-start gap-6 text-base animate-hero-fade delay-300">
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
                <div className="flex flex-wrap justify-start gap-3 animate-hero-fade delay-350">
                  {heroMovie.genres?.slice(0, 4).map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-buttons-purple/20 border border-buttons-purple/30 text-type-logo px-3 py-1.5 rounded-full text-sm font-medium hover:bg-buttons-purple/30 transition-colors"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Enhanced Action Buttons */}
                <div className="space-y-4 animate-hero-fade delay-400">
                  {/* Primary Actions */}
                  <div className="flex flex-row justify-start gap-4">
                    <button
                      onClick={() => openPlayer({ tmdbId: heroMovie.id, type: 'movie' })}
                      className="flex items-center justify-center gap-3 bg-buttons-purple hover:bg-buttons-purple/80 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:scale-105"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>Watch Now</span>
                    </button>
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
              </div>
            </div>
          </div>

          {/* Hero Navigation Dots */}
          {heroMovies.length > 1 && (
            /* Desktop dots */
            <div className="hidden md:block absolute bottom-36 xl:bottom-40 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-2 border border-white/10 shadow-lg">
                {heroMovies.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToHero(index)}
                    aria-label={`Go to featured movie ${index + 1}`}
                    aria-current={index === currentHeroIndex}
                    className={`relative h-2 rounded-full transition-all duration-300 focus:outline-none ${
                      index === currentHeroIndex 
                        ? 'w-10 bg-white/20 overflow-hidden' 
                        : 'w-2 bg-white/40 hover:bg-white/80'
                    }`}
                  >
                    {index === currentHeroIndex && (
                      <div 
                        key={currentHeroIndex}
                        className="absolute top-0 left-0 h-full w-full bg-buttons-purple rounded-full origin-left animate-dot-fill"
                        style={{
                          animationPlayState: isHeroAutoPlaying ? 'running' : 'paused'
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Carousels — staggered mount; only near-viewport rows hydrate cards */}
      <div className="relative mt-8 sm:mt-12 md:-mt-32 z-10">
        <div className="space-y-10 pb-6">
          <LazySection minHeight={200} rootMargin="80px 0px" aria-label="Continue watching">
            <ContinueWatching />
          </LazySection>

          {(trendingMovies.length > 0 || trendingTVShows.length > 0) && (
            <ContentCarousel
              title="🔥 Trending Now"
              items={trendingType === 'movie' ? trendingMovies : trendingTVShows}
              type={trendingType}
              loading={isTrendingLoading}
              eager
              headerAction={
                <TypeToggle
                  selected={trendingType}
                  onChange={(type) => handleToggleSection('trending', type)}
                />
              }
            />
          )}

          <LazySection
            minHeight={340}
            rootMargin="160px 0px"
            onActivate={loadSecondaryRows}
            aria-label="Popular titles"
          >
            <ContentCarousel
              title="⭐ Popular on CINEFLIX"
              items={popularType === 'movie' ? popularMovies : popularTVShows}
              type={popularType}
              loading={isPopularLoading || (!secondaryRowsLoaded && popularMovies.length === 0)}
              headerAction={
                <TypeToggle
                  selected={popularType}
                  onChange={(type) => handleToggleSection('popular', type)}
                />
              }
            />
          </LazySection>

          <LazySection minHeight={340} rootMargin="160px 0px" aria-label="Top rated titles">
            <ContentCarousel
              title="🏆 Top Rated"
              items={topRatedType === 'movie' ? topRatedMovies : topRatedTVShows}
              type={topRatedType}
              loading={isTopRatedLoading || (!secondaryRowsLoaded && topRatedMovies.length === 0)}
              headerAction={
                <TypeToggle
                  selected={topRatedType}
                  onChange={(type) => handleToggleSection('topRated', type)}
                />
              }
            />
          </LazySection>

          <LazySection minHeight={340} rootMargin="160px 0px" aria-label="Now playing titles">
            <ContentCarousel
              title="🎬 Now Playing"
              items={nowPlayingType === 'movie' ? nowPlayingMovies : nowPlayingTVShows}
              type={nowPlayingType}
              loading={isNowPlayingLoading || (!secondaryRowsLoaded && nowPlayingMovies.length === 0)}
              headerAction={
                <TypeToggle
                  selected={nowPlayingType}
                  onChange={(type) => handleToggleSection('nowPlaying', type)}
                />
              }
            />
          </LazySection>

          <LazySection minHeight={420} rootMargin="120px 0px" aria-label="Browse by genre">
            <Suspense fallback={<div className="h-[420px] animate-pulse rounded-xl bg-white/[0.03]" />}>
              <BrowseByGenre />
            </Suspense>
          </LazySection>

          <LazySection minHeight={200} rootMargin="100px 0px" aria-label="Streaming platforms">
            <Suspense fallback={<div className="h-[200px] animate-pulse rounded-xl bg-white/[0.03]" />}>
              <PlatformsSection />
            </Suspense>
          </LazySection>
        </div>
      </div>
    </div>
  );
};

export { HomePage as default };
