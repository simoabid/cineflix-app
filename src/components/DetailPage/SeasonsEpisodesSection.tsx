import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Film, Check } from 'lucide-react';
import { Season, SeasonDetails } from '../../types';
import { getPosterUrl } from '../../services/tmdb';
import EpisodesList from './EpisodesList';
import SectionHeader from './SectionHeader';
import LoadingScreen from '../feedback/LoadingScreen';
import { logger } from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { myListApi } from '../../services/api';

interface SeasonsEpisodesSectionProps {
  readonly seasons: Season[];
  readonly selectedSeason: Season | null;
  readonly selectedSeasonDetails: SeasonDetails | null;
  readonly loading: boolean;
  readonly onSeasonChange: (season: Season) => void;
  readonly seriesId?: string;
}

/**
 * Custom hook to manage a Set persisted in localStorage.
 */
function usePersistedSet(key: string): [Set<string>, (updater: (prev: Set<string>) => Set<string>) => void] {
  const [value, setValue] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setValue(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch {
      setValue(new Set());
    }
  }, [key]);

  const update = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setValue(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch (err) {
        logger.error('Error saving watched episodes:', err);
      }
      return next;
    });
  }, [key]);

  return [value, update];
}

/**
 * Wraps the season picker (poster carousel) and the episodes list. Shows a
 * loading state while a season is being fetched and an empty state when no
 * episodes are available.
 */
const SeasonsEpisodesSection: React.FC<SeasonsEpisodesSectionProps> = ({
  seasons,
  selectedSeason,
  selectedSeasonDetails,
  loading,
  onSeasonChange,
  seriesId,
}) => {
  const storageKey = `cineflix_watched_${seriesId || 'default'}`;
  const [watchedEpisodes, setWatchedEpisodes] = usePersistedSet(storageKey);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();
  const [episodeProgress, setEpisodeProgress] = useState<{ season: number; episode: number; progress: number } | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      // 1. Try to load from localStorage first (immediate)
      try {
        const stored = localStorage.getItem('cineflix_watch_progress');
        if (stored) {
          const parsed = JSON.parse(stored);
          const key = `tv_${seriesId}`;
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
      if (isAuthenticated && seriesId) {
        try {
          const response = await myListApi.getContinueWatching();
          if (response.success && response.data) {
            const showItem = response.data.find(
              (item: any) => item.contentType === 'tv' && String(item.contentId) === String(seriesId)
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
  }, [seriesId, isAuthenticated]);

  const toggleEpisodeWatched = (episodeId: string) => {
    setWatchedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) next.delete(episodeId);
      else next.add(episodeId);
      return next;
    });
  };

  const visibleSeasons = seasons.filter(s => s.season_number >= 0);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-netflix-red/[0.08] via-white/[0.02] to-transparent border border-netflix-red/20 p-5 sm:p-7 md:p-8">
      {/* Decorative glow */}
      <div className="absolute -top-32 -right-32 w-72 h-72 bg-netflix-red/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <SectionHeader
          eyebrow="Watch the Series"
          icon={Film}
          title="Seasons & Episodes"
          size="md"
          action={
            selectedSeason && (
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-xs font-medium border border-white/10">
                <Film className="w-3.5 h-3.5 text-netflix-red" />
                <span className="text-white">Season {selectedSeason.season_number}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-300">
                  {selectedSeasonDetails?.episodes?.length || 0} eps
                </span>
              </div>
            )
          }
        />

        {/* Season Posters Carousel */}
        {visibleSeasons.length > 0 && (
          <div className="mb-7">
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-2.5 pb-4 px-1.5 -mx-1.5 scrollbar-hide">
              {visibleSeasons.map((season) => {
                const isSelected = selectedSeason?.id === season.id;
                return (
                  <motion.button
                    key={season.id}
                    onClick={() => onSeasonChange(season)}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`flex-shrink-0 group relative overflow-hidden rounded-2xl transition-all duration-300 flex flex-col ${
                      isSelected
                        ? 'border border-netflix-red/60 bg-netflix-red/[0.04] shadow-[0_12px_30px_rgba(229,9,20,0.4)] ring-2 ring-netflix-red/35'
                        : 'border border-white/10 bg-white/[0.02] hover:border-netflix-red/40 hover:bg-white/[0.05] hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]'
                    }`}
                    aria-label={`Select Season ${season.season_number}`}
                    aria-pressed={isSelected}
                  >
                    <div className="w-28 h-40 sm:w-32 sm:h-44 relative overflow-hidden rounded-t-2xl">
                      {season.poster_path ? (
                        <img
                          src={getPosterUrl(season.poster_path, 'w300')}
                          alt={season.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                          <Film className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {/* Glassy reflection overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      
                      {/* Selection checkmark badge */}
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-netflix-red rounded-full flex items-center justify-center shadow-lg shadow-netflix-red/50 z-10">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    {/* Bottom Info Bar */}
                    <div className="p-3 bg-gradient-to-b from-white/[0.02] to-black/40 border-t border-white/5 w-full text-center">
                      <p className={`font-bold text-xs sm:text-sm tracking-wide transition-colors duration-300 ${
                        isSelected ? 'text-netflix-red' : 'text-white group-hover:text-netflix-red'
                      }`}>
                        {season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`}
                      </p>
                      <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5 font-medium">
                        {season.episode_count} Episodes
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Episodes List */}
        {loading ? (
          <LoadingScreen inline message="Loading episodes..." />
        ) : selectedSeasonDetails?.episodes && selectedSeasonDetails.episodes.length > 0 ? (
          <EpisodesList
            episodes={selectedSeasonDetails.episodes}
            selectedSeason={selectedSeason}
            watchedEpisodes={watchedEpisodes}
            expandedEpisode={expandedEpisode}
            onToggleWatched={toggleEpisodeWatched}
            onToggleExpanded={setExpandedEpisode}
            seriesId={seriesId}
            episodeProgress={episodeProgress}
          />
        ) : (
          <div className="text-center py-14 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Film className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-base font-medium">No episodes available for this season</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for updates</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SeasonsEpisodesSection;
