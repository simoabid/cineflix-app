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

interface SimilarContentProps {
  similar: (Movie | TVShow)[];
  recommended: (Movie | TVShow)[];
  title: string;
  type: 'movie' | 'tv';
}

const SimilarContent: React.FC<SimilarContentProps> = ({ similar, recommended, title, type }) => {
  const navigate = useNavigate();
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
    navigate(`/watch/${contentType}/${item.id}`);
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
    <section className="py-20 bg-[#0A0A1F] relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff0000]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-[#ff0000]" />
              Discover More
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Because you watched <span className="text-[#ff0000]">"{title}"</span>
            </h2>

            {/* Custom Tab Switcher */}
            <div className="flex p-1 bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-2xl w-fit mt-6">
              <button
                onClick={() => switchTab('similar')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'similar'
                    ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Layers className="h-4 w-4" />
                Similar Content
              </button>
              <button
                onClick={() => switchTab('recommended')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'recommended'
                    ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Recommended for You
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
          <div className={`absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0A1F] to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0A1F] to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

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
              className={`flex gap-8 overflow-x-auto scrollbar-hide pb-12 pt-4 px-6 sm:px-8 lg:px-12 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'scroll-auto' : 'scroll-smooth'}`}
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
                  <div
                    key={`${activeTab}-${item.id}`}
                    className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[260px] lg:w-[280px] relative group perspective-1000"
                    onMouseEnter={() => !isDragging && setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <motion.div
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      animate={{
                        y: isHovered ? -12 : 0,
                        scale: isHovered ? 1.02 : 1
                      }}
                      className="relative cursor-pointer"
                    >
                      {/* Premium Card Shadow */}
                      <div className={`absolute inset-0 bg-[#ff0000]/20 blur-2xl rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

                      <div
                        onClick={() => handleWatchContent(item)}
                        className="relative overflow-hidden rounded-2xl bg-gray-900 border border-white/5 aspect-[2/3] group-hover:border-[#ff0000]/50 transition-all duration-500"
                      >
                        <img
                          src={getPosterUrl(item.poster_path, 'w500')}
                          alt={itemTitle}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                          loading="lazy"
                        />

                        {/* Dynamic Overlays */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

                        <div className={`absolute inset-0 flex flex-col justify-end p-5 transition-all duration-500 transform ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleWatchContent(item); }}
                                className="w-10 h-10 flex items-center justify-center bg-[#ff0000] text-white rounded-xl shadow-lg shadow-red-600/40"
                              >
                                <Play className="h-5 w-5 fill-current" />
                              </motion.button>
                              <AddToListButton
                                content={item}
                                contentType={contentType}
                                variant="icon"
                                showText={false}
                                className="!w-10 !h-10 !p-0 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-xl hover:bg-white/20"
                              />
                              <LikeButton
                                content={item}
                                contentType={contentType}
                                variant="icon"
                                showText={false}
                                className="!w-10 !h-10 !p-0 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-xl hover:bg-white/20"
                              />
                            </div>
                            <button className="flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white transition-colors duration-200">
                              <Info className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-xl">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-[11px] font-bold text-white">{(item.vote_average || 0).toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="absolute top-4 right-4">
                          <div className="px-2 py-1 rounded-lg bg-[#ff0000] text-white text-[10px] font-black tracking-tighter shadow-lg shadow-red-600/30">
                            {contentType === 'movie' ? 'MOVIE' : 'TV SHOW'}
                          </div>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-5 space-y-1.5">
                        <h3 className="text-white font-bold text-base leading-tight line-clamp-1 group-hover:text-[#ff0000] transition-colors duration-300">
                          {itemTitle}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 uppercase">
                            {itemDate ? new Date(itemDate).getFullYear() : 'N/A'}
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-600" />
                            <span>{item.vote_count.toLocaleString()} votes</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Action Footer */}
        <div className="mt-20 flex flex-col md:flex-row items-center justify-between p-8 bg-gray-900/30 backdrop-blur-lg border border-white/5 rounded-[32px] gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[#ff0000]/10 rounded-2xl">
              <Sparkles className="h-6 w-6 text-[#ff0000]" />
            </div>
            <div>
              <h4 className="text-white font-bold">Still looking for something?</h4>
              <p className="text-gray-400 text-sm">Explore our full catalog of {type === 'movie' ? 'movies' : 'TV shows'} with advanced filters.</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/search?type=${type}&ref=recommendations`)}
            className="px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
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