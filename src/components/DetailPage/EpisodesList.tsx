import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Play, Calendar, Star, Clock, Check, ChevronDown } from 'lucide-react';
import { getImageUrl } from '../../services/tmdb';
import { Episode, Season } from '../../types';

interface EpisodesListProps {
  readonly episodes: Episode[];
  readonly selectedSeason: Season | null;
  readonly watchedEpisodes: Set<string>;
  readonly expandedEpisode: number | null;
  readonly onToggleWatched: (episodeId: string) => void;
  readonly onToggleExpanded: (episodeNumber: number | null) => void;
  readonly seriesId?: string;
  readonly episodeProgress?: { season: number; episode: number; progress: number } | null;
}

const formatRuntime = (runtime?: number): string => {
  if (!runtime) return 'N/A';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatAirDate = (dateString?: string): string => {
  if (!dateString) return 'TBA';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Polished episodes list. Each row is collapsible and tracks watch status
 * locally. Renders within a virtual-friendly scrollable container.
 */
const EpisodesList: React.FC<EpisodesListProps> = ({
  episodes,
  selectedSeason,
  watchedEpisodes,
  expandedEpisode,
  onToggleWatched,
  onToggleExpanded,
  seriesId,
  episodeProgress,
}) => {
  const navigate = useNavigate();

  if (!selectedSeason) return null;

  return (
    <div
      data-lenis-prevent
      className="max-h-[640px] overflow-y-auto pr-2 space-y-3 scrollbar-hide"
    >
      {episodes.map((episode, index) => {
        const episodeId = `${selectedSeason.season_number}-${episode.episode_number}`;
        const hasProgress = !!(episodeProgress &&
          episodeProgress.season === selectedSeason.season_number &&
          episodeProgress.episode === episode.episode_number);
        const progressPercent = hasProgress ? episodeProgress.progress : 0;
        const isWatched = watchedEpisodes.has(episodeId) || (hasProgress && progressPercent >= 90);
        const isExpanded = expandedEpisode === episode.episode_number;

        return (
          <motion.article
            key={episode.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
            className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
              isWatched
                ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                : 'border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] hover:border-netflix-red/40'
            }`}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Thumbnail */}
                <div
                  className="flex-shrink-0 relative group/thumb cursor-pointer"
                  onClick={() => {
                    if (seriesId) {
                      navigate(`/watch/tv/${seriesId}?season=${selectedSeason.season_number}&episode=${episode.episode_number}`);
                    }
                  }}
                >
                  <div className="w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 relative">
                    {episode.still_path ? (
                      <img
                        src={getImageUrl(episode.still_path, 'w300')}
                        alt={episode.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=60';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
                        <PlayCircle className="w-7 h-7 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-netflix-red flex items-center justify-center shadow-lg shadow-netflix-red/40">
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    {episode.runtime > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 bg-black/85 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        {formatRuntime(episode.runtime)}
                      </div>
                    )}
                    {hasProgress && progressPercent > 0 && progressPercent < 90 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                        <div
                          className="h-full bg-netflix-red"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="bg-netflix-red/20 text-netflix-red border border-netflix-red/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                          EP {episode.episode_number}
                        </span>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (seriesId) {
                              navigate(`/watch/tv/${seriesId}?season=${selectedSeason.season_number}&episode=${episode.episode_number}`);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red hover:bg-red-700 text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-300 shadow-md shadow-netflix-red/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                          title={`Watch Episode ${episode.episode_number}`}
                        >
                          <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                          <span>Watch EP {episode.episode_number}</span>
                        </button>
                        {isWatched && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" strokeWidth={3} />
                            Watched
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1.5 line-clamp-1 group-hover:text-netflix-red transition-colors">
                        {episode.name}
                      </h3>
                      {!isExpanded && (
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2">
                          {episode.overview || 'No description available.'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onToggleWatched(episodeId)}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          isWatched
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                        title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                        aria-label={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => onToggleExpanded(isExpanded ? null : episode.episode_number)}
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatAirDate(episode.air_date)}
                    </span>
                    {episode.vote_average > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        {episode.vote_average.toFixed(1)}
                      </span>
                    )}
                    {episode.runtime > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRuntime(episode.runtime)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                          Episode Details
                        </h4>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Season</dt>
                            <dd className="text-white font-medium">{selectedSeason.season_number}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Episode</dt>
                            <dd className="text-white font-medium">{episode.episode_number}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Air Date</dt>
                            <dd className="text-white font-medium">{formatAirDate(episode.air_date)}</dd>
                          </div>
                          {episode.runtime > 0 && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Runtime</dt>
                              <dd className="text-white font-medium">{formatRuntime(episode.runtime)}</dd>
                            </div>
                          )}
                          {episode.vote_count > 0 && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Rating</dt>
                              <dd className="text-white font-medium">
                                {episode.vote_average.toFixed(1)} / 10
                                <span className="text-gray-500 text-xs ml-1">
                                  ({episode.vote_count.toLocaleString()})
                                </span>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                          Synopsis
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {episode.overview || 'No detailed description available for this episode.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
};

export default EpisodesList;
