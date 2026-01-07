import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { TVShow } from '../../types';
import { getTVShowSeasons, getTVShowSeasonDetails, getPosterUrl } from '../../services/tmdb';
import { useAuth } from '../../contexts/AuthContext';
import { watchedEpisodesApi } from '../../services/api';

interface SeasonsEpisodesSectionProps {
  tvShow: TVShow;
  onSeasonEpisodeChange?: (season: number, episode: number) => void;
  initialSeason?: number;
  initialEpisode?: number;
}

const SeasonsEpisodesSection: React.FC<SeasonsEpisodesSectionProps> = ({
  tvShow,
  onSeasonEpisodeChange,
  initialSeason = 1,
  initialEpisode = 1
}) => {
  const { user, isAuthenticated } = useAuth();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [selectedSeasonDetails, setSelectedSeasonDetails] = useState<any>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(() => {
    // Always initialize from localStorage for immediate feedback/offline support
    const saved = localStorage.getItem(`watched_episodes_${tvShow.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Fetch watched episodes from backend when authenticated
  useEffect(() => {
    const fetchWatchedEpisodes = async () => {
      if (isAuthenticated && user) {
        const response = await watchedEpisodesApi.getWatchedEpisodes(tvShow.id);
        if (response.success && response.data) {
          const apiWatched = new Set<string>();
          response.data.forEach((ep: any) => {
            apiWatched.add(`${ep.seasonNumber}-${ep.episodeNumber}`);
          });

          // Merge with local state (union)
          setWatchedEpisodes(prev => {
            const newSet = new Set(prev);
            apiWatched.forEach(id => newSet.add(id));
            return newSet;
          });
        }
      }
    };

    fetchWatchedEpisodes();
  }, [tvShow.id, isAuthenticated, user]);

  // Sync watched episodes to local storage (always)
  useEffect(() => {
    localStorage.setItem(`watched_episodes_${tvShow.id}`, JSON.stringify(Array.from(watchedEpisodes)));
  }, [watchedEpisodes, tvShow.id]);

  // Fetch seasons on component mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        setLoadingSeasons(true);
        const seasonsData = await getTVShowSeasons(tvShow.id);
        setSeasons(seasonsData || []);

        // Auto-select initial season or first available
        if (seasonsData && seasonsData.length > 0) {
          let seasonToSelect = seasonsData.find((season: any) => season.season_number >= 0) || seasonsData[0];

          if (initialSeason > 1) {
            const found = seasonsData.find((s: any) => s.season_number === initialSeason);
            if (found) seasonToSelect = found;
          }

          // Pass initialEpisode only if we are selecting initialSeason
          const episodeToSelect = (seasonToSelect.season_number === initialSeason && initialEpisode > 1)
            ? initialEpisode
            : 1;

          await handleSeasonChange(seasonToSelect, episodeToSelect);
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      } finally {
        setLoadingSeasons(false);
      }
    };

    fetchSeasons();
  }, [tvShow.id]);

  const handleSeasonChange = async (season: any, episode = 1) => {
    try {
      setLoadingSeasons(true);
      setSelectedSeason(season);
      const seasonDetails = await getTVShowSeasonDetails(tvShow.id, season.season_number);
      setSelectedSeasonDetails(seasonDetails);

      // Notify parent component of season change
      if (onSeasonEpisodeChange) {
        onSeasonEpisodeChange(season.season_number, episode);
      }
    } catch (error) {
      console.error('Error fetching season details:', error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const toggleEpisodeWatched = async (episodeNumber: number, seasonNumber: number) => {
    const episodeId = `${seasonNumber}-${episodeNumber}`;

    // Optimistic update
    setWatchedEpisodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });

    // API call if authenticated
    if (isAuthenticated) {
      await watchedEpisodesApi.toggleWatchedEpisode(tvShow.id, seasonNumber, episodeNumber);
    }
  };

  const handleEpisodeSelect = (episodeNumber: number) => {
    if (onSeasonEpisodeChange && selectedSeason) {
      onSeasonEpisodeChange(selectedSeason.season_number, episodeNumber);
    }
  };

  return (
    <div className="bg-[#13132B] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#1F1F35] px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center">
            <Film className="h-5 w-5 text-[#ff0000] mr-2" />
            Seasons & Episodes
          </h2>
          {selectedSeason && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Season {selectedSeason.season_number}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{selectedSeasonDetails?.episodes?.length || 0} episodes</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* Season Selector */}
        {seasons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3">Select Season</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {seasons
                .filter(season => season.season_number >= 0)
                .map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonChange(season)}
                    className={`flex-shrink-0 group relative overflow-hidden rounded-lg transition-all duration-300 ${selectedSeason?.id === season.id
                      ? 'ring-2 ring-[#ff0000] scale-105'
                      : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                      }`}
                  >
                    <div className="w-20 h-28 relative">
                      {season.poster_path ? (
                        <img
                          src={getPosterUrl(season.poster_path, 'w300')}
                          alt={season.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <Film className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-1 left-1 right-1">
                        <p className="text-white text-xs font-semibold text-center truncate">
                          Season {season.season_number}
                        </p>
                        <p className="text-gray-300 text-xs text-center">
                          {season.episode_count} ep
                        </p>
                      </div>
                      {selectedSeason?.id === season.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-[#ff0000] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Episodes List */}
        {loadingSeasons ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ff0000] border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-400">Loading episodes...</p>
            </div>
          </div>
        ) : selectedSeasonDetails?.episodes ? (
          <div className="space-y-3">
            <h3 className="text-white font-medium">Episodes</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {selectedSeasonDetails.episodes.map((episode: any) => {
                const episodeId = `${selectedSeason.season_number}-${episode.episode_number}`;
                const isWatched = watchedEpisodes.has(episodeId);

                return (
                  <div
                    key={episode.id}
                    className={`bg-gradient-to-r from-white/10 to-transparent rounded-lg border transition-all duration-300 ${isWatched
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-gray-700/30 hover:border-[#ff0000]/30'
                      }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Episode Thumbnail */}
                        <div
                          className="flex-shrink-0 relative group cursor-pointer"
                          onClick={() => handleEpisodeSelect(episode.episode_number)}
                        >
                          <div className="w-20 h-12 rounded-md overflow-hidden bg-gray-700">
                            {episode.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                                alt={episode.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-6 h-6 bg-[#ff0000] rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-[#ff0000]/20 text-[#ff0000] px-2 py-0.5 rounded-full text-xs font-bold">
                              E{episode.episode_number}
                            </span>
                            {isWatched && (
                              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Watched
                              </span>
                            )}
                          </div>
                          <h4 className="text-white font-medium text-sm mb-1 leading-tight">
                            {episode.name}
                          </h4>
                          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                            {episode.overview || 'No description available.'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            {episode.air_date && (
                              <span>{new Date(episode.air_date).toLocaleDateString()}</span>
                            )}
                            {episode.vote_average > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {(episode.vote_average || 0).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleEpisodeSelect(episode.episode_number)}
                            className="p-2 rounded-full bg-[#ff0000]/20 text-[#ff0000] hover:bg-[#ff0000]/30 transition-all duration-300"
                            title="Play episode"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleEpisodeWatched(episode.episode_number, selectedSeason.season_number)}
                            className={`p-2 rounded-full transition-all duration-300 ${isWatched
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'
                              }`}
                            title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No episodes available</p>
            <p className="text-gray-500 text-sm mt-1">Select a season to view episodes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonsEpisodesSection;
