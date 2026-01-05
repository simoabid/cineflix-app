import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, TVShow } from '../types';
import ContentCard from './ContentCard';

interface ContentCarouselProps {
  title: string;
  items: (Movie | TVShow)[];
  type: 'movie' | 'tv';
}

interface ContentCarouselItemsProps {
  items: (Movie | TVShow)[];
  type: 'movie' | 'tv';
  cardsLoaded: boolean;
}

interface ScrollDotsProps {
  itemsLength: number;
  scrollProgress: number;
  onDotClick: (dotProgress: number) => void;
}

const ContentCarouselItems = React.memo<ContentCarouselItemsProps>(({ items, type, cardsLoaded }) => (
  <>
    {items.map((item) => (
      <div
        key={item.id}
        className={`transition-opacity duration-300 ${cardsLoaded ? 'opacity-100' : 'opacity-0'
          }`}
      >
        <ContentCard
          item={item}
          mediaType={type}
          size="sm"
          showTitleBelow={true}
          className="cursor-pointer"
        />
      </div>
    ))}
  </>
));

ContentCarouselItems.displayName = 'ContentCarouselItems';

const ScrollDots = React.memo<ScrollDotsProps>(({ itemsLength, scrollProgress, onDotClick }) => {
  if (itemsLength <= 5) {
    return null;
  }

  const totalDots = Math.min(Math.ceil(itemsLength / 5), 10);

  return (
    <div className="mt-2 mb-1 flex justify-center gap-2">
      {Array.from({ length: totalDots }).map((_, index) => {
        const denominator = Math.max(totalDots - 1, 1);
        const dotProgress = (index / denominator) * 100;
        const isActive = scrollProgress >= dotProgress - 10 && scrollProgress <= dotProgress + 10;
        const isPassed = scrollProgress > dotProgress + 10;

        return (
          <button
            key={index}
            onClick={() => onDotClick(dotProgress)}
            className={`transition-all duration-300 rounded-full ${isActive
              ? 'w-10 h-2.5 bg-netflix-red'
              : isPassed
                ? 'w-2.5 h-2.5 bg-netflix-red/60'
                : 'w-2.5 h-2.5 bg-gray-600/40 hover:bg-gray-500/60'
              }`}
            aria-label={`Go to section ${index + 1}`}
          />
        );
      })}
    </div>
  );
});

ScrollDots.displayName = 'ScrollDots';

const ContentCarousel: React.FC<ContentCarouselProps> = ({ title, items, type }) => {
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
        threshold: 0.1,
        rootMargin: '50px 0px -50px 0px'
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

  const handleDotClick = useCallback((dotProgress: number) => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (dotProgress / 100) * maxScroll;

    element.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }, []);



  return (
    <div
      ref={containerRef}
      className={`relative px-4 md:px-8 py-0 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
    >
      <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}>
        {title}
      </h2>

      <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Navigation Buttons */}
        <button
          onClick={() => scroll('left')}
          className={`absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 ${!canScrollLeft ? 'opacity-0 pointer-events-none' : isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => scroll('right')}
          className={`absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 ${!canScrollRight ? 'opacity-0 pointer-events-none' : isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Content Items */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-2.5 scrollbar-hide pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <ContentCarouselItems items={items} type={type} cardsLoaded={cardsLoaded} />
        </div>

        {/* Scroll Progress Dots */}
        <ScrollDots itemsLength={items.length} scrollProgress={scrollProgress} onDotClick={handleDotClick} />
      </div>
    </div>
  );
};

export default ContentCarousel;
