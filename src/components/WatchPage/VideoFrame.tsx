import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Movie, TVShow, WatchProgress, StreamSource } from '../../types';
import { progressService } from '../../services/progressService';
import { useAuth } from '../../contexts/AuthContext';

interface VideoFrameProps {
  content: Movie | TVShow;
  watchProgress?: WatchProgress | null;
  onProgressUpdate?: (progress: WatchProgress) => void;
  selectedSource?: StreamSource;
  currentSeason?: number;
  currentEpisode?: number;
}

const VideoFrame: React.FC<VideoFrameProps> = ({
  content,
  selectedSource,
  currentSeason,
  currentEpisode
}) => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    // Reload video source
  };

  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      setStartTime(Date.now());
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedSource]);

  // Track progress (Heuristic: Time spent on page since load)
  useEffect(() => {
    if (isLoading || hasError || !selectedSource) return;

    const interval = setInterval(() => {
      if (!startTime) return;

      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
      const estimatedDuration = 'runtime' in content ? (content.runtime || 120) * 60 : 3000; // default 50 mins
      const percent = Math.min((timeSpentSeconds / estimatedDuration) * 100, 100);

      // Determine season/episode if TV show
      let seasonNumber = currentSeason;
      let episodeNumber = currentEpisode;

      // Fallback if not passed explicitly but available in content (rare case for direct play)
      if ('first_air_date' in content && !seasonNumber) {
        // logic if needed, otherwise rely on props
      }

      progressService.saveProgress({
        contentId: content.id,
        contentType: 'title' in content ? 'movie' : 'tv',
        progress: percent,
        playbackPosition: timeSpentSeconds,
        duration: estimatedDuration,
        seasonNumber,
        episodeNumber,
        content: {
          title: 'title' in content ? content.title : content.name,
          poster_path: content.poster_path,
          backdrop_path: content.backdrop_path,
        },
      }, isAuthenticated);

    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLoading, hasError, selectedSource, content, startTime, isAuthenticated, currentSeason, currentEpisode]);


  return (
    <div className="relative bg-black rounded-lg overflow-hidden group max-h-[70vh] w-auto mx-auto aspect-video">
      {/* Video Container */}
      <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A1F]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 netflix-spinner-thick" />
                <div className="h-16 w-16 netflix-ripple" />
                <div className="h-16 w-16 netflix-ripple" style={{ animationDelay: '0.5s' }} />
              </div>
              <div className="text-center loading-text">
                <p className="text-white text-lg font-medium">Loading video...</p>
                <p className="text-gray-400 text-sm mt-2">
                  {selectedSource ? `Connecting to ${selectedSource.name}` : 'Preparing stream'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A1F]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-2">Failed to load video</p>
              <p className="text-gray-400 text-sm mb-4">
                Unable to connect to the selected source
              </p>
              <button
                onClick={handleReload}
                className="flex items-center px-4 py-2 bg-[#ff0000] text-white rounded-lg hover:bg-red-700 transition-colors mx-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Video Content */}
        {!isLoading && !hasError && (
          <>
            {selectedSource ? (
              /* Streaming Player */
              <iframe
                src={selectedSource.url}
                className="w-full h-full streaming-iframe"
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={`${selectedSource.name} - ${'title' in content ? content.title : content.name}`}
                onError={() => setHasError(true)}
                onLoad={() => setHasError(false)}
                sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'none',
                  isolation: 'isolate',
                  pointerEvents: 'auto'
                }}
              />
            ) : (
              /* Background Image/Poster when no source selected */
              <div className="absolute inset-0">
                <img
                  src={`https://image.tmdb.org/t/p/original${content.backdrop_path}`}
                  alt={'title' in content ? content.title : content.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white text-lg mb-2">Select a source to start watching</p>
                    <p className="text-gray-400 text-sm">Choose from the available streaming sources above</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Source Info */}
        {selectedSource && !isLoading && (
          <div className="absolute top-4 right-4">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-white text-sm font-medium">{selectedSource.name}</span>
              <span className="text-green-400 text-xs ml-2">{selectedSource.quality}</span>
              {selectedSource.id === 'cinemaos_player' && (
                <span className="text-blue-400 text-xs ml-2">Enhanced</span>
              )}
            </div>
          </div>
        )}


      </div>

      {/* Video Info Footer */}
      <div className="bg-[#13132B] p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg">
              {'title' in content ? content.title : content.name}
            </h3>
            <p className="text-gray-400 text-sm">
              {selectedSource ? `Streaming from ${selectedSource.name}` : 'Select a source to start watching'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Quality:</span>
            <span className="text-[#ff0000] text-sm font-medium">
              {selectedSource?.quality || 'Auto'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoFrame;