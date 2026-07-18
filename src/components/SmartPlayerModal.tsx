import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowRight, SkipForward } from 'lucide-react';
import {
  cineproProviderIdFromSourceId,
  findNextCachedSibling,
} from '@/services/cinepro-adapter/playable';

import { PStreamPlayer } from '@/components/player/PStreamPlayer';
import { ScrapingOverlay } from '@/components/player/overlays/ScrapingOverlay';
import { useScrape } from '@/hooks/useScrape';
import { usePlayer } from '@/hooks/usePlayer';
import { getMediaKey, playerStatus } from '@/stores/player/slices/source';
import type { PlayerMeta } from '@/stores/player/slices/source';
import { usePlayerStore } from '@/stores/player/store';
import { useProgressStore, getSavedProgress } from '@/stores/progress';
import {
  convertCaptions,
  convertStreamToSource,
} from '@/lib/providers/stream-utils';
import { prepareStreamWithExtension } from '@/lib/providers/extension';
import type { ScrapeMedia } from '@/lib/providers';
import type { Movie, TVShow, StreamSource } from '@/types';
import { setCachedMetadata } from '@/backend/helpers/providerApi';
import { getProviders } from '@/backend/providers/providers';
import { useSmartPlayer } from '@/hooks/useSmartPlayer';
import { useCineProStore } from '@/stores/cinepro';
import { useLenisToggle } from '@/hooks/useLenisToggle';

type NativePlayerPhase = 'idle' | 'scraping' | 'playing' | 'error' | 'notfound' | 'classic';

