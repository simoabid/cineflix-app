import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Share,
  ChevronLeft,
  Zap,
  Monitor,
  Star,
  Plus,
  Check
} from 'lucide-react';

import { Movie, TVShow, WatchProgress, StreamSource } from '../types';
import {
  getMovieDetails,
  getTVShowDetails
} from '../services/tmdb';
import { useMyList } from '../hooks/useMyList';
import { myListService } from '../services/myListService';
import { rivestreamService } from '../services/rivestreamService';
import { SmashyStreamService, type SmashyStreamSource } from '../services/smashystream';
import { Movies111Service, type MovieSource as Movies111Source } from '../services/111movies';
import VideoFrame from '../components/WatchPage/VideoFrame';
import { NativePlayerSection } from '../components/WatchPage/NativePlayerSection';
import StreamSources from '../components/WatchPage/StreamSources';
import SeasonsEpisodesSection from '../components/WatchPage/SeasonsEpisodesSection';
import LoadingScreen from '../components/feedback/LoadingScreen';
import ErrorState from '../components/feedback/ErrorState';



interface WatchPageProps {
  type: 'movie' | 'tv';
}

const WatchPage: React.FC<WatchPageProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isInList, addToList, removeFromList, myListItems } = useMyList();

  // State management
  const [content, setContent] = useState<Movie | TVShow | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);

  // Dual-mode: 'iframe' = classic embed player, 'native' = P-Stream native player
  const [playerMode, setPlayerMode] = useState<'iframe' | 'native'>('iframe');

  const handleSwitchToNative = useCallback(() => {
    setPlayerMode('native');
  }, []);

  const handleFallbackToIframe = useCallback(() => {
    setPlayerMode('iframe');
  }, []);

  // Rivestream data - fetched from the service
  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  // TV Show specific state - used for streaming sources
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    const s = searchParams.get('season');
    return s ? parseInt(s) : 1;
  });
  const [selectedEpisode, setSelectedEpisode] = useState<number>(() => {
    const e = searchParams.get('episode');
    return e ? parseInt(e) : 1;
  });

  // Function to fetch all streaming sources
  const fetchStreamingSources = useCallback(async (contentId: number) => {
    if (!contentId) return;

    try {
      setSourcesLoading(true);
      setSourcesError(null);

      const rivestreamOptions = {
        contentType: type,
        tmdbId: contentId,
        ...(type === 'tv' && { season: selectedSeason, episode: selectedEpisode })
      };

      // Fetch Rivestream sources
      const { streamSources: rivestreamSources } = await rivestreamService.getAllContentData(rivestreamOptions);

      // Generate SmashyStream sources (always generate with TMDB ID)
      let smashyStreamSources: StreamSource[] = [];
      try {
        if (type === 'movie') {
          // Generate with TMDB ID (always available)
          smashyStreamSources = SmashyStreamService.generateMovieSources(contentId).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
          }));
        } else if (type === 'tv') {
          // Generate with TMDB ID (always available)
          smashyStreamSources = SmashyStreamService.generateTVSource(contentId, selectedSeason, selectedEpisode).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
          }));
        }

      } catch (smashyError) {
        console.warn('SmashyStream sources unavailable:', smashyError);
      }

      // Generate 111movies sources (always generate with TMDB ID)
      let movies111Sources: StreamSource[] = [];
      try {
        if (type === 'movie') {
          movies111Sources = Movies111Service.generateMovieSources(contentId).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: Movies111Service.getSupportedSubtitleLanguages()
          }));
        } else if (type === 'tv') {
          movies111Sources = Movies111Service.generateTVSource(contentId, selectedSeason, selectedEpisode).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: Movies111Service.getSupportedSubtitleLanguages()
          }));
        }
      } catch (movies111Error) {
        console.warn('111movies sources unavailable:', movies111Error);
      }

      // Combine all stream sources
      const allStreamSources = [...rivestreamSources, ...smashyStreamSources, ...movies111Sources];

      if (allStreamSources.length === 0) {
        throw new Error('No streaming sources available for this content');
      }

      setStreamSources(allStreamSources);

      // Auto-select VidSrc as default, then fallback to other premium sources
      if (allStreamSources.length > 0) {
        const defaultSource = allStreamSources.find(s => s.id.startsWith('vidsrc_api_')) ||
          allStreamSources.find(s => s.id === 'vidjoy_player') ||
          allStreamSources.find(s => s.id === 'rivestream_server_2') ||
          allStreamSources.find(s => s.reliability === 'Premium') ||
          allStreamSources[0];
        setSelectedSource(defaultSource);
      } else {
        setSelectedSource(null);
      }

    } catch (error) {
      console.error('Error fetching streaming sources:', error);
      setSourcesError(error instanceof Error ? error.message : 'Failed to load streaming sources');

      // Fallback: provide basic sources even if API fails
      const fallbackSources: StreamSource[] = [
        {
          id: 'vidjoy_player',
          name: 'Vidjoy',
          url: `https://vidjoy.pro/embed/${type}/${contentId}${type === 'tv' ? `/${selectedSeason}/${selectedEpisode}` : ''}`,
          type: 'hls',
          quality: 'FHD',
          fileSize: 'Auto',
          reliability: 'Premium',
          isAdFree: true,
          language: 'English',
          subtitles: ['English']
        },
        {
          id: 'rivestream_server_2',
          name: 'Rivestream Server 2',
          url: `https://rivestream.org/embed/agg?type=${type}&id=${contentId}${type === 'tv' ? `&season=${selectedSeason}&episode=${selectedEpisode}` : ''}`,
          type: 'hls',
          quality: 'HD',
          fileSize: 'Auto',
          reliability: 'Premium',
          isAdFree: true,
          language: 'English',
          subtitles: ['English']
        }
      ];

      // Add SmashyStream fallback sources
      try {
        let smashyFallback: SmashyStreamSource[] = [];
        if (type === 'movie') {
          smashyFallback = SmashyStreamService.generateMovieSources(contentId);
        } else if (type === 'tv') {
          smashyFallback = SmashyStreamService.generateTVSource(contentId, selectedSeason, selectedEpisode);
        }

        const smashyFallbackSources = smashyFallback.map(source => ({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          quality: source.quality,
          fileSize: source.fileSize,
          reliability: source.reliability,
          isAdFree: source.isAdFree,
          language: source.language,
          subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
        }));

        fallbackSources.push(...smashyFallbackSources);
      } catch (fallbackError) {
        console.warn('SmashyStream fallback failed:', fallbackError);
      }

      // Add 111movies fallback sources
      try {
        let movies111Fallback: Movies111Source[] = [];
        if (type === 'movie') {
          movies111Fallback = Movies111Service.generateMovieSources(contentId);
        } else if (type === 'tv') {
          movies111Fallback = Movies111Service.generateTVSource(contentId, selectedSeason, selectedEpisode);
        }

        const movies111FallbackSources = movies111Fallback.map(source => ({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          quality: source.quality,
          fileSize: source.fileSize,
          reliability: source.reliability,
          isAdFree: source.isAdFree,
          language: source.language,
          subtitles: Movies111Service.getSupportedSubtitleLanguages()
        }));

        fallbackSources.push(...movies111FallbackSources);
      } catch (fallbackError) {
        console.warn('111movies fallback failed:', fallbackError);
      }

      setStreamSources(fallbackSources);
      if (fallbackSources.length > 0) {
        setSelectedSource(fallbackSources[0]);
      }
    } finally {
      setSourcesLoading(false);
    }
  }, [type, selectedSeason, selectedEpisode]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const contentId = parseInt(id);
        let contentData: Movie | TVShow;

        if (type === 'movie') {
          contentData = await getMovieDetails(contentId);
        } else {
          contentData = await getTVShowDetails(contentId);
        }

        setContent(contentData);

        // Load watch progress from localStorage
        const savedProgress = localStorage.getItem(`watch_progress_${type}_${contentId}`);
        if (savedProgress) {
          setWatchProgress(JSON.parse(savedProgress));
        }

        // Check if content is liked
        try {
          const liked = await myListService.isLiked(contentId, type);
          setIsLiked(liked);
        } catch (error) {
          console.error('Error checking like status:', error);
          setIsLiked(false);
        }

      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, type]);

  // Separate useEffect for fetching streaming sources
  useEffect(() => {
    if (content) {
      fetchStreamingSources(content.id);
    }
  }, [content, type, selectedSeason, selectedEpisode, fetchStreamingSources]);



  const handleAddToList = async () => {
    if (!content) return;

    if (isInList(content.id, type)) {
      // Find the item to remove by content ID from local state
      const itemToRemove = myListItems.find(item =>
        item.contentId === content.id && item.contentType === type
      );
      if (itemToRemove) {
        await removeFromList(itemToRemove.id);
      }
    } else {
      await addToList(content, type);
    }
  };

  const handleLike = async () => {
    if (!content) return;

    try {
      if (isLiked) {
        await myListService.unlikeContent(content.id, type);
        setIsLiked(false);
      } else {
        await myListService.likeContent(content, type);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share && content) {
      navigator.share({
        title,
        text: content.overview,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // Show toast notification
      console.log('Link copied to clipboard');
    }
  };


  if (loading) {
    return <LoadingScreen message="Loading page details..." />;
  }

  if (error || !content) {
    return (
      <ErrorState
        title="Content Not Found"
        message={error || 'The requested content could not be found.'}
        onRetry={() => navigate(-1)}
        retryLabel="Go Back"
      />
    );
  }

  const title = ('title' in content ? content.title : (content as TVShow).name) || '';
  const releaseDate = ('release_date' in content ? content.release_date : (content as TVShow).first_air_date) || '';
  const runtime = type === 'movie' ? (content as Movie).runtime : (content as TVShow).episode_run_time?.[0];

  return (
    <div className="h-screen flex flex-col bg-[#0b0b1e] text-white font-sans lg:overflow-hidden overflow-x-hidden">
      {/* Header bar */}
      <header className="h-12 lg:h-14 border-b border-white/5 bg-[#0b0b1e]/80 backdrop-blur-md px-3 sm:px-4 lg:px-6 flex items-center justify-between z-50 flex-none">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 group shadow-lg shrink-0"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Go back"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold tracking-wide hidden sm:inline">Back to Browse</span>
        </motion.button>
        {type === 'tv' && selectedSeason && selectedEpisode && (
          <div className="text-[10px] sm:text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-wider shrink-0">
            S{selectedSeason} • E{selectedEpisode}
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════
          MOBILE (< lg): Single scrollable column
          DESKTOP (lg+): Two-column fixed layout
          ═══════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden bg-[#0b0b1e]">

        {/* ═══ LEFT COLUMN: Player + Streaming Controls ═══ */}
        <section className="flex-none lg:flex-1 flex flex-col lg:min-h-0 min-w-0">
          {/* Video Player */}
          <div className="flex-none bg-black/40 p-2 sm:p-3 lg:p-4 xl:p-5">
            <div className="w-full aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-black relative lg:max-h-[55vh]">
              {playerMode === 'iframe' ? (
                <VideoFrame
                  content={content}
                  watchProgress={watchProgress}
                  onProgressUpdate={setWatchProgress}
                  selectedSource={selectedSource || undefined}
                  currentSeason={selectedSeason}
                  currentEpisode={selectedEpisode}
                />
              ) : (
                <NativePlayerSection
                  content={content}
                  contentType={type}
                  season={selectedSeason}
                  episode={selectedEpisode}
                  onFallbackToIframe={handleFallbackToIframe}
                />
              )}
            </div>
          </div>

          {/* ── On MOBILE: Show content details + actions right below the player ── */}
          <div className="lg:hidden flex-none px-3 sm:px-4 pt-3 pb-2 space-y-3">
            {/* Title + Meta */}
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400 font-medium">
                {releaseDate && (
                  <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-semibold">
                    {new Date(releaseDate).getFullYear()}
                  </span>
                )}
                {runtime && <span>{runtime} min</span>}
                <span className="px-1.5 py-0.5 border border-white/20 rounded text-[10px] bg-white/5 font-bold text-gray-300">
                  {type === 'movie' ? 'PG-13' : 'TV-14'}
                </span>
                <div className="flex items-center text-yellow-400 gap-0.5 font-bold">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{(content.vote_average || 0).toFixed(1)}</span>
                </div>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                {content.overview}
              </p>
              {content.genres && (
                <div className="flex flex-wrap gap-1">
                  {content.genres.map((g: any) => (
                    <span
                      key={g.id}
                      className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleAddToList}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-300 ${
                  isInList(content.id, type)
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-red-600 border-red-700 text-white'
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {isInList(content.id, type) ? (
                  <><Check className="h-4 w-4" /> Added</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add List</>
                )}
              </motion.button>
              <motion.button
                onClick={handleLike}
                className={`p-2 rounded-xl border transition-all shrink-0 ${
                  isLiked
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-white/5 border-white/10 text-gray-300'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="p-2 rounded-xl border bg-white/5 border-white/10 text-gray-300 transition-all shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                <Share className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* Streaming Mode + Streaming Servers — below the player */}
          <div className="flex-none lg:flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar px-3 sm:px-4 lg:px-4 xl:px-5 pb-3 lg:pb-4 pt-1 lg:pt-2 space-y-2 sm:space-y-3">
            {/* Player Mode Toggle */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">Streaming Mode</h3>
              </div>
              <div className="flex items-center bg-black/40 border border-white/10 rounded-full p-0.5 shrink-0">
                <button
                  onClick={handleFallbackToIframe}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    playerMode === 'iframe'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Monitor className="h-3 w-3" />
                  Classic
                </button>
                <button
                  onClick={handleSwitchToNative}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    playerMode === 'native'
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  Smart
                </button>
              </div>
            </div>

            {/* Streaming Sources / Servers */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 sm:p-4">
              {sourcesLoading ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent"></div>
                  <p className="text-gray-400 text-xs">Searching servers...</p>
                </div>
              ) : sourcesError ? (
                <div className="py-3 text-center space-y-2">
                  <p className="text-red-400 text-xs">Error: {sourcesError}</p>
                  <button
                    onClick={() => content && fetchStreamingSources(content.id)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-colors"
                  >
                    Retry Search
                  </button>
                </div>
              ) : (
                <StreamSources
                  sources={streamSources}
                  onSourceSelect={setSelectedSource}
                  selectedSource={selectedSource}
                />
              )}
            </div>
          </div>

          {/* ── On MOBILE (TV): Seasons & Episodes below streaming controls ── */}
          {type === 'tv' && (
            <div className="lg:hidden flex-none border-t border-white/5">
              <SeasonsEpisodesSection
                tvShow={content as TVShow}
                initialSeason={parseInt(searchParams.get('season') || '1')}
                initialEpisode={parseInt(searchParams.get('episode') || '1')}
                onSeasonEpisodeChange={(season, episode) => {
                  setSelectedSeason(season);
                  setSelectedEpisode(episode);
                  navigate(`/watch/tv/${id}?season=${season}&episode=${episode}`, { replace: true });
                }}
              />
            </div>
          )}

          {/* ── On MOBILE (Movie): Extra info ── */}
          {type === 'movie' && (
            <div className="lg:hidden flex-none px-3 sm:px-4 pb-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">About this movie</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {content.overview}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ═══ RIGHT COLUMN (Desktop Only): Details + Seasons & Episodes ═══ */}
        <aside className="hidden lg:flex w-[380px] xl:w-[420px] 2xl:w-[460px] border-l border-white/5 bg-[#0b0b1e] flex-col h-full min-h-0 overflow-hidden flex-none">
          <div className="flex flex-col h-full overflow-hidden">

            {/* Content Details — compact top section */}
            <div className="flex-none p-4 pb-3 space-y-3 border-b border-white/5">
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 font-medium">
                {releaseDate && (
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 font-semibold">
                    {new Date(releaseDate).getFullYear()}
                  </span>
                )}
                {runtime && <span>{runtime} min</span>}
                <span className="px-2 py-0.5 border border-white/20 rounded text-[10px] bg-white/5 font-bold text-gray-300">
                  {type === 'movie' ? 'PG-13' : 'TV-14'}
                </span>
                <div className="flex items-center text-yellow-400 gap-0.5 font-bold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{(content.vote_average || 0).toFixed(1)}</span>
                </div>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed line-clamp-2 hover:line-clamp-none transition-all duration-300 cursor-pointer">
                {content.overview}
              </p>
              {content.genres && (
                <div className="flex flex-wrap gap-1.5">
                  {content.genres.map((g: any) => (
                    <span
                      key={g.id}
                      className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions — Add to List, Like, Share */}
            <div className="flex-none px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleAddToList}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border text-xs font-bold transition-all duration-300 ${
                    isInList(content.id, type)
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                      : 'bg-red-600 border-red-700 text-white hover:bg-red-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isInList(content.id, type) ? (
                    <>
                      <Check className="h-4 w-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add List
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={handleLike}
                  className={`p-2 rounded-xl border transition-all duration-300 shrink-0 ${
                    isLiked
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="p-2 rounded-xl border bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Share className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Seasons & Episodes (TV) or movie extra space */}
            {type === 'tv' ? (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <SeasonsEpisodesSection
                  tvShow={content as TVShow}
                  initialSeason={parseInt(searchParams.get('season') || '1')}
                  initialEpisode={parseInt(searchParams.get('episode') || '1')}
                  onSeasonEpisodeChange={(season, episode) => {
                    setSelectedSeason(season);
                    setSelectedEpisode(episode);
                    navigate(`/watch/tv/${id}?season=${season}&episode=${episode}`, { replace: true });
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">About this movie</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {content.overview}
                  </p>
                  {(content as Movie).runtime && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-400">Runtime:</span>
                      <span>{(content as Movie).runtime} minutes</span>
                    </div>
                  )}
                  {content.vote_count && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-400">Votes:</span>
                      <span>{content.vote_count.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default WatchPage;
