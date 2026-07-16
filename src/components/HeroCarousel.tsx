import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Star, Info } from 'lucide-react';
import { useSmartPlayer } from '../hooks/useSmartPlayer';
import { getImageUrl } from '../services/tmdb';
import LogoImage from './LogoImage';
import AddToListButton from './AddToListButton';

interface HeroItem {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  logo_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  trailerKey?: string;
  runtime?: number;
}

interface HeroCarouselProps {
  items: HeroItem[];
  onTrailerClick: (trailerKey?: string) => void;
  type: 'movie' | 'tv';
}

const formatRuntime = (mins?: number) => {
  if (!mins) return '';
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
};

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onTrailerClick, type }) => {
  const { openPlayer } = useSmartPlayer();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [details, setDetails] = useState<any>(null);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isAutoPlaying && items.length > 1) {
      const interval = setInterval(nextSlide, 8000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, items.length]);

  const currentItem = items[currentIndex];

  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(currentItem?.backdrop_path || currentItem?.poster_path || null);
  const [prevBackdrop, setPrevBackdrop] = useState<string | null>(null);
  const [isCrossFading, setIsCrossFading] = useState(false);

  const currentBackdrop = currentItem?.backdrop_path || currentItem?.poster_path;

  useEffect(() => {
    if (currentBackdrop && currentBackdrop !== activeBackdrop) {
      setPrevBackdrop(activeBackdrop);
      setActiveBackdrop(currentBackdrop);
      setIsCrossFading(true);
      
      const timer = setTimeout(() => {
        setIsCrossFading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentBackdrop, activeBackdrop]);

  // Fetch full details (genres, runtime, seasons count) for the active slide
  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        const { getMovieDetails, getTVShowDetails } = await import('../services/tmdb');
        const data = type === 'movie'
          ? await getMovieDetails(currentItem.id)
          : await getTVShowDetails(currentItem.id);
        
        if (active) {
          setDetails(data);
        }
      } catch (err) {
        console.error('Error fetching details in HeroCarousel:', err);
      }
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [currentItem.id, type]);

  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  if (!items.length) return null;

  const genresList = details?.genres
    ? details.genres.map((g: any) => g.name).join(' • ')
    : '';

  return (
    <div
      className="relative h-[75vh] md:h-[88vh] overflow-hidden bg-black w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Image & Premium Gradients */}
      <div className="absolute inset-0 select-none pointer-events-none">
        <style>{`
          @keyframes bgCrossFade {
            from {
              opacity: 0;
              transform: scale(1.04);
            }
            to {
              opacity: 1;
              transform: scale(1.02);
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

        {/* Previous Image Layer (rendered underneath) — w1280 not original */}
        {prevBackdrop && isCrossFading && (
          <img
            src={getImageUrl(prevBackdrop, 'w1280')}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top md:object-center brightness-[0.95] md:brightness-100"
            decoding="async"
          />
        )}
        
        {/* Current Active Image Layer (fades in on top) */}
        {activeBackdrop && (
          <img
            key={activeBackdrop}
            src={getImageUrl(activeBackdrop, 'w1280')}
            alt={currentItem.title}
            className={`absolute inset-0 w-full h-full object-cover object-top md:object-center brightness-[0.95] md:brightness-100 ${
              isCrossFading ? 'opacity-0 animate-bg-fade' : 'opacity-100'
            }`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageUrl(currentItem.poster_path, 'w780');
            }}
          />
        )}

        {/* Left-to-right gradient to cover the text block area */}
        <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-background-main via-background-main/40 to-transparent z-[2]" />
        {/* Bottom-to-top gradient to fade into the main page content */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background-main via-background-main/20 to-transparent z-[2]" />
        {/* Top-to-bottom dark gradient for header overlay readability */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/50 to-transparent z-[2]" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end z-[3]">
        <div className="w-full max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 pb-12 md:pb-20 text-left">
          <div key={currentIndex} className="max-w-2xl space-y-4 md:space-y-6">
            
            {/* Logo or Title */}
            <div className="transform -translate-x-1.5 animate-hero-fade delay-100">
              <LogoImage
                logoPath={currentItem.logo_path}
                title={currentItem.title}
                size="lg"
                className="justify-start text-left"
                textClassName="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white"
                maxHeight="max-h-16 md:max-h-24 lg:max-h-28"
                contentId={currentItem.id}
                contentType={type}
                enableOnDemandFetch={true}
              />
            </div>

            {/* Genres List */}
            {genresList && (
              <div className="text-xs sm:text-sm font-semibold tracking-wider text-gray-300 flex items-center gap-2 animate-hero-fade delay-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000]" />
                {genresList}
              </div>
            )}

            {/* Actions Row */}
            <div className="flex items-center gap-3 pt-2 animate-hero-fade delay-300">
              <button
                onClick={() => openPlayer({ tmdbId: currentItem.id, type })}
                className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-6 sm:px-8 py-3 rounded-full transition-all hover:scale-105 active:scale-95 font-bold text-sm sm:text-base shadow-lg shadow-black/20"
                aria-label={`Watch ${currentItem.title} now`}
              >
                <Play className="w-5 h-5 fill-current" />
                Play
              </button>
              
              {/* Circular Action Buttons */}
              <AddToListButton
                content={currentItem as any}
                contentType={type}
                variant="icon"
                showText={false}
                className="!w-12 !h-12 !p-0 rounded-full border border-white/30 bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md hover:border-white"
              />

              <button
                onClick={() => onTrailerClick(currentItem.trailerKey)}
                className="w-12 h-12 rounded-full border border-white/30 bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md hover:border-white"
                title="Watch Trailer"
              >
                <Play className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={() => navigate(`/${type}/${currentItem.id}`)}
                className="w-12 h-12 rounded-full border border-white/30 bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md hover:border-white"
                title="View Info"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-gray-300 animate-hero-fade delay-400">
              {/* Year */}
              <span className="text-white">
                {(currentItem.release_date || currentItem.first_air_date)?.split('-')[0]}
              </span>
              <span>•</span>
              
              {/* Duration or Seasons */}
              <span>
                {type === 'movie' 
                  ? formatRuntime(details?.runtime || currentItem.runtime)
                  : details?.number_of_seasons
                    ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}`
                    : '1 Season'
                }
              </span>
              <span>•</span>

              {/* HD/4K Badges */}
              <span className="px-1.5 py-0.5 rounded border border-white/30 text-[10px] sm:text-[11px] font-extrabold tracking-widest bg-black/30">
                HDR
              </span>
              
              <span className="px-1.5 py-0.5 rounded border border-white/30 text-[10px] sm:text-[11px] font-extrabold tracking-widest bg-black/30">
                5.1
              </span>

              {/* Rating */}
              <div className="flex items-center gap-1 text-yellow-500 font-bold ml-1">
                <Star className="w-4 h-4 fill-current" />
                <span>{currentItem.vote_average.toFixed(1)}</span>
              </div>
            </div>

            {/* Overview / Description */}
            <p className="text-gray-300/90 text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-3 font-medium animate-hero-fade delay-500">
              {currentItem.overview}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/30 shadow-xl hover:scale-105 active:scale-95 z-[4]"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/30 shadow-xl hover:scale-105 active:scale-95 z-[4]"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Navigation Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 md:right-12 flex gap-2 items-center z-[4] bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10 shadow-lg">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`relative h-2 rounded-full transition-all duration-300 focus:outline-none ${
                index === currentIndex 
                  ? 'w-10 bg-white/20 overflow-hidden' 
                  : 'w-2 bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              {index === currentIndex && (
                <div 
                  key={currentIndex}
                  className="absolute top-0 left-0 h-full w-full bg-buttons-purple rounded-full origin-left animate-dot-fill"
                  style={{
                    animationPlayState: isAutoPlaying ? 'running' : 'paused'
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
