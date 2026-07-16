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
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pt-3 pb-5 px-4 sm:px-6 lg:px-8 scrollbar-hide snap-x snap-mandatory">
            {safeVideos.slice(0, 8).map((video, index) => (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                onClick={() => setSelectedVideo(video)}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0 w-72 sm:w-80 md:w-[22rem] group cursor-pointer text-left snap-start flex flex-col border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden hover:border-buttons-purple/40 hover:bg-white/[0.05] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
                aria-label={`Play ${video.name}`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black rounded-t-2xl">
                  <img
                    src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                    alt={video.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-buttons-purple rounded-full flex items-center justify-center shadow-2xl shadow-buttons-purple/40 transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    {video.type}
                  </div>
                </div>
                {/* Bottom Info Footer */}
                <div className="p-4 bg-gradient-to-b from-white/[0.02] to-black/40 border-t border-white/5 w-full flex-1 flex flex-col justify-between min-h-[5.5rem]">
                  <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-type-logo transition-colors duration-300 line-clamp-2 leading-tight">
                    {video.name}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
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
              className="relative w-full max-w-5xl bg-background-main rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
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
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>
              <div className="p-4 sm:p-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-buttons-purple/20 text-type-logo border border-buttons-purple/30 px-2.5 py-1 rounded-full mb-2">
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
