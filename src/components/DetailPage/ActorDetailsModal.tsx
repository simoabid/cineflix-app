import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, ExternalLink, Globe, MapPin, Calendar, Award } from 'lucide-react';
import { PersonDetails } from '../../types';
import { getImageUrl } from '../../services/tmdb';
import { useLenisToggle } from '../../hooks/useLenisToggle';

interface ActorDetailsModalProps {
  readonly open: boolean;
  readonly personDetails: PersonDetails | null;
  readonly onClose: () => void;
}

/**
 * Full biography modal for a person, with deep details (also-known-as,
 * birthday, biography paragraphs, external links).
 */
const ActorDetailsModal: React.FC<ActorDetailsModalProps> = ({
  open,
  personDetails,
  onClose,
}) => {
  // Lock body scroll with Lenis while modal is open
  useLenisToggle(open);

  return (
    <AnimatePresence>
      {open && personDetails && (
        <motion.div
          key="actor-details-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="actor-details-title"
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-gradient-to-b from-background-secondary to-background-main rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 max-h-[92vh] overflow-y-auto scrollbar-thin"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 aspect-[3/4] md:aspect-auto bg-gradient-to-br from-gray-900 to-gray-950">
                {personDetails.profile_path ? (
                  <img
                    src={getImageUrl(personDetails.profile_path, 'w500')}
                    alt={personDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-24 h-24 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="md:w-2/3 p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                <div>
                  <h2
                    id="actor-details-title"
                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3"
                  >
                    {personDetails.name}
                  </h2>

                  {personDetails.also_known_as.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Also Known As
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {personDetails.also_known_as.slice(0, 4).map((name) => (
                          <span
                            key={name}
                            className="bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-md text-xs"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {personDetails.birthday && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider font-medium mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Born
                      </div>
                      <p className="text-white font-medium text-sm">
                        {new Date(personDetails.birthday).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {personDetails.place_of_birth && (
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {personDetails.place_of_birth}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider font-medium mb-2">
                      <Award className="w-3.5 h-3.5" />
                      Known For
                    </div>
                    <p className="text-white font-medium text-sm">{personDetails.known_for_department}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Popularity: {Math.round(personDetails.popularity)}
                    </p>
                  </div>
                </div>

                {personDetails.biography && (
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                      Biography
                    </h3>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                      {personDetails.biography.split('\n\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {personDetails.imdb_id && (
                    <a
                      href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      IMDb
                    </a>
                  )}
                  {personDetails.homepage && (
                    <a
                      href={personDetails.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActorDetailsModal;
