import React, { useState } from 'react';
import { Play, X, PlayCircle } from 'lucide-react';
import { Video } from '../../types';

interface VideoTrailersSectionProps {
  readonly videos: Video[];
}

/**
 * Horizontally scrollable video/trailer grid with inline modal playback.
 * Shared between the Movie and TV layouts on the DetailPage,
 * eliminating the previous code duplication.
 */
const VideoTrailersSection: React.FC<VideoTrailersSectionProps> = ({ videos }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  if (videos.length === 0) return null;

  const handleWatchTrailer = (video: Video): void => {
    setSelectedVideo(video);
    setShowModal(true);
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
    setSelectedVideo(null);
  };

  return (
    <>
      <section>
        <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 sm:h-8 bg-netflix-red rounded-full"></div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Videos &amp; Trailers</h2>
            </div>
            <span className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit">{videos.length} videos</span>
          </div>

          {/* Horizontal Scrolling Video Grid */}
          <div className="relative -mx-6 sm:-mx-8 lg:-mx-12">
            <div className="flex gap-4 overflow-x-auto pb-4 px-6 sm:px-8 lg:px-12 scrollbar-hide">
              {videos.slice(0, 4).map((video) => (
                <div
                  key={video.id}
                  className="flex-shrink-0 w-80 group cursor-pointer"
                  onClick={() => handleWatchTrailer(video)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-3">
                    <img
                      src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                      alt={video.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-white fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.type === 'Trailer' ? '2:30' : '1:45'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white group-hover:text-netflix-red transition-colors line-clamp-2 leading-tight">
                      {video.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {video.type} • {new Date(video.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showModal && selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl bg-[#0A0A1F] rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 p-2 rounded-full transition-colors"
              aria-label="Close video player"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1`}
                title={selectedVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-5 h-5 text-netflix-red" />
                <span className="text-sm text-gray-400">{selectedVideo.type}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{selectedVideo.name}</h3>
              <p className="text-gray-400 text-sm">
                Published: {new Date(selectedVideo.published_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoTrailersSection;
