import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowRight, SkipForward, Server } from 'lucide-react';
import { analytics } from '@/services/analytics';

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
import { useLenisDisable } from '@/hooks/useLenisDisable';
import {
  cineproProviderIdFromSourceId,
  findNextCachedSibling,
} from '@/services/cinepro-adapter/playable';
import { useOverlayRouter } from '@/hooks/useOverlayRouter';

type NativePlayerPhase = 'idle' | 'scraping' | 'playing' | 'error' | 'notfound' | 'classic';

type PlaybackErrorInfo = {
  title: string;
  message: string;
  detail?: string;
  providerId?: string | null;
  providerName?: string | null;
  sourceId?: string | null;
};

interface SmartPlayerPageProps {
  type: 'movie' | 'tv';
}

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
 * SmartPlayerPage renders the Smart Player as a dedicated full-screen routed page
 * at /watch/movie/:id and /watch/tv/:id.
 * On close it calls navigate(-1) to return to wherever the user came from.
 */
export const SmartPlayerPage: React.FC<SmartPlayerPageProps> = ({ type }) => {
  useLenisDisable();

  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    openPlayer,
    content,
    selectedSeason,
    selectedEpisode,
    setSelectedSeason,
    setSelectedEpisode,
    currentRequest,
    streamSources,
    selectedSource,
    setSelectedSource,
    closePlayer,
    isOpen,
  } = useSmartPlayer();

  const { startScraping, sources, sourceOrder, currentSource, isScraping } = useScrape();

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
  const [playbackError, setPlaybackErrorInfo] = useState<PlaybackErrorInfo | null>(null);
  /** Prevents re-entrant auto-advance while the next scrape is already starting */
  const autoAdvanceLock = React.useRef(false);

  const activeSourceId = usePlayerStore((s) => s.sourceId);
  const activeEmbedId = usePlayerStore((s) => s.embedId);
  const displayMode = usePlayerStore((s) => s.displayMode);
  const cineproProviderName = usePlayerStore((s) => s.cineproProviderName);
  const sourceOrigin = usePlayerStore((s) => s.sourceOrigin);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const addFailedEmbed = usePlayerStore((s) => s.addFailedEmbed);
  const clearFailedSources = usePlayerStore((s) => s.clearFailedSources);
  const clearFailedEmbeds = usePlayerStore((s) => s.clearFailedEmbeds);
  const switchToClassic = usePlayerStore((s) => s.switchToClassic);
  const switchToNativeStore = usePlayerStore((s) => s.switchToNative);
  const settingsRouter = useOverlayRouter('settings');

  // Populate provider metadata cache once
  useEffect(() => {
    const providers = getProviders();
    setCachedMetadata([...providers.listSources(), ...providers.listEmbeds()]);
  }, []);

  // On mount — open the player via context so content + sources are fetched
  useEffect(() => {
    if (!id) return;
    const tmdbId = parseInt(id, 10);
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!, 10) : 1;
    const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!, 10) : 1;
    openPlayer({ tmdbId, type, season, episode });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  // Keep the URL in sync when season/episode change (TV shows)
  useEffect(() => {
    if (type === 'tv') {
      setSearchParams(
        { season: String(selectedSeason), episode: String(selectedEpisode) },
        { replace: true },
      );
    }
  }, [selectedSeason, selectedEpisode, type, setSearchParams]);

  // Close handler — go back to wherever the user came from
  const handleClose = useCallback(() => {
    closePlayer();
    reset();
    switchToNativeStore();
    navigate(-1);
  }, [closePlayer, reset, switchToNativeStore, navigate]);

  /**
   * Progressive scrape + play. Preserves failed-provider list so Retry / Try next
   * skip sources that already failed resolve or playback (resolve ≠ playback).
   */
  const handleStartScraping = useCallback(async (opts?: {
    /** Soft reset that keeps failure memory (default true for retries). */
    preserveFailures?: boolean;
    /** Fresh open of a title — clear failure memory. */
    fresh?: boolean;
  }) => {
    if (!content || !currentRequest) return;
    setPhase('scraping');
    setPlaybackErrorInfo(null);
    autoAdvanceLock.current = false;

    if (opts?.fresh) {
      clearFailedSources();
      clearFailedEmbeds();
    }

    // Soft reset: clear stream state but keep failedSourcesPerMedia (reset() already preserves it)
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
        setPlaybackErrorInfo({
          title: 'No playable providers left',
          message:
            'Every server either returned no streams or already failed playback. Try classic embed sources or clear and scan again.',
        });
        return;
      }
      await prepareStreamWithExtension(result.stream);
      const sourceData = convertStreamToSource(result);
      const captions = convertCaptions(result.stream.captions ?? []);

      const isCinePro = result.sourceId?.startsWith('cinepro-') ?? false;
      let providerName: string | null = null;
      if (isCinePro && result.sourceId) {
        const cached = useCineProStore.getState().scrapedStreams.find(
          (s) => s.sourceId === result.sourceId,
        );
        const bare = cineproProviderIdFromSourceId(result.sourceId);
        providerName =
          cached?.providerName ?? bare ?? result.sourceId.replace('cinepro-', '');
      }

      playMedia(
        sourceData,
        captions,
        result.sourceId,
        startTime,
        isCinePro ? 'cinepro' : 'pstream',
        providerName,
      );
      const mediaTitle = 'title' in content ? content.title : content.name;
      analytics.trackWatchStart({
        contentId: content.id,
        contentTitle: mediaTitle,
        contentType: type,
        source: result.sourceId || 'unknown'
      });
      setPhase('playing');
    } catch (err) {
      console.error('Scraping failed:', err);
      setPlaybackErrorInfo({
        title: 'Scraping failed',
        message: err instanceof Error ? err.message : 'Scraping failed unexpectedly',
        detail: 'The progressive scan threw before a stream could be started.',
      });
      setPhase('error');
      setPlaybackError();
    }
  }, [
    content, currentRequest, selectedSeason, selectedEpisode,
    startScraping, playMedia, setMeta, setScrapeStatus,
    setScrapeNotFound, setPlaybackError, reset,
    clearFailedSources, clearFailedEmbeds, type,
  ]);

  /**
   * Fail-forward after a bad stream:
   * 1) Mark this exact stream id failed
   * 2) If same provider has more cached sub-servers (Bravo…), play next now
   * 3) Else mark whole provider failed and progressive-scrape the next provider
   */
  const failForward = useCallback(async () => {
    const state = usePlayerStore.getState();
    const sid = state.sourceId;
    const embed = state.embedId;
    const mediaKey = getMediaKey(state.meta);

    if (sid && embed) addFailedEmbed(sid, embed);
    else if (sid) addFailedSource(sid);

    // Sibling advance (Alpha → Bravo) without re-scraping the provider
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
        const startTime = state.progress.time;
        const sourceData = convertStreamToSource({ stream: next.stream });
        const captions = convertCaptions(next.stream.captions ?? []);
        playMedia(
          sourceData,
          captions,
          next.sourceId,
          startTime,
          'cinepro',
          next.providerName,
        );
        setPhase('playing');
        setPlaybackErrorInfo(null);
        return;
      }
      // No siblings left — skip entire provider in the waterfall
      const bare = cineproProviderIdFromSourceId(sid);
      if (bare) addFailedSource(`cinepro-${bare}`);
    }

    await handleStartScraping({ preserveFailures: true });
  }, [addFailedEmbed, addFailedSource, handleStartScraping, playMedia]);

  /** Mark current source failed and continue (siblings first, then next provider). */
  const handleTryNextProvider = useCallback(() => {
    void failForward();
  }, [failForward]);

  /** Full retry still skips known failures (does not wipe them). */
  const handleRetryScan = useCallback(() => {
    void handleStartScraping({ preserveFailures: true });
  }, [handleStartScraping]);

  const handleOpenSourceMenu = useCallback(() => {
    // Open in-player settings → sources if overlay is available
    try {
      settingsRouter.open();
      settingsRouter.navigate('/source');
    } catch {
      // Overlay may not be mounted on error shell — fall back to try next
      handleTryNextProvider();
    }
  }, [settingsRouter, handleTryNextProvider]);

  const handleClassicFallback = useCallback(() => {
    const mediaTitle = content ? ('title' in content ? content.title : content.name) : 'unknown';
    if (streamSources.length > 0 && selectedSource) {
      setSelectedSource(selectedSource);
      switchToClassic(selectedSource);
      setPhase('classic');
      analytics.trackWatchStart({
        contentId: content?.id || 0,
        contentTitle: mediaTitle,
        contentType: type,
        source: selectedSource.id || 'classic'
      });
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
      analytics.trackWatchStart({
        contentId: content?.id || 0,
        contentTitle: mediaTitle,
        contentType: type,
        source: defaultFallback.id
      });
    }
  }, [streamSources, selectedSource, currentRequest, content, selectedSeason, selectedEpisode, setSelectedSource, switchToClassic, type]);

  // Sync player mode phase with the store displayMode
  useEffect(() => {
    if (displayMode === 'iframe') {
      setPhase('classic');
    } else if (displayMode === 'native' && phase === 'classic') {
      handleStartScraping();
    }
  }, [displayMode, phase, handleStartScraping]);

  // Start scraping when content is ready in native mode (fresh title → clear old failures)
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

  // Track playback errors: mark this stream failed, try next sub-server
  // (Alpha → Bravo), else next provider. resolve ≠ playback.
  useEffect(() => {
    if (status !== playerStatus.PLAYBACK_ERROR || phase !== 'playing') return;
    if (autoAdvanceLock.current) return;
    autoAdvanceLock.current = true;

    const bareId = cineproProviderIdFromSourceId(activeSourceId);
    const name =
      cineproProviderName || bareId || activeSourceId || 'unknown';
    setPlaybackErrorInfo({
      title: 'Stream playback failed',
      message: `“${name}” could not be played (resolve success ≠ playback). Trying the next server…`,
      detail:
        sourceOrigin === 'cinepro'
          ? `CinePro: ${bareId ?? activeSourceId} · stream ${activeSourceId}. Will try other sub-servers on this provider first, then the next provider.`
          : `Client source id: ${activeSourceId ?? 'n/a'}${activeEmbedId ? ` · embed: ${activeEmbedId}` : ''}.`,
      providerId: bareId ?? activeSourceId,
      providerName: name,
      sourceId: activeSourceId,
    });

    void failForward().finally(() => {
      autoAdvanceLock.current = false;
    });
  }, [
    activeEmbedId,
    activeSourceId,
    cineproProviderName,
    failForward,
    phase,
    sourceOrigin,
    status,
  ]);

  const handleMetaChange = useCallback((newMeta: PlayerMeta) => {
    if (newMeta.season?.number) setSelectedSeason(newMeta.season.number);
    if (newMeta.episode?.number) setSelectedEpisode(newMeta.episode.number);
  }, [setSelectedSeason, setSelectedEpisode]);

  // While the context is loading content, show a blank black screen
  if (!isOpen || !content || !currentRequest) {
    return <div className="fixed inset-0 bg-black" aria-hidden="true" />;
  }

  const title = 'title' in content ? content.title : content.name;
  const backdropUrl = content.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${content.backdrop_path}`
    : undefined;
  const posterUrl = content.poster_path
    ? `https://image.tmdb.org/t/p/w342${content.poster_path}`
    : undefined;

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      role="main"
      aria-label="Smart stream player"
    >
      <AnimatePresence mode="wait">
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
                    {playbackError?.title ?? 'No Native Streams Found'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {playbackError?.message ??
                      "The Smart Player couldn't find any premium direct streams. Try classic iframe servers."}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => void handleStartScraping({ fresh: true })}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                      aria-label="Scan all providers again"
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
                    {playbackError?.title ?? 'Stream Playback Error'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2 leading-relaxed">
                    {playbackError?.message ??
                      'Something went wrong during native stream playback.'}
                  </p>
                  {playbackError?.detail && (
                    <p className="text-gray-500 text-xs mb-2 leading-relaxed font-mono break-words">
                      {playbackError.detail}
                    </p>
                  )}
                  {playbackError?.providerName && (
                    <p className="text-amber-400/90 text-xs mb-6">
                      Failed provider:{' '}
                      <span className="font-semibold">{playbackError.providerName}</span>
                      {playbackError.providerId
                        ? ` (${playbackError.providerId})`
                        : ''}
                      . It will be skipped on the next try.
                    </p>
                  )}
                  {!playbackError?.providerName && (
                    <p className="text-gray-500 text-xs mb-6 leading-relaxed">
                      Resolve success ≠ playback. Trying another server usually helps.
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleTryNextProvider}
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 hover:shadow-purple-500/20 hover:shadow-lg transition-all active:scale-95"
                      aria-label="Try next provider"
                    >
                      <SkipForward className="h-4 w-4" />
                      Try next provider
                    </button>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleRetryScan}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                        aria-label="Retry scan skipping failed providers"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry (skip failed)
                      </button>
                      <button
                        onClick={handleOpenSourceMenu}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                        aria-label="Choose another server"
                      >
                        <Server className="h-4 w-4" />
                        Choose server
                      </button>
                    </div>
                    <button
                      onClick={handleClassicFallback}
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 text-gray-300 font-medium text-sm rounded-xl hover:bg-white/5 transition-all"
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
      </AnimatePresence>
    </div>
  );
};

export default SmartPlayerPage;
