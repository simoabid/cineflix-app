import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Globe,
  Languages,
  BarChart3,
  Star
} from 'lucide-react';

import { Movie, TVShow } from '../../types';

interface MovieDetailsProps {
  content: Movie | TVShow;
  type: 'movie' | 'tv';
}

const MovieDetails: React.FC<MovieDetailsProps> = ({ content, type }) => {
  const movie = type === 'movie' ? content as Movie : null;
  const tvShow = type === 'tv' ? content as TVShow : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4" // Removed outer border/bg since parent handles it
    >
      {/* Removed "Details" header since it's now in the parent fixed header */}

      <div className="space-y-3">
        {/* Release Date */}
        <div className="flex items-start justify-between group rounded-lg hover:bg-white/5 p-2 transition-colors -mx-2">
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-gray-500 group-hover:text-[#ff0000] transition-colors" />
            <span className="text-gray-400 text-xs font-medium">
              {type === 'movie' ? 'Release Date' : 'First Air'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-white text-sm font-medium">
              {formatDate(movie?.release_date || tvShow?.first_air_date || '')}
            </div>
          </div>
        </div>

        {/* Runtime / Episodes */}
        <div className="flex items-start justify-between group rounded-lg hover:bg-white/5 p-2 transition-colors -mx-2">
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-gray-500 group-hover:text-[#ff0000] transition-colors" />
            <span className="text-gray-400 text-xs font-medium">
              {type === 'movie' ? 'Runtime' : 'Ep. Runtime'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-white text-sm font-medium">
              {type === 'movie'
                ? `${movie?.runtime || 0} min`
                : `${tvShow?.episode_run_time?.[0] || 0} min`
              }
            </div>
          </div>
        </div>

        {/* TV Show Specific Info */}
        {type === 'tv' && tvShow && (
          <div className="flex items-start justify-between group rounded-lg hover:bg-white/5 p-2 transition-colors -mx-2">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-4 w-4 text-gray-500 group-hover:text-[#ff0000] transition-colors" />
              <span className="text-gray-400 text-xs font-medium">Episodes</span>
            </div>
            <div className="text-right">
              <div className="text-white text-sm font-medium">
                {tvShow.number_of_seasons} S • {tvShow.number_of_episodes} E
              </div>
              <div className="text-gray-500 text-[10px] uppercase">
                {tvShow.status || 'Unknown'}
              </div>
            </div>
          </div>
        )}

        {/* Original Language */}
        <div className="flex items-start justify-between group rounded-lg hover:bg-white/5 p-2 transition-colors -mx-2">
          <div className="flex items-center space-x-3">
            <Languages className="h-4 w-4 text-gray-500 group-hover:text-[#ff0000] transition-colors" />
            <span className="text-gray-400 text-xs font-medium">Language</span>
          </div>
          <div className="text-right">
            <div className="text-white text-sm font-medium">
              {content.spoken_languages?.[0]?.english_name || 'English'}
            </div>
          </div>
        </div>

        {/* Movie Budget & Revenue - Compacted */}
        {type === 'movie' && movie && ((movie.budget || 0) > 0 || (movie.revenue || 0) > 0) && (
          <div className="py-2 border-t border-gray-800 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {(movie.budget || 0) > 0 && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-gray-500 text-[10px] mb-0.5">Budget</div>
                  <div className="text-white text-xs font-medium">{formatCurrency(movie.budget || 0)}</div>
                </div>
              )}
              {(movie.revenue || 0) > 0 && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-gray-500 text-[10px] mb-0.5">Box Office</div>
                  <div className="text-green-400 text-xs font-medium">{formatCurrency(movie.revenue || 0)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rating Information */}
        <div className="border-t border-gray-800 pt-3 mt-1">
          <h4 className="text-white font-semibold text-xs mb-3 uppercase tracking-wider text-gray-500">Ratings</h4>

          <div className="space-y-2">
            {/* TMDB Rating */}
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-[#01b4e4] rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">DB</span>
                </div>
                <span className="text-gray-300 text-xs">TMDB</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                </div>
                <span className={`font-bold text-sm ${getRatingColor(content.vote_average)}`}>
                  {content.vote_average.toFixed(1)}
                </span>
              </div>
            </div>

            {/* IMDb & RT Compact Row */}
            <div className="grid grid-cols-2 gap-2">
              {type === 'movie' && movie?.imdb_id && (
                <div className="flex items-center justify-center space-x-2 p-1.5 bg-white/5 rounded border border-white/5">
                  <span className="text-[#f5c518] text-xs font-bold">IMDb</span>
                  <span className="text-white text-xs font-medium">{(content.vote_average * 0.9).toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center justify-center space-x-2 p-1.5 bg-gray-800/30 rounded border border-white/5">
                <span className="text-[#ff0000] text-xs font-bold">RT</span>
                <span className="text-white text-xs font-medium">{Math.floor(content.vote_average * 10)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* External Links - Icons Only Compact */}
        {(content.homepage || (type === 'movie' && movie?.imdb_id)) && (
          <div className="pt-3 flex gap-2 justify-center">
            {content.homepage && (
              <a
                href={content.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-[#ff0000] rounded-full transition-colors group"
                title="Official Website"
              >
                <Globe className="h-4 w-4 text-gray-300 group-hover:text-white" />
              </a>
            )}
            {type === 'movie' && movie?.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${movie?.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-[#f5c518] rounded-full transition-colors group"
                title="IMDb"
              >
                <span className="text-gray-300 text-[10px] font-bold group-hover:text-black">IMDb</span>
              </a>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default MovieDetails;