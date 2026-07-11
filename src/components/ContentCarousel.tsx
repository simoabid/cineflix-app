import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, TVShow } from '../types';
import ContentCard from './ContentCard';

interface ContentCarouselProps {
  title: string;
  items: (Movie | TVShow)[];
  type: 'movie' | 'tv';
  loading?: boolean;
  headerAction?: React.ReactNode;
}

interface ContentCarouselItemsProps {
  items: (Movie | TVShow)[];
  type: 'movie' | 'tv';
  cardsLoaded: boolean;
  section?: string;
}

interface ScrollSliderProps {
  scrollProgress: number;
  onChange: (progress: number) => void;
  visible: boolean;
}

const ContentCarouselItems = React.memo<ContentCarouselItemsProps>(({ items, type, cardsLoaded, section }) => (
  <>
    {items.map((item) => (
      <div
        key={item.id}
        className={`transition-opacity duration-300 carousel-item ${cardsLoaded ? 'opacity-100' : 'opacity-0'
          }`}
      >
        <ContentCard
          item={item}
          mediaType={type}
          size="sm"
          showTitleBelow={true}
          className="cursor-pointer"
          section={section}
        />
      </div>
    ))}
  </>
));

ContentCarouselItems.displayName = 'ContentCarouselItems';

const ScrollSlider = React.memo<ScrollSliderProps>(({ scrollProgress, onChange, visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="mt-4 mb-2 flex justify-center items-center w-full">
      <div className="w-48 sm:w-64 relative flex items-center group">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={scrollProgress}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none transition-all duration-300
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-2
            [&::-webkit-slider-thumb]:w-10
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#E50914]
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-200
            [&::-moz-range-thumb]:h-2
            [&::-moz-range-thumb]:w-10
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#E50914]
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:duration-200
            hover:[&::-webkit-slider-thumb]:bg-red-500
            hover:[&::-moz-range-thumb]:bg-red-500"
          aria-label="Carousel scroll progress"
        />
      </div>
    </div>
  );
});

ScrollSlider.displayName = 'ScrollSlider';

const ContentCarousel: React.FC<ContentCarouselProps> = ({
  title,
  items,
  type,
  loading = false,
  headerAction
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollFrame = useRef<number>();
  const lastScrollState = useRef({
    canScrollLeft: false,
    canScrollRight: true,
    scrollProgress: 0
  });

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;
    const newCanScrollLeft = scrollLeft > 0;
    const newCanScrollRight = scrollLeft < maxScroll - 10;
    const rawProgress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    const clampedProgress = Math.min(Math.max(rawProgress, 0), 100);

    if (lastScrollState.current.canScrollLeft !== newCanScrollLeft) {
      lastScrollState.current.canScrollLeft = newCanScrollLeft;
      setCanScrollLeft(newCanScrollLeft);
    }

    if (lastScrollState.current.canScrollRight !== newCanScrollRight) {
      lastScrollState.current.canScrollRight = newCanScrollRight;
      setCanScrollRight(newCanScrollRight);
    }

    if (Math.abs(lastScrollState.current.scrollProgress - clampedProgress) >= 1) {
      lastScrollState.current.scrollProgress = clampedProgress;
      setScrollProgress(clampedProgress);
    }
  }, []);

  // Intersection Observer for smooth entrance animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setTimeout(() => {
              setCardsLoaded(true);
            }, 200);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.01,
        rootMargin: '250px 0px 100px 0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    updateScrollState();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      const handleScroll = () => {
        if (scrollFrame.current) {
          cancelAnimationFrame(scrollFrame.current);
        }
        scrollFrame.current = requestAnimationFrame(updateScrollState);
      };

      scrollElement.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        if (scrollFrame.current) {
          cancelAnimationFrame(scrollFrame.current);
        }
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [items, updateScrollState]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;

    const scrollAmount = window.innerWidth > 768 ? 600 : 300;
    const currentScroll = element.scrollLeft;
    const newScroll = direction === 'left'
      ? currentScroll - scrollAmount
      : currentScroll + scrollAmount;

    element.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }, []);

  const handleSliderChange = useCallback((progress: number) => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (progress / 100) * maxScroll;

    element.scrollLeft = targetScroll;
    setScrollProgress(progress);
  }, []);



  return (
    <div
      ref={containerRef}
      className={`relative px-4 md:px-8 py-0 content-lazy-contain transition-all duration-500 ease-out will-change-[transform,opacity] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 transition-all duration-700 delay-100">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-[#E50914] rounded-full inline-block" />
          <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}>
            {title}
          </h2>
        </div>
        {headerAction && (
          <div className={`transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {headerAction}
          </div>
        )}
      </div>

      <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Navigation Buttons */}
        <button
          onClick={() => scroll('left')}
          className={`absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 hidden md:flex items-center justify-center ${!canScrollLeft || loading ? 'md:opacity-0 md:pointer-events-none' : isHovered ? 'md:opacity-100' : 'md:opacity-0 md:pointer-events-none'
            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => scroll('right')}
          className={`absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 hidden md:flex items-center justify-center ${!canScrollRight || loading ? 'md:opacity-0 md:pointer-events-none' : isHovered ? 'md:opacity-100' : 'md:opacity-0 md:pointer-events-none'
            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Content Items */}
        {loading ? (
          <div className="flex overflow-x-auto gap-2.5 scrollbar-hide pb-1 animate-pulse">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="w-32 sm:w-36 md:w-40 lg:w-48 flex-shrink-0">
                <div className="aspect-[2/3] bg-gray-800/85 rounded-xl ring-1 ring-white/10" />
                <div className="mt-2 space-y-2">
                  <div className="h-4 bg-gray-800/85 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/85 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !isVisible ? (
          <div className="flex overflow-x-auto gap-2.5 scrollbar-hide pb-1 opacity-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="w-32 sm:w-36 md:w-40 lg:w-48 flex-shrink-0">
                <div className="aspect-[2/3] bg-gray-800/85 rounded-xl border border-white/5" />
                <div className="mt-2 space-y-2">
                  <div className="h-4 bg-gray-800/85 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/85 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-2.5 scrollbar-hide pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <ContentCarouselItems items={items} type={type} cardsLoaded={cardsLoaded} section={title} />
          </div>
        )}

        {/* Scroll Progress Slider */}
        {!loading && (
          <ScrollSlider
            scrollProgress={scrollProgress}
            onChange={handleSliderChange}
            visible={canScrollLeft || canScrollRight}
          />
        )}
      </div>
    </div>
  );
};

export default ContentCarousel;
