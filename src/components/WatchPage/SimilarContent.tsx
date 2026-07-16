import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  LayoutGrid
} from 'lucide-react';

import { Movie, TVShow } from '../../types';
import { getPosterUrl } from '../../services/tmdb';
import AddToListButton from '../AddToListButton';
import LikeButton from '../LikeButton';
import { useSmartPlayer } from '../../hooks/useSmartPlayer';
import { analytics } from '../../services/analytics';

interface SimilarContentProps {
  similar: (Movie | TVShow)[];
  recommended: (Movie | TVShow)[];
  type: 'movie' | 'tv';
}

const SimilarContent: React.FC<SimilarContentProps> = ({ similar, recommended, type }) => {
  const navigate = useNavigate();
  const { openPlayer } = useSmartPlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'similar' | 'recommended'>('similar');
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const content = activeTab === 'similar' ? similar : recommended;

  const updateArrows = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
      // Wait for content render to calculate
      const timer = setTimeout(updateArrows, 100);
      return () => {
        scrollContainer.removeEventListener('scroll', updateArrows);
        window.removeEventListener('resize', updateArrows);
        clearTimeout(timer);
      };
    }
  }, [content, activeTab]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.7 : clientWidth * 0.7;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const switchTab = (tab: 'similar' | 'recommended') => {
    setActiveTab(tab);
    setHoveredItem(null);
  };

  const handleWatchContent = (item: Movie | TVShow) => {
    if (isDragging) return;
    const contentType = 'title' in item ? 'movie' : 'tv';
    const itemTitle = 'title' in item ? item.title : item.name;
    analytics.trackContentClick({
      contentId: item.id,
      contentTitle: itemTitle,
      contentType: contentType,
      section: activeTab === 'similar' ? 'More Like This' : 'Recommended for You'
    });
    openPlayer({ tmdbId: item.id, type: contentType });
  };

  // Mouse Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (similar.length === 0 && recommended.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-20 bg-transparent relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff0000]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-[#ff0000]" />
              Discover More
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              More Like This
            </h2>

            {/* Custom Tab Switcher */}
            <div className="flex p-0.5 sm:p-1 bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-xl sm:rounded-2xl w-fit mt-4 sm:mt-6">
              <button
                onClick={() => switchTab('similar')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${activeTab === 'similar'
                    ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Similar Content
              </button>
              <button
                onClick={() => switchTab('recommended')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${activeTab === 'recommended'
                    ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Recommended for You
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => scroll('left')}
                disabled={!showLeftArrow}
                className="p-3 bg-gray-900 border border-white/10 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 z-30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!showRightArrow}
                className="p-3 bg-gray-900 border border-white/10 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 z-30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Improved Full-Bleed Carousel Container */}
        <div className="relative -mx-6 sm:-mx-8 lg:-mx-12 group/carousel">
          {/* High-Performance Edge Fades - Positioned outside the actual content padding */}
          <div className={`absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background-main to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background-main to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseUp}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto scrollbar-hide pb-8 sm:pb-12 pt-4 px-6 sm:px-8 lg:px-12 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'scroll-auto' : 'scroll-smooth'}`}
              style={{
                scrollSnapType: isDragging ? 'none' : 'x proximity',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {content.map((item, index) => {
                const itemTitle = 'title' in item ? item.title : item.name;
                const itemDate = 'release_date' in item ? item.release_date : item.first_air_date;
                const contentType = 'title' in item ? 'movie' : 'tv';
                const isHovered = hoveredItem === index;

                return (
                  <motion.button
                    key={`${activeTab}-${item.id}`}
                    onClick={() => handleWatchContent(item)}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{ scrollSnapAlign: 'start' }}
                    className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[220px] lg:w-[240px] relative group flex flex-col border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden hover:border-[#ff0000]/40 hover:bg-white/[0.05] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300 text-left outline-none select-none"
                  >
                    {/* Poster Container */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-900 rounded-t-2xl">
                      <img
                        src={getPosterUrl(item.poster_path, 'w500')}
                        alt={itemTitle}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 pointer-events-none"
                        loading="lazy"
                      />

                      {/* Glassy reflection overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                        <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-1 shadow-md">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-[10px] font-bold text-white">{(item.vote_average || 0).toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="absolute top-2.5 right-2.5 z-10">
                        <div className="px-2 py-0.5 rounded bg-[#ff0000] text-white text-[9px] font-black tracking-wider shadow-md">
                          {contentType === 'movie' ? 'MOVIE' : 'SERIES'}
                        </div>
                      </div>

                      {/* Hover play icon indicator */}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 bg-[#ff0000] rounded-full flex items-center justify-center shadow-lg shadow-[#ff0000]/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                    {/* Bottom Info Footer */}
                    <div className="p-3 sm:p-4 bg-gradient-to-b from-white/[0.02] to-black/40 border-t border-white/5 w-full flex-1 flex flex-col justify-between min-h-[5.5rem]">
                      <h3 className="text-white font-bold text-xs sm:text-sm md:text-base leading-snug line-clamp-2 group-hover:text-[#ff0000] transition-colors duration-300">
                        {itemTitle}
                      </h3>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-gray-400 mt-2 flex-wrap gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 uppercase">
                          {itemDate ? new Date(itemDate).getFullYear() : 'N/A'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-600" />
                          <span>{item.vote_count.toLocaleString()} votes</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Action Footer */}
        <div className="mt-10 sm:mt-20 flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 bg-gray-900/30 backdrop-blur-lg border border-white/5 rounded-2xl sm:rounded-[32px] gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[#ff0000]/10 rounded-2xl flex-shrink-0">
              <Sparkles className="h-6 w-6 text-[#ff0000]" />
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-sm sm:text-base">Still looking for something?</h4>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Explore our full catalog of {type === 'movie' ? 'movies' : 'TV shows'} with advanced filters.</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/search?type=${type}&ref=recommendations`)}
            className="px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-black font-bold rounded-xl sm:rounded-2xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5 text-sm sm:text-base w-full md:w-auto text-center"
          >
            Explore All {type === 'movie' ? 'Movies' : 'Series'}
          </button>
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default SimilarContent;