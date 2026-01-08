import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Share,
  ChevronLeft
} from 'lucide-react';

import { Movie, TVShow, WatchProgress, StreamSource, DownloadOption, TorrentSource } from '../types';
import {
  getMovieDetails,
  getTVShowDetails,
  getEnhancedSimilarMovies,
  getEnhancedRecommendationsMovies,
  getEnhancedRecommendationsTVShows,
  getSimilarTVShows
} from '../services/tmdb';
import { useMyList } from '../hooks/useMyList';
import { myListService } from '../services/myListService';
import { rivestreamService } from '../services/rivestreamService';
import { SmashyStreamService } from '../services/smashystream';
import { Movies111Service } from '../services/111movies';
import LoadingSkeleton from '../components/LoadingSkeleton';
import VideoFrame from '../components/WatchPage/VideoFrame';
import StreamSources from '../components/WatchPage/StreamSources';
import DownloadOptions from '../components/WatchPage/DownloadOptions';
import TorrentSources from '../components/WatchPage/TorrentSources';
import MovieDetails from '../components/WatchPage/MovieDetails';
import SeasonsEpisodesSection from '../components/WatchPage/SeasonsEpisodesSection';

import SimilarContent from '../components/WatchPage/SimilarContent';


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

  const [similarContent, setSimilarContent] = useState<(Movie | TVShow)[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<(Movie | TVShow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);

  const [activeSection, setActiveSection] = useState<'stream' | 'download' | 'torrent'>('stream');
  const [isLiked, setIsLiked] = useState(false);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);

  // Rivestream data - fetched from the service
  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [downloadOptions, setDownloadOptions] = useState<DownloadOption[]>([]);
  const [torrentSources, setTorrentSources] = useState<TorrentSource[]>([]);
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
  const fetchStreamingSources = async (contentId: number) => {
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
      const { streamSources: rivestreamSources, downloadOptions, torrentSources } = await rivestreamService.getAllContentData(rivestreamOptions);

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

      if (allStreamSources.length === 0 && downloadOptions.length === 0 && torrentSources.length === 0) {
        throw new Error('No streaming sources available for this content');
      }

      setStreamSources(allStreamSources);
      setDownloadOptions(downloadOptions);
      setTorrentSources(torrentSources);

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
        let smashyFallback: any[] = [];
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
        let movies111Fallback: any[] = [];
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
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const contentId = parseInt(id);
        let contentData: Movie | TVShow;

        if (type === 'movie') {
          const movieData = await getMovieDetails(contentId);
          contentData = movieData;

          // Parallel fetch enhanced recommendations and similar content
          const [similarRes, recommendedRes] = await Promise.all([
            getEnhancedSimilarMovies(movieData),
            getEnhancedRecommendationsMovies(movieData)
          ]);

          setSimilarContent(similarRes.slice(0, 12));
          setRecommendedContent(recommendedRes.slice(0, 12));
        } else {
          const tvData = await getTVShowDetails(contentId);
          contentData = tvData;

          // Enhanced TV recommendations and standard similar (or we can use our recommendations as similar too)
          const [recommendedRes, similarResponse] = await Promise.all([
            getEnhancedRecommendationsTVShows(tvData),
            getSimilarTVShows(contentId)
          ]);

          setRecommendedContent(recommendedRes.slice(0, 12));
          setSimilarContent(similarResponse.results.slice(0, 12));
        }

        setContent(contentData);
        // setSimilarContent done above per branch

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

        // Fetch Rivestream sources
        await fetchStreamingSources(contentId);

      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, type]);

  // Separate useEffect for TV show episode changes
  useEffect(() => {
    if (content && type === 'tv') {
      fetchStreamingSources(content.id);
    }
  }, [selectedSeason, selectedEpisode]);



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
    return (
      <div className="min-h-screen bg-[#0A0A1F] pt-16">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[#0A0A1F] pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Content Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The requested content could not be found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#ff0000] text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const title = ('title' in content ? content.title : (content as TVShow).name) || '';
  const releaseDate = ('release_date' in content ? content.release_date : (content as TVShow).first_air_date) || '';
  const runtime = type === 'movie' ? (content as Movie).runtime : (content as TVShow).episode_run_time?.[0];

  return (
    <div className="min-h-screen bg-[#0A0A1F] pt-16">
      {/* Header */}
      <motion.header
        className="bg-[#0A0A1F]/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  {releaseDate && <span>{new Date(releaseDate).getFullYear()}</span>}
                  {runtime && <span>{runtime} min</span>}
                  <span className="px-2 py-1 border border-gray-500 rounded text-xs">PG-13</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleAddToList}
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`h-5 w-5 ${isInList(content.id, type) ? 'text-[#ff0000] fill-current' : ''}`} />
              </motion.button>
              <motion.button
                onClick={handleLike}
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'text-[#ff0000] fill-current' : ''}`} />
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area - Video Frame + Details */}
      <section className="py-8 bg-[#0A0A1F]">
        <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Video Frame */}
            <div className="lg:col-span-7">
              <VideoFrame
                content={content}
                watchProgress={watchProgress}
                onProgressUpdate={setWatchProgress}
                selectedSource={selectedSource || undefined}
                currentSeason={selectedSeason}
                currentEpisode={selectedEpisode}
              />
            </div>

            {/* Details Sidebar */}
            <div className="lg:col-span-3 min-h-[400px] lg:h-[70vh] flex flex-col">
              {type === 'movie' ? (
                <div className="bg-[#13132B] rounded-lg overflow-hidden h-full flex flex-col border border-gray-800">
                  {/* Details Header - Fixed */}
                  <div className="bg-[#1F1F35] backdrop-blur px-4 py-3 border-b border-gray-700 flex-none z-10">
                    <h2 className="text-white font-semibold text-base flex items-center">
                      <span className="w-1 h-4 bg-[#ff0000] rounded-full mr-2"></span>
                      Details
                    </h2>
                  </div>

                  {/* Movie Details Content - Scrollable */}
                  <div className="p-0 flex-1 overflow-y-auto custom-scrollbar bg-[#0A0A1F]/50">
                    <MovieDetails content={content} type={type} />
                  </div>
                </div>
              ) : (
                /* TV Show Seasons & Episodes Section */
                <div className="h-full flex flex-col overflow-hidden lg:max-h-[70vh]">
                  <SeasonsEpisodesSection
                    tvShow={content as TVShow}
                    initialSeason={parseInt(searchParams.get('season') || '1')}
                    initialEpisode={parseInt(searchParams.get('episode') || '1')}
                    onSeasonEpisodeChange={(season, episode) => {
                      setSelectedSeason(season);
                      setSelectedEpisode(episode);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Streaming Options Section */}
      <section className="py-16 bg-[#0A0A1F]">
        <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* Section Navigation */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => setActiveSection('stream')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeSection === 'stream'
                ? 'bg-[#ff0000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Stream Sources
            </button>
            <button
              onClick={() => setActiveSection('download')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeSection === 'download'
                ? 'bg-[#ff0000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Download Options
            </button>
            <button
              onClick={() => setActiveSection('torrent')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeSection === 'torrent'
                ? 'bg-[#ff0000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Torrent Sources
            </button>
          </div>

          {/* Active Section Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Loading State */}
            {sourcesLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 netflix-spinner-thick" />
                    <div className="h-16 w-16 netflix-ripple" />
                    <div className="h-16 w-16 netflix-ripple" style={{ animationDelay: '0.5s' }} />
                  </div>
                  <div className="text-center loading-text">
                    <p className="text-white text-lg font-medium">Loading streaming sources...</p>
                    <p className="text-gray-400 text-sm mt-2">Connecting to servers</p>
                    <div className="flex gap-2 justify-center mt-3">
                      <div className="netflix-dot" />
                      <div className="netflix-dot" />
                      <div className="netflix-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {sourcesError && !sourcesLoading && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">!</span>
                  </div>
                  <h3 className="text-red-400 font-semibold">Streaming Sources Error</h3>
                </div>
                <p className="text-red-300 text-sm">{sourcesError}</p>
                <button
                  onClick={() => content && fetchStreamingSources(content.id)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Retry Loading Sources
                </button>
              </div>
            )}

            {/* Content Sections */}
            {!sourcesLoading && (
              <>
                {activeSection === 'stream' && (
                  <StreamSources
                    sources={streamSources}
                    onSourceSelect={setSelectedSource}
                    selectedSource={selectedSource}
                  />
                )}
                {activeSection === 'download' && (
                  <DownloadOptions options={downloadOptions} />
                )}
                {activeSection === 'torrent' && (
                  <TorrentSources sources={torrentSources} />
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Similar Content */}
      <SimilarContent
        similar={similarContent}
        recommended={recommendedContent}
        title={title}
        type={type}
      />
    </div>
  );
};

export default WatchPage;