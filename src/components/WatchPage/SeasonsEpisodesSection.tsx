import React, { useState, useEffect } from 'react';
import { Film, Play } from 'lucide-react';
import { TVShow } from '../../types';
import { getTVShowSeasons, getTVShowSeasonDetails, getPosterUrl } from '../../services/tmdb';
import { useAuth } from '../../contexts/AuthContext';
import { watchedEpisodesApi, myListApi } from '../../services/api';

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

  const [episodeProgress, setEpisodeProgress] = useState<{ season: number; episode: number; progress: number } | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      // 1. Try to load from localStorage first (immediate)
      try {
        const stored = localStorage.getItem('cineflix_watch_progress');
        if (stored) {
          const parsed = JSON.parse(stored);
          const key = `tv_${tvShow.id}`;
          if (parsed[key]) {
            const item = parsed[key];
            setEpisodeProgress({
              season: item.seasonNumber || 0,
              episode: item.episodeNumber || 0,
              progress: item.progress || 0,
            });
          }
        }
      } catch (err) {
        console.warn('Error reading local watch progress:', err);
      }

      // 2. If authenticated, fetch from backend to merge/override
      if (isAuthenticated && tvShow.id) {
        try {
          const response = await myListApi.getContinueWatching();
          if (response.success && response.data) {
            const showItem = response.data.find(
              (item: any) => item.contentType === 'tv' && String(item.contentId) === String(tvShow.id)
            );
            if (showItem && showItem.lastEpisode) {
              setEpisodeProgress({
                season: showItem.lastEpisode.seasonNumber,
                episode: showItem.lastEpisode.episodeNumber,
                progress: showItem.progress,
              });
            }
          }
        } catch (err) {
          console.error('Error fetching progress from API:', err);
        }
      }
    };

    fetchProgress();
  }, [tvShow.id, isAuthenticated]);

  // Sync selectedSeason when initialSeason changes externally
  useEffect(() => {
    let active = true;
    const syncSeason = async () => {
      if (seasons.length > 0 && initialSeason) {
        const seasonToSync = seasons.find((s: any) => s.season_number === initialSeason);
        if (seasonToSync && (!selectedSeason || selectedSeason.season_number !== initialSeason)) {
          try {
            setLoadingSeasons(true);
            const seasonDetails = await getTVShowSeasonDetails(tvShow.id, seasonToSync.season_number);
            if (active) {
              setSelectedSeason(seasonToSync);
              setSelectedSeasonDetails(seasonDetails);
            }
          } catch (err) {
            console.error('Error syncing season details:', err);
          } finally {
            if (active) {
              setLoadingSeasons(false);
            }
          }
        }
      }
    };
    syncSeason();
    return () => {
      active = false;
    };
  }, [initialSeason, seasons, tvShow.id]);

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
    <div className="bg-transparent flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white/[0.03] px-4 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base flex items-center">
            <Film className="h-4 w-4 text-red-500 mr-2" />
            Seasons & Episodes
          </h2>
          {selectedSeason && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-medium">S{selectedSeason.season_number}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 font-medium">{selectedSeasonDetails?.episodes?.length || 0} Ep</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {/* Season Selector */}
        {seasons.length > 0 && (
          <div className="mb-6 flex-none">
            <h3 className="text-white font-semibold text-sm mb-3">Select Season</h3>
            <div className="flex gap-3 overflow-x-auto pt-2 pb-3 px-1.5 -mx-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {seasons
                .filter(season => season.season_number >= 0)
                .map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonChange(season)}
                    className={`flex-shrink-0 group relative overflow-hidden rounded-xl transition-all duration-300 flex flex-col border ${
                      selectedSeason?.id === season.id
                        ? 'border-[#ff0000] bg-[#ff0000]/[0.04] shadow-[0_6px_16px_rgba(255,0,0,0.3)] scale-[1.03]'
                        : 'border-white/10 bg-white/[0.02] hover:border-buttons-purple/40 hover:bg-white/[0.04] hover:scale-[1.03] hover:shadow-lg'
                    }`}
                  >
                    <div className="w-20 h-24 relative overflow-hidden rounded-t-xl">
                      {season.poster_path ? (
                        <img
                          src={getPosterUrl(season.poster_path, 'w300')}
                          alt={season.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      {selectedSeason?.id === season.id && (
                        <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-[#ff0000] rounded-full flex items-center justify-center shadow z-10">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="py-1.5 px-1 bg-gradient-to-b from-white/[0.01] to-black/30 border-t border-white/5 w-full text-center">
                      <p className={`font-bold text-[10px] truncate leading-tight transition-colors duration-300 ${
                        selectedSeason?.id === season.id ? 'text-[#ff0000]' : 'text-white group-hover:text-[#ff0000]'
                      }`}>
                        {season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`}
                      </p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-medium">
                        {season.episode_count} ep
                      </p>
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
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <h3 className="text-white font-semibold text-sm px-1">Episodes</h3>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {selectedSeasonDetails.episodes.map((episode: any) => {
                const episodeId = `${selectedSeason.season_number}-${episode.episode_number}`;
                const hasProgress = !!(episodeProgress &&
                  episodeProgress.season === selectedSeason.season_number &&
                  episodeProgress.episode === episode.episode_number);
                const progressPercent = hasProgress ? episodeProgress.progress : 0;
                const isWatched = watchedEpisodes.has(episodeId) || (hasProgress && progressPercent >= 90);
                const isActive = selectedSeason?.season_number === initialSeason && episode.episode_number === initialEpisode;

                return (
                  <div
                    key={episode.id}
                    className={`bg-white/[0.01] rounded-xl border transition-all duration-300 ${
                      isActive
                        ? 'border-[#ff0000] bg-[#ff0000]/[0.02]'
                        : isWatched
                        ? 'border-green-500/20 bg-green-500/[0.02]'
                        : 'border-white/5 hover:border-buttons-purple/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Episode Thumbnail */}
                        <div
                          className="flex-shrink-0 relative group cursor-pointer"
                          onClick={() => handleEpisodeSelect(episode.episode_number)}
                        >
                          <div className="w-20 h-12 rounded-md overflow-hidden bg-gray-700 relative">
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
                            <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center ${
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                              <div className="w-6 h-6 bg-[#ff0000] rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            {hasProgress && progressPercent > 0 && progressPercent < 90 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                                <div
                                  className="h-full bg-[#ff0000]"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-[#ff0000]/20 text-[#ff0000] px-2 py-0.5 rounded-full text-xs font-bold">
                              EP {episode.episode_number}
                            </span>
                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleEpisodeSelect(episode.episode_number);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff0000] hover:bg-buttons-purpleHover text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#ff0000]/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                              title={`Watch Episode ${episode.episode_number}`}
                            >
                              <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                              <span>Watch EP {episode.episode_number}</span>
                            </button>
                            {isWatched && (
                              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Watched
                              </span>
                            )}
                          </div>
                          <h4 className={`font-medium text-sm mb-1 leading-tight transition-colors ${
                            isActive ? 'text-[#ff0000]' : 'text-white'
                          }`}>
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
