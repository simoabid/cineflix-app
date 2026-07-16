import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, User, Star, ExternalLink, Film, Download, Calendar } from 'lucide-react';
import { CastMember, PersonDetails, PersonMovieCredits } from '../../types';
import { getImageUrl, getPosterUrl } from '../../services/tmdb';
import { useLenisToggle } from '../../hooks/useLenisToggle';

interface CastMemberModalProps {
  readonly open: boolean;
  readonly member: CastMember | null;
  readonly personDetails: PersonDetails | null;
  readonly filmography: PersonMovieCredits | null;
  readonly displayedMoviesCount: number;
  readonly loading: boolean;
  readonly onClose: () => void;
  readonly onLoadMore: () => void;
  readonly onMoreInfo: () => void;
  readonly onDownloadImage: (url: string, name: string) => void;
}

/**
 * Cast member modal — shows profile, role badges, biography snippet, and a
 * sortable filmography grid. Uses Framer Motion for entrance/exit, traps the
 * Escape key, and locks body scroll while open.
 */
const CastMemberModal: React.FC<CastMemberModalProps> = ({
  open,
  member,
  personDetails,
  filmography,
  displayedMoviesCount,
  loading,
  onClose,
  onLoadMore,
  onMoreInfo,
  onDownloadImage,
}) => {
  const navigate = useNavigate();

  // Lock body scroll with Lenis while modal is open
  useLenisToggle(open);

  const handleMovieClick = (movieId: number) => {
    onClose();
    navigate(`/movie/${movieId}`);
  };

  return (
    <AnimatePresence>
      {open && member && (
        <motion.div
          key="cast-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cast-modal-title"
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="relative w-full max-w-6xl bg-gradient-to-b from-background-secondary to-background-main rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 max-h-[92vh] overflow-y-auto scrollbar-hide"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="relative bg-gradient-to-r from-buttons-purple/20 via-purple-500/5 to-transparent border-b border-white/10 p-5 sm:p-6 md:p-8">
              <div className="absolute top-0 left-0 w-72 h-72 bg-buttons-purple/15 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative flex flex-col md:flex-row gap-5 sm:gap-6">
                {/* Profile image */}
                <div className="w-32 sm:w-44 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-900 flex-shrink-0 ring-1 ring-white/10 shadow-2xl mx-auto md:mx-0">
                  {member.profile_path ? (
                    <img
                      src={getImageUrl(member.profile_path, 'w500')}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
                      <User className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3 sm:space-y-4 text-center md:text-left">
                  <div>
                    <h2
                      id="cast-modal-title"
                      className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight"
                    >
                      {member.name}
                    </h2>
                    <p className="text-base sm:text-lg text-gray-300 italic mt-1">
                      as “{member.character}”
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="bg-buttons-purple/20 text-type-logo border border-buttons-purple/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Main Cast
                    </span>
                    {member.order < 5 && (
                      <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Lead #{member.order + 1}
                      </span>
                    )}
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {member.order < 3 ? 'Lead Actor' : member.order < 8 ? 'Supporting' : 'Ensemble'}
                    </span>
                  </div>

                  {personDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm pt-2">
                      {personDetails.birthday && (
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-left">
                          <p className="text-gray-500 text-[11px] uppercase tracking-wider font-medium mb-1">
                            Born
                          </p>
                          <p className="text-white font-medium">
                            {new Date(personDetails.birthday).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          {personDetails.place_of_birth && (
                            <p className="text-gray-500 text-xs mt-1">{personDetails.place_of_birth}</p>
                          )}
                        </div>
                      )}
                      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-left">
                        <p className="text-gray-500 text-[11px] uppercase tracking-wider font-medium mb-1">
                          Known For
                        </p>
                        <p className="text-white font-medium">
                          {personDetails.known_for_department || 'Acting'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Popularity: {Math.round(personDetails.popularity || 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {personDetails?.biography && (
                    <div className="text-left">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Biography
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                        {personDetails.biography}
                      </p>
                    </div>
                  )}

                  {loading && !personDetails && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <div className="w-5 h-5 netflix-spinner" />
                      <span className="text-sm">Loading actor information...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filmography */}
            <div className="p-5 sm:p-6 md:p-8">
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Movies & TV Shows
                </h3>
                {filmography && (
                  <span className="text-xs sm:text-sm text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                    {filmography.cast.length} credits
                  </span>
                )}
              </div>

              {filmography && filmography.cast.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                    {filmography.cast
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.release_date || '').getTime() -
                          new Date(a.release_date || '').getTime(),
                      )
                      .slice(0, displayedMoviesCount)
                      .map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => handleMovieClick(movie.id)}
                          className="group text-left"
                        >
                          <div className="aspect-[2/3] mb-2 rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/5 group-hover:ring-buttons-purple/40 transition-all">
                            <img
                              src={getPosterUrl(movie.poster_path, 'w300')}
                              alt={movie.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                              }}
                            />
                          </div>
                          <h4 className="font-semibold text-white text-xs sm:text-sm leading-tight mb-1 group-hover:text-type-logo transition-colors line-clamp-2">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{Math.round(movie.vote_average * 10) / 10 || 'N/A'}</span>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                          </div>
                          {movie.character && (
                            <p className="text-[10px] text-gray-600 italic truncate mt-0.5">
                              as {movie.character}
                            </p>
                          )}
                        </button>
                      ))}
                  </div>

                  {filmography.cast.length > displayedMoviesCount && (
                    <div className="text-center">
                      <button
                        onClick={onLoadMore}
                        className="bg-buttons-purple hover:bg-buttons-purpleHover text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-buttons-purple/30"
                      >
                        Load More ({filmography.cast.length - displayedMoviesCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 netflix-spinner-thick" />
                      <div className="h-12 w-12 netflix-ripple" />
                    </div>
                    <p className="text-gray-400 text-sm">Loading filmography...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No filmography available</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="bg-black/40 border-t border-white/10 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onMoreInfo}
                  disabled={loading}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  View Full Biography
                </button>
                {member.profile_path && (
                  <button
                    onClick={() => onDownloadImage(getImageUrl(member.profile_path, 'h632'), member.name)}
                    className="bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors border border-white/15 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Photo
                  </button>
                )}
                {personDetails?.imdb_id && (
                  <a
                    href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on IMDb
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CastMemberModal;
