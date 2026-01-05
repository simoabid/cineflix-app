import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Play,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

import { Movie, TVShow } from '../../types';
import { getPosterUrl } from '../../services/tmdb';
import { useMyList } from '../../hooks/useMyList';

interface SimilarContentProps {
  content: (Movie | TVShow)[];
  title: string;
  type: 'movie' | 'tv';
}

const SimilarContent: React.FC<SimilarContentProps> = ({ content, title, type }) => {
  const navigate = useNavigate();
  const { isInList, toggleInList, removeByContentId } = useMyList();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const itemsPerPage = 6;
  const totalPages = Math.ceil(content.length / itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleWatchContent = (item: Movie | TVShow) => {
    const contentType = 'title' in item ? 'movie' : 'tv';
    navigate(`/watch/${contentType}/${item.id}`);
  };

  const handleAddToList = (item: Movie | TVShow, e: React.MouseEvent) => {
    e.stopPropagation();

    const contentType = 'title' in item ? 'movie' : 'tv';
    if (isInList(item.id, contentType)) {
      removeByContentId(item.id, contentType);
    } else {
      toggleInList(item, contentType);
    }
  };

  const currentItems = content.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  if (content.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-[#0A0A1F]">
      <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Sparkles className="h-8 w-8 text-[#ff0000] mr-3" />
            {title}
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-gray-400 text-sm">
              {currentIndex + 1} / {totalPages}
            </span>
            <button
              onClick={nextSlide}
              disabled={currentIndex === totalPages - 1}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {currentItems.map((item, index) => {
            const itemTitle = 'title' in item ? item.title : item.name;
            const itemDate = 'release_date' in item ? item.release_date : item.first_air_date;
            const contentType = 'title' in item ? 'movie' : 'tv';
            const isHovered = hoveredItem === index;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleWatchContent(item)}
              >
                {/* Poster Image */}
                <div className="relative overflow-hidden rounded-lg bg-gray-800">
                  <img
                    src={getPosterUrl(item.poster_path, 'w342')}
                    alt={itemTitle}
                    className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300">
                    {/* Action Buttons */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
                      }`}>
                      <div className="flex space-x-2">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchContent(item);
                          }}
                          className="p-3 bg-[#ff0000] text-white rounded-full hover:bg-red-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Play className="h-5 w-5" />
                        </motion.button>

                        <motion.button
                          onClick={(e) => handleAddToList(item, e)}
                          className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isInList(item.id, contentType) ? (
                            <Heart className="h-5 w-5 text-[#ff0000] fill-current" />
                          ) : (
                            <Heart className="h-5 w-5" />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-lg text-sm flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{item.vote_average.toFixed(1)}</span>
                  </div>

                  {/* Content Type Badge */}
                  <div className="absolute top-2 left-2 bg-[#ff0000] text-white px-2 py-1 rounded text-xs font-semibold uppercase">
                    {contentType}
                  </div>
                </div>

                {/* Content Info */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-[#ff0000] transition-colors">
                    {itemTitle}
                  </h3>

                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>{itemDate ? new Date(itemDate).getFullYear() : 'N/A'}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{item.vote_average.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Genres */}
                  {item.genre_ids && item.genre_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.genre_ids.slice(0, 2).map((genreId) => (
                        <span
                          key={genreId}
                          className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {/* In a real app, you'd map genre IDs to names */}
                          Genre {genreId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover Card */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10"
                  >
                    <h4 className="text-white font-semibold mb-2">{itemTitle}</h4>
                    <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                      {item.overview}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-white">{item.vote_average.toFixed(1)}</span>
                        </div>
                        <span className="text-gray-400">
                          ({item.vote_count} votes)
                        </span>
                      </div>

                      <div className="text-gray-400 text-sm">
                        {itemDate ? new Date(itemDate).getFullYear() : 'N/A'}
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWatchContent(item);
                        }}
                        className="flex-1 py-2 bg-[#ff0000] text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Watch Now
                      </button>
                      <button
                        onClick={(e) => handleAddToList(item, e)}
                        className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        {isInList(item.id, contentType) ? (
                          <Heart className="h-4 w-4 text-[#ff0000] fill-current" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-[#ff0000]' : 'bg-gray-600'
                }`}
            />
          ))}
        </div>

        {/* Show More Button */}
        {content.length > itemsPerPage && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate(`/search?type=${type}&similar=true`)}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              View All Similar Content
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SimilarContent;