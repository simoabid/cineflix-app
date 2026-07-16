import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, TVShow } from '../types';
import ContentCard from './ContentCard';

interface ContentCarouselProps {
  title: string;
  items: (Movie | TVShow)[];
  type: 'movie' | 'tv';
  loading?: boolean;
  headerAction?: React.ReactNode;
  /** Mount cards immediately (first above-the-fold row). Default false. */
  eager?: boolean;
}

interface ScrollSliderProps {
  scrollProgress: number;
  onChange: (progress: number) => void;
  visible: boolean;
}

/** Initial cards to paint; enough to fill ~2 viewports on desktop */
const INITIAL_RENDER_COUNT = 8;
const RENDER_BATCH = 6;

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
            [&::-webkit-slider-thumb]:bg-buttons-purple
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-200
            [&::-moz-range-thumb]:h-2
            [&::-moz-range-thumb]:w-10
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-buttons-purple
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
  headerAction,
  eager = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(eager);
  const [scrollProgress, setScrollProgress] = useState(0);
  /** Progressive horizontal mount — grow from left as user scrolls right */
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);
  const scrollFrame = useRef<number>();
  const lastScrollState = useRef({
    canScrollLeft: false,
    canScrollRight: true,
    scrollProgress: 0,
  });

  const visibleItems = useMemo(
    () => items.slice(0, Math.min(renderCount, items.length)),
    [items, renderCount]
  );

  // Reset progressive window when the row's item set changes
  useEffect(() => {
    setRenderCount(INITIAL_RENDER_COUNT);
  }, [items, type]);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;
    const hasMoreUnmounted = renderCount < items.length;
    const newCanScrollLeft = scrollLeft > 0;
    // Keep "scroll right" available while unmounted items remain
    const newCanScrollRight = hasMoreUnmounted || scrollLeft < maxScroll - 10;
    const rawProgress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    const clampedProgress = Math.min(Math.max(rawProgress, 0), 100);

    // Near the right edge, or content still fits in viewport while more items exist
    if (
      hasMoreUnmounted &&
      (maxScroll <= 0 || scrollLeft + clientWidth > scrollWidth - clientWidth * 0.6)
    ) {
      setRenderCount((prev) => {
        if (prev >= items.length) return prev;
        return Math.min(prev + RENDER_BATCH, items.length);
      });
    }

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
  }, [items.length, renderCount]);

  // Intersection Observer — mount row content only when near viewport
  useEffect(() => {
    if (eager) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0,
        rootMargin: '120px 0px 80px 0px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [eager]);

  useEffect(() => {
    if (!isVisible) return;
    updateScrollState();
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

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
  }, [items, updateScrollState, isVisible, renderCount]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;

    const scrollAmount = window.innerWidth > 768 ? 600 : 300;
    const currentScroll = element.scrollLeft;
    const newScroll =
      direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;

    // Pre-expand window when jumping right so content exists under the scroll target
    if (direction === 'right') {
      setRenderCount((prev) => Math.min(prev + RENDER_BATCH, items.length));
    }

    element.scrollTo({
      left: newScroll,
      behavior: 'smooth',
    });
  }, [items.length]);

  const handleSliderChange = useCallback((progress: number) => {
    const element = scrollRef.current;
    if (!element) return;

    // Slider can jump far ahead — ensure enough cards are mounted
    if (progress > 30) {
      setRenderCount(items.length);
    }

    const { scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (progress / 100) * maxScroll;

    element.scrollLeft = targetScroll;
    setScrollProgress(progress);
  }, [items.length]);

  const skeletonRow = (
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
  );

  return (
    <div
      ref={containerRef}
      className="relative px-4 md:px-8 py-0 content-lazy-contain"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-buttons-purple rounded-full inline-block" />
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={() => scroll('left')}
          className={`absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-opacity duration-300 hidden md:flex items-center justify-center ${
            !canScrollLeft || loading
              ? 'md:opacity-0 md:pointer-events-none'
              : isHovered
                ? 'md:opacity-100'
                : 'md:opacity-0 md:pointer-events-none'
          } border border-white/20 hover:border-white/40 shadow-xl`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => scroll('right')}
          className={`absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-opacity duration-300 hidden md:flex items-center justify-center ${
            !canScrollRight || loading
              ? 'md:opacity-0 md:pointer-events-none'
              : isHovered
                ? 'md:opacity-100'
                : 'md:opacity-0 md:pointer-events-none'
          } border border-white/20 hover:border-white/40 shadow-xl`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {loading || !isVisible ? (
          skeletonRow
        ) : (
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-2.5 scrollbar-hide pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visibleItems.map((item) => (
              <div key={item.id} className="carousel-item flex-shrink-0">
                <ContentCard
                  item={item}
                  mediaType={type}
                  size="sm"
                  showTitleBelow={true}
                  className="cursor-pointer"
                  section={title}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && isVisible && (
          <ScrollSlider
            scrollProgress={scrollProgress}
            onChange={handleSliderChange}
            visible={canScrollLeft || canScrollRight || items.length > renderCount}
          />
        )}
      </div>
    </div>
  );
};

export default ContentCarousel;
