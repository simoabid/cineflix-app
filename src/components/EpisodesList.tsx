import React from 'react';
import { PlayCircle, Play, Calendar, Star, Clock } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  vote_count: number;
  runtime: number;
}

interface EpisodesListProps {
  episodes: Episode[];
  selectedSeason: any;
  watchedEpisodes: Set<string>;
  expandedEpisode: number | null;
  onToggleWatched: (episodeId: string) => void;
  onToggleExpanded: (episodeNumber: number | null) => void;
}

const EpisodesList: React.FC<EpisodesListProps> = ({
  episodes,
  selectedSeason,
  watchedEpisodes,
  expandedEpisode,
  onToggleWatched,
  onToggleExpanded
}) => {
  const formatEpisodeRuntime = (runtime: number) => {
    if (!runtime) return 'N/A';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatAirDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Scrollable Episodes Container */}
      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {episodes.map((episode: Episode) => {
          const episodeId = `${selectedSeason.season_number}-${episode.episode_number}`;
          const isWatched = watchedEpisodes.has(episodeId);
          const isExpanded = expandedEpisode === episode.episode_number;
          
          return (
            <div
              key={episode.id}
              className={`bg-gradient-to-r from-gray-800/50 to-gray-900/30 rounded-xl border transition-all duration-300 overflow-hidden ${
                isWatched 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-gray-700/30 hover:border-netflix-red/30'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Episode Thumbnail */}
                  <div className="flex-shrink-0 relative group cursor-pointer">
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-700">
                      {episode.still_path ? (
                        <img
                          src={getImageUrl(episode.still_path, 'w300')}
                          alt={episode.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                      {episode.runtime && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {formatEpisodeRuntime(episode.runtime)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Episode Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm font-bold">
                            Episode {episode.episode_number}
                          </span>
                          {isWatched && (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Watched
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                          {episode.name}
                        </h3>
                        <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
                          {episode.overview || 'No description available.'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => onToggleWatched(episodeId)}
                          className={`p-2 rounded-full transition-all duration-300 ${
                            isWatched
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'
                          }`}
                          title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onToggleExpanded(isExpanded ? null : episode.episode_number)}
                          className="p-2 rounded-full bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white transition-all duration-300"
                        >
                          <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Episode Metadata */}
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatAirDate(episode.air_date)}</span>
                      </div>
                      {episode.vote_average > 0 && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span>{episode.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {episode.runtime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatEpisodeRuntime(episode.runtime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Episode Details */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-700/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Episode Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Season:</span>
                            <span className="text-white">{selectedSeason.season_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Episode:</span>
                            <span className="text-white">{episode.episode_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Air Date:</span>
                            <span className="text-white">{formatAirDate(episode.air_date)}</span>
                          </div>
                          {episode.runtime && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Runtime:</span>
                              <span className="text-white">{formatEpisodeRuntime(episode.runtime)}</span>
                            </div>
                          )}
                          {episode.vote_count > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Rating:</span>
                              <span className="text-white">{episode.vote_average.toFixed(1)}/10 ({episode.vote_count} votes)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Synopsis</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {episode.overview || 'No detailed description available for this episode.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodesList;