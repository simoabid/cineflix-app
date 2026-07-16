import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

import { PStreamPlayer } from '@/components/player/PStreamPlayer';
import { ScrapingOverlay } from '@/components/player/overlays/ScrapingOverlay';
import { useScrape } from '@/hooks/useScrape';
import { usePlayer } from '@/hooks/usePlayer';
import { playerStatus } from '@/stores/player/slices/source';
import type { PlayerMeta } from '@/stores/player/slices/source';
import { usePlayerStore } from '@/stores/player/store';
import { useProgressStore, getSavedProgress } from '@/stores/progress';
import {
  convertCaptions,
  convertStreamToSource,
} from '@/lib/providers/stream-utils';
import { prepareStreamWithExtension } from '@/lib/providers/extension';
import type { ScrapeMedia } from '@/lib/providers';
import type { Movie, TVShow } from '@/types';
import { setCachedMetadata } from '@/backend/helpers/providerApi';
import { getProviders } from '@/backend/providers/providers';

interface NativePlayerSectionProps {
  content: Movie | TVShow;
  contentType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  onFallbackToIframe: () => void;
}

type NativePlayerPhase = 'idle' | 'scraping' | 'playing' | 'error' | 'notfound';

/**
 * Builds PlayerMeta from CINEFLIX content data.
 */
function buildPlayerMeta(
  content: Movie | TVShow,
  contentType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): PlayerMeta {
  const title = 'title' in content ? content.title : content.name;
  const releaseYear = new Date(
    'release_date' in content ? content.release_date : content.first_air_date,
  ).getFullYear();
  const meta: PlayerMeta = {
    type: contentType === 'movie' ? 'movie' : 'show',
    title,
    tmdbId: String(content.id),
    releaseYear,
    poster: content.poster_path
      ? `https://image.tmdb.org/t/p/w342${content.poster_path}`
      : undefined,
    overview: content.overview,
  };
  if (contentType === 'tv' && season && episode) {
    const tvShow = content as TVShow;
    const seasonData = tvShow.seasons?.find((s) => s.season_number === season);
    meta.season = {
      number: season,
      tmdbId: String(seasonData?.id ?? season),
      title: seasonData?.name ?? `Season ${season}`,
    };
    meta.episode = {
      number: episode,
      tmdbId: `${content.id}-s${season}e${episode}`,
      title: `Episode ${episode}`,
    };
  }
  return meta;
}

/**
 * Builds ScrapeMedia from content data for the provider engine.
 */
function buildScrapeMedia(
  content: Movie | TVShow,
  contentType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): ScrapeMedia {
  if (contentType === 'movie') {
    const movie = content as Movie;
    return {
      type: 'movie',
      title: movie.title,
      releaseYear: new Date(movie.release_date).getFullYear(),
      tmdbId: String(movie.id),
      imdbId: movie.imdb_id,
    };
  }
  const tvShow = content as TVShow;
  return {
    type: 'show',
    title: tvShow.name,
    releaseYear: new Date(tvShow.first_air_date).getFullYear(),
    tmdbId: String(tvShow.id),
    episode: {
      number: episode ?? 1,
      tmdbId: `${tvShow.id}-s${season ?? 1}e${episode ?? 1}`,
    },
    season: {
      number: season ?? 1,
      tmdbId: String(season ?? 1),
      title: `Season ${season ?? 1}`,
    },
  };
}

/**
 * NativePlayerSection manages the complete lifecycle of the native player:
 * 1. User clicks "Smart Player" → starts scraping
 * 2. Scraping progress displayed via ScrapingOverlay
 * 3. First successful result → auto-starts playback
 * 4. Error/not-found → shows retry UI with fallback option
 */
export function NativePlayerSection({
  content,
  contentType,
  season,
  episode,
  onFallbackToIframe,
}: NativePlayerSectionProps): React.ReactElement {
  const {
    startScraping,
    sources,
    sourceOrder,
    currentSource,
    isScraping,
  } = useScrape();

  const {
    playMedia,
    setMeta,
    setScrapeStatus,
    setScrapeNotFound,
    setPlaybackError,
    reset,
    status,
  } = usePlayer();

  const [phase, setPhase] = useState<NativePlayerPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeSourceId = usePlayerStore((s) => s.sourceId);
  const activeEmbedId = usePlayerStore((s) => s.embedId);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const addFailedEmbed = usePlayerStore((s) => s.addFailedEmbed);
  const clearFailedSources = usePlayerStore((s) => s.clearFailedSources);
  const clearFailedEmbeds = usePlayerStore((s) => s.clearFailedEmbeds);

  // Populate provider metadata cache so settings source selector can list sources
  useEffect(() => {
    const providers = getProviders();
    setCachedMetadata([
      ...providers.listSources(),
      ...providers.listEmbeds(),
    ]);
  }, []);

  const title = 'title' in content ? content.title : content.name;
  const backdropUrl = content.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`
    : undefined;
  const posterUrl = content.poster_path
    ? `https://image.tmdb.org/t/p/w342${content.poster_path}`
    : undefined;

  const handleStartScraping = useCallback(async () => {
    setPhase('scraping');
    setErrorMessage(null);
    reset();
    const meta = buildPlayerMeta(content, contentType, season, episode);
    setMeta(meta, playerStatus.SCRAPING);
    setScrapeStatus();

    // Get saved progress from progress store
    const progressItems = useProgressStore.getState().items;
    const startTime = getSavedProgress(progressItems, meta);

    const media = buildScrapeMedia(content, contentType, season, episode);
    try {
      const result = await startScraping(media);
      if (!result) {
        setPhase('notfound');
        setScrapeNotFound();
        return;
      }
      await prepareStreamWithExtension(result.stream);
      const sourceData = convertStreamToSource(result);
      const captions = convertCaptions(result.stream.captions ?? []);
      clearFailedSources();
      clearFailedEmbeds();
      playMedia(sourceData, captions, result.sourceId, startTime);
      setPhase('playing');
    } catch (err) {
      console.error('Scraping failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Scraping failed unexpectedly');
      setPhase('error');
      setPlaybackError();
    }
  }, [
    content, contentType, season, episode,
    startScraping, playMedia, setMeta, setScrapeStatus,
    setScrapeNotFound, setPlaybackError, reset,
  ]);

  // Start/restart scraping when content or episode/season changes
  useEffect(() => {
    handleStartScraping();
  }, [handleStartScraping]);

  // Track playback errors from the store
  useEffect(() => {
    if (status === playerStatus.PLAYBACK_ERROR && phase === 'playing') {
      if (activeSourceId && activeEmbedId) addFailedEmbed(activeSourceId, activeEmbedId);
      else if (activeSourceId) addFailedSource(activeSourceId);
      setPhase('error');
      setErrorMessage('Playback failed — the stream may have expired or been blocked.');
    }
  }, [
    activeEmbedId,
    activeSourceId,
    addFailedEmbed,
    addFailedSource,
    phase,
    status,
  ]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black overflow-hidden"
      role="region"
      aria-label="Native video player"
    >
      <AnimatePresence mode="wait">
        {/* Scraping phase */}
        {phase === 'scraping' && (
          <motion.div
            key="scraping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={onFallbackToIframe}>
              <div className="absolute inset-0 z-10">
                <ScrapingOverlay
                  sources={sources}
                  sourceOrder={sourceOrder}
                  currentSource={currentSource}
                  isScraping={isScraping}
                  backdropUrl={backdropUrl}
                  posterUrl={posterUrl}
                  mediaTitle={title}
                  mediaType={contentType}
                  seasonNumber={season}
                  episodeNumber={episode}
                />
              </div>
            </PStreamPlayer>
          </motion.div>
        )}

        {/* Playing phase */}
        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={onFallbackToIframe} />
          </motion.div>
        )}

        {/* Not found phase */}
        {phase === 'notfound' && (
          <motion.div
            key="notfound"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={onFallbackToIframe}>
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background-main">
                <div className="text-center max-w-sm px-6">
                  <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-7 w-7 text-gray-400" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">
                    No Sources Found
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    The smart player couldn&apos;t find any working streams for this content.
                    Try the classic player instead.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleStartScraping}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      aria-label="Retry scanning"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </button>
                    <button
                      onClick={onFallbackToIframe}
                      className="flex items-center gap-2 px-4 py-2.5 bg-buttons-purple text-white text-sm rounded-lg hover:bg-buttons-purpleHover transition-colors"
                      aria-label="Switch to classic player"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Classic Player
                    </button>
                  </div>
                </div>
              </div>
            </PStreamPlayer>
          </motion.div>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={onFallbackToIframe}>
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background-main">
                <div className="text-center max-w-sm px-6">
                  <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">
                    Playback Error
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">
                    {errorMessage ?? 'Something went wrong during playback.'}
                  </p>
                  <p className="text-gray-500 text-xs mb-6">
                    This can happen when a stream source blocks direct access.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleStartScraping}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      aria-label="Retry scanning"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </button>
                    <button
                      onClick={onFallbackToIframe}
                      className="flex items-center gap-2 px-4 py-2.5 bg-buttons-purple text-white text-sm rounded-lg hover:bg-buttons-purpleHover transition-colors"
                      aria-label="Switch to classic player"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Classic Player
                    </button>
                  </div>
                </div>
              </div>
            </PStreamPlayer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