function resolveImdbId(content: Movie | TVShow): string | undefined {
  if ('imdb_id' in content && content.imdb_id) return content.imdb_id;
  const ext = (content as TVShow).external_ids?.imdb_id;
  return ext || undefined;
}

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
    imdbId: resolveImdbId(content),
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
      imdbId: resolveImdbId(movie),
    };
  }
  const tvShow = content as TVShow;
  return {
    type: 'show',
    title: tvShow.name,
    releaseYear: new Date(tvShow.first_air_date).getFullYear(),
    tmdbId: String(tvShow.id),
    imdbId: resolveImdbId(tvShow),
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

export function SmartPlayerModal(): React.ReactElement | null {
  const {
    isOpen,
    currentRequest,
    content,
    selectedSeason,
    selectedEpisode,
    setSelectedSeason,
    setSelectedEpisode,
    streamSources,
    selectedSource,
    setSelectedSource,
    closePlayer,
  } = useSmartPlayer();

  useLenisToggle(isOpen);

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
  const [previousPath, setPreviousPath] = useState<string>('/');

  const activeSourceId = usePlayerStore((s) => s.sourceId);
  const displayMode = usePlayerStore((s) => s.displayMode);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const addFailedEmbed = usePlayerStore((s) => s.addFailedEmbed);
  const clearFailedSources = usePlayerStore((s) => s.clearFailedSources);
  const clearFailedEmbeds = usePlayerStore((s) => s.clearFailedEmbeds);
  const switchToClassic = usePlayerStore((s) => s.switchToClassic);
  const switchToNativeStore = usePlayerStore((s) => s.switchToNative);

  // Populate provider metadata cache
  useEffect(() => {
    const providers = getProviders();
    setCachedMetadata([
      ...providers.listSources(),
      ...providers.listEmbeds(),
    ]);
  }, []);

  // Track the previous path before launching the player so we can restore it on close
  useEffect(() => {
    if (isOpen) {
      setPreviousPath(window.location.pathname + window.location.search);
    }
  }, [isOpen]);

  // Silent URL Updates for Deep-Linking
  useEffect(() => {
    if (isOpen && content && currentRequest) {
      const baseUrl = `/watch/${currentRequest.type}/${content.id}`;
      const queryParams = currentRequest.type === 'tv'
        ? `?season=${selectedSeason}&episode=${selectedEpisode}`
        : '';
      window.history.pushState({ smartPlayer: true }, '', `${baseUrl}${queryParams}`);
    }
  }, [isOpen, content, selectedSeason, selectedEpisode, currentRequest]);

  // Close player handler
  const handleClose = useCallback(() => {
    closePlayer();
    reset();
    switchToNativeStore();
    window.history.pushState({}, '', previousPath);
  }, [closePlayer, reset, switchToNativeStore, previousPath]);

  const autoAdvanceLock = React.useRef(false);

  // Scraper Engine Lifecycle — preserves failed providers across retries
  const handleStartScraping = useCallback(async (opts?: { fresh?: boolean }) => {
    if (!content || !currentRequest) return;
    setPhase('scraping');
    setErrorMessage(null);
    autoAdvanceLock.current = false;
    if (opts?.fresh) {
      clearFailedSources();
      clearFailedEmbeds();
    }
    reset();

    const contentType = currentRequest.type;
    const meta = buildPlayerMeta(content, contentType, selectedSeason, selectedEpisode);
    setMeta(meta, playerStatus.SCRAPING);
    setScrapeStatus();

    const progressItems = useProgressStore.getState().items;
    const startTime = getSavedProgress(progressItems, meta);

    const media = buildScrapeMedia(content, contentType, selectedSeason, selectedEpisode);
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

      const isCinePro = result.sourceId?.startsWith('cinepro-') ?? false;
      let cineproName: string | null = null;
      if (isCinePro && result.sourceId) {
        const cached = useCineProStore.getState().scrapedStreams.find(
          (s) => s.sourceId === result.sourceId
        );
        cineproName =
          cached?.providerName ??
          cineproProviderIdFromSourceId(result.sourceId) ??
          result.sourceId.replace('cinepro-', '');
      }

      playMedia(
        sourceData,
        captions,
        result.sourceId,
        startTime,
        isCinePro ? 'cinepro' : 'pstream',
        cineproName
      );
      setPhase('playing');
    } catch (err) {
      console.error('Scraping failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Scraping failed unexpectedly');
      setPhase('error');
      setPlaybackError();
    }
  }, [
    content, currentRequest, selectedSeason, selectedEpisode,
    startScraping, playMedia, setMeta, setScrapeStatus,
    setScrapeNotFound, setPlaybackError, reset,
    clearFailedSources, clearFailedEmbeds
  ]);

  /** Sibling sub-server first, then next provider. */
  const failForward = useCallback(async () => {
    const state = usePlayerStore.getState();
    const sid = state.sourceId;
    const embed = state.embedId;
    const mediaKey = getMediaKey(state.meta);

    if (sid && embed) addFailedEmbed(sid, embed);
    else if (sid) addFailedSource(sid);

    if (sid?.startsWith('cinepro-') && !embed) {
      const failedList = mediaKey
        ? (usePlayerStore.getState().failedSourcesPerMedia[mediaKey] ?? [])
        : [sid];
      const cached = useCineProStore.getState().scrapedStreams;
      const nextId = findNextCachedSibling(sid, cached, failedList);
      const next = nextId
        ? cached.find((c) => c.sourceId === nextId)
        : undefined;
      if (next) {
        const sourceData = convertStreamToSource({ stream: next.stream });
        const captions = convertCaptions(next.stream.captions ?? []);
        playMedia(
          sourceData,
          captions,
          next.sourceId,
          state.progress.time,
          'cinepro',
          next.providerName,
        );
        setPhase('playing');
        setErrorMessage(null);
        return;
      }
      const bare = cineproProviderIdFromSourceId(sid);
      if (bare) addFailedSource(`cinepro-${bare}`);
    }

    await handleStartScraping();
  }, [addFailedEmbed, addFailedSource, handleStartScraping, playMedia]);

  const handleTryNextProvider = useCallback(() => {
    void failForward();
  }, [failForward]);

  // Handle Classic Sources Switch
  const handleClassicFallback = useCallback(() => {
    if (streamSources.length > 0 && selectedSource) {
      setSelectedSource(selectedSource);
      switchToClassic(selectedSource);
      setPhase('classic');
    } else {
      const defaultFallback: StreamSource = {
        id: 'vidjoy_player',
        name: 'Vidjoy',
        url: `https://vidjoy.pro/embed/${currentRequest?.type}/${content?.id}${currentRequest?.type === 'tv' ? `/${selectedSeason}/${selectedEpisode}` : ''}`,
        type: 'hls',
        quality: 'FHD',
        fileSize: 'Auto',
        reliability: 'Premium',
        isAdFree: true,
      };
      setSelectedSource(defaultFallback);
      switchToClassic(defaultFallback);
      setPhase('classic');
    }
  }, [streamSources, selectedSource, currentRequest, content, selectedSeason, selectedEpisode, setSelectedSource, switchToClassic]);

  // Sync player mode phase with the store displayMode
  useEffect(() => {
    if (displayMode === 'iframe') {
      setPhase('classic');
    } else if (displayMode === 'native' && phase === 'classic') {
      handleStartScraping();
    }
  }, [displayMode, phase, handleStartScraping]);
  // note: classic→native re-entry uses preserve failures by default

  // Start scraping when player is opened in native mode
  useEffect(() => {
    if (isOpen && content && displayMode === 'native') {
      void handleStartScraping({ fresh: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, content, selectedSeason, selectedEpisode, displayMode]);

  // Handle episode changes inside iframe (classic) mode
  useEffect(() => {
    if (isOpen && displayMode === 'iframe' && streamSources.length > 0 && selectedSource) {
      switchToClassic(selectedSource);
    }
  }, [selectedSeason, selectedEpisode, selectedSource, displayMode, isOpen, switchToClassic]);

  // Playback error: sub-server siblings first, then next provider
  useEffect(() => {
    if (status !== playerStatus.PLAYBACK_ERROR || phase !== 'playing') return;
    if (autoAdvanceLock.current) return;
    autoAdvanceLock.current = true;
    const bare = cineproProviderIdFromSourceId(activeSourceId);
    setErrorMessage(
      `“${bare ?? activeSourceId ?? 'unknown'}” could not play. Trying next server…`,
    );
    void failForward().finally(() => {
      autoAdvanceLock.current = false;
    });
  }, [activeSourceId, failForward, phase, status]);

  // Handle episode changes from inside the player controls
  const handleMetaChange = useCallback((newMeta: PlayerMeta) => {
    if (newMeta.season?.number) {
      setSelectedSeason(newMeta.season.number);
    }
    if (newMeta.episode?.number) {
      setSelectedEpisode(newMeta.episode.number);
    }
  }, [setSelectedSeason, setSelectedEpisode]);

  if (!isOpen || !content || !currentRequest) return null;

  const title = 'title' in content ? content.title : content.name;
  const backdropUrl = content.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`
    : undefined;
  const posterUrl = content.poster_path
    ? `https://image.tmdb.org/t/p/w342${content.poster_path}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black overflow-hidden"
      role="region"
      aria-label="Smart stream player"
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
            <PStreamPlayer onBack={handleClose} onMetaChange={handleMetaChange}>
              <div className="absolute inset-0 z-10">
                <ScrapingOverlay
                  sources={sources}
                  sourceOrder={sourceOrder}
                  currentSource={currentSource}
                  isScraping={isScraping}
                  backdropUrl={backdropUrl}
                  posterUrl={posterUrl}
                  mediaTitle={title}
                  mediaType={currentRequest.type}
                  seasonNumber={selectedSeason}
                  episodeNumber={selectedEpisode}
                />
              </div>
            </PStreamPlayer>
          </motion.div>
        )}

        {/* Playing (Native) phase */}
        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={handleClose} onMetaChange={handleMetaChange} />
          </motion.div>
        )}

        {/* Classic Iframe phase */}
        {phase === 'classic' && (
          <motion.div
            key="classic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={handleClose} onMetaChange={handleMetaChange} />
          </motion.div>
        )}

        {/* Not found fallback screen */}
        {phase === 'notfound' && (
          <motion.div
            key="notfound"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={handleClose} onMetaChange={handleMetaChange}>
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background-main">
                <div className="text-center max-w-md px-6 py-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                  <h3 className="text-white text-xl font-bold mb-3">
                    No Native Streams Found
                  </h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    The Smart Player couldn&apos;t find any premium direct streams. We suggest switching to classic iframe servers as an alternative fallback.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => void handleStartScraping({ fresh: true })}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                      aria-label="Retry scanning"
                    >
                      <RotateCcw className="h-4 w-4 animate-spin-once" />
                      Clear failures &amp; re-scan
                    </button>
                    <button
                      onClick={handleClassicFallback}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 hover:shadow-purple-500/20 hover:shadow-lg transition-all active:scale-95"
                      aria-label="Switch to classic player"
                    >
                      <span>Try Classic Sources</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </PStreamPlayer>
          </motion.div>
        )}

        {/* Error phase screen */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen"
          >
            <PStreamPlayer onBack={handleClose} onMetaChange={handleMetaChange}>
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background-main">
                <div className="text-center max-w-md px-6 py-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-buttons-purple/20">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-white text-xl font-bold mb-3">
                    Stream Playback Error
                  </h3>
                  <p className="text-gray-400 text-sm mb-2 leading-relaxed">
                    {errorMessage ?? 'Something went wrong during native stream playback.'}
                  </p>
                  <p className="text-gray-500 text-xs mb-8 leading-relaxed">
                    This can happen when a server blocks direct video streaming access. Try switching to classic embed servers.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleTryNextProvider}
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 transition-all active:scale-95"
                      aria-label="Try next provider"
                    >
                      <SkipForward className="h-4 w-4" />
                      Try next provider
                    </button>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => void handleStartScraping()}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                        aria-label="Retry scan skipping failed providers"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry (skip failed)
                      </button>
                      <button
                        onClick={handleClassicFallback}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                        aria-label="Switch to classic player"
                      >
                        <span>Classic Sources</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
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
