import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Clapperboard, Calendar } from 'lucide-react';
import { Video } from '../../types';
import SectionHeader from './SectionHeader';

/** YouTube video IDs are exactly 11 chars of alphanumeric, hyphen, or underscore. */
const isValidYouTubeKey = (key: string): boolean => /^[a-zA-Z0-9_-]{11}$/.test(key);

interface VideoTrailersSectionProps {
  readonly videos: Video[];
}

/**
 * Cinematic, horizontally scrollable trailer carousel with inline modal
 * playback (autoplaying YouTube embeds). Uses the standardized SectionHeader
 * for visual consistency with the rest of the DetailPage.
 */
const VideoTrailersSection: React.FC<VideoTrailersSectionProps> = ({ videos }) => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (!selectedVideo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVideo(null);
    };
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', handleKey);
    };
  }, [selectedVideo]);

  if (!videos || videos.length === 0) return null;

  const safeVideos = videos.filter(v => isValidYouTubeKey(v.key));

  return (
    <>
      <section>
        <SectionHeader
          eyebrow="Watch the Reel"
          icon={Clapperboard}
          title="Videos & Trailers"
          count={videos.length}
        />

        {/* Horizontal Scrolling Video Grid */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8 scrollbar-hide snap-x snap-mandatory">
            {safeVideos.slice(0, 8).map((video, index) => (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                onClick={() => setSelectedVideo(video)}
                whileHover={{ y: -4 }}
                className="flex-shrink-0 w-72 sm:w-80 md:w-[22rem] group cursor-pointer text-left snap-start"
                aria-label={`Play ${video.name}`}
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3 ring-1 ring-white/10 shadow-lg shadow-black/50 group-hover:ring-netflix-red/50 transition-all duration-300">
                  <img
                    src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                    alt={video.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-netflix-red rounded-full flex items-center justify-center shadow-2xl shadow-netflix-red/40 transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    {video.type}
                  </div>
                </div>
                <div className="space-y-1 px-1">
                  <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-netflix-red transition-colors line-clamp-2 leading-tight">
                    {video.name}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(video.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            key="video-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedVideo(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Playing ${selectedVideo.name}`}
            className="fixed inset-0 z-[105] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-[#0A0A1F] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-3 right-3 z-10 w-10 h-10 bg-black/60 hover:bg-black/85 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-colors"
                aria-label="Close video player"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1&rel=0`}
                  title={selectedVideo.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>
              <div className="p-4 sm:p-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-netflix-red/20 text-netflix-red border border-netflix-red/30 px-2.5 py-1 rounded-full mb-2">
                  <Clapperboard className="w-3 h-3" />
                  {selectedVideo.type}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white">{selectedVideo.name}</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Published: {new Date(selectedVideo.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VideoTrailersSection;
