import React, { useState, useEffect } from 'react';
import { CollectionDetails } from '../types';
import { getBackdropUrl, getPosterUrl } from '../services/tmdb';
import CollectionsService from '../services/collectionsService';
import { Play, Clock, Calendar, Film, Star, ChevronRight, Users } from 'lucide-react';

/**
 * Props for CollectionsHero component
 */
interface CollectionsHeroProps {
  collection: CollectionDetails;
  onStartMarathon: () => void;
  onViewCollection?: () => void;
  onHeroInteraction?: () => void;
}

/**
 * Type helper for a single film item within a collection.
 */
type FilmItem = CollectionDetails['parts'][number];

/**
 * Placeholder SVG data URIs used as image fallbacks.
 */
const HERO_POSTER_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMTQxNDE0Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjQ2MCIgaGVpZ2h0PSI3MTAiIHJ4PSIxMiIgZmlsbD0iIzJBMkEyQSIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSIyMjAiIHk9IjMzNSIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTQgMlYyMEwxOSAxNVYxMUwxNCA2VjJaIiBmaWxsPSIjRTUwOTE0Ii8+CjxwYXRoIGQ9Ik0xMyAySDVDMy45IDIgMyAyLjkgMyA0VjIwQzMgMjEuMSAzLjkgMjIgNSAyMkgxM1YyWiIgZmlsbD0iI0U1MDkxNCIvPgo8L3N2Zz4KPHRleHQgeD0iMjUwIiB5PSI0MzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2luZUZsaXggQ29sbGVjdGlvbjwvdGV4dD4KPC9zdmc+';
const SMALL_POSTER_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjMTQxNDE0Ii8+CjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSI4NiIgaGVpZ2h0PSIxMzIiIHJ4PSI0IiBmaWxsPSIjMkEyQTJBIiBzdHJva2U9IiMzNzQxNTEiIHN0cm9rZS13aWR0aD0iMSIvPgo8c3ZnIHg9IjM2IiB5PSI1OSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTQgMlYyMEwxOSAxNVYxMUwxNCA2VjJaIiBmaWxsPSIjRTUwOTE0Ii8+CjxwYXRoIGQ9Ik0xMyAySDVDMy45IDIgMyAyLjkgMyA0VjIwQzMgMjEuMSAzLjkgMjIgNSAyMkgxM1YyWiIgZmlsbD0iI0U1MDkxNCIvPgo8L3N2Zz4KPC9zdmc+';

/**
 * Returns a handler to set a fallback image when an image fails to load.
 * Exported for unit testing and reuse.
 *
 * @param fallbackSrc - Data URI or URL to use as the fallback image.
 */
export const makeImageOnErrorHandler = (fallbackSrc: string) => {
  return (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = fallbackSrc;
    target.onerror = null; // prevent loops
  };
};

/**
 * Format runtime minutes into a human-readable string (e.g., "2h 5m" or "45m").
 * Exported for unit tests.
 *
 * @param minutes - Total runtime in minutes.
 */
export const formatRuntime = (minutes: number | undefined): string => {
  const mins = Math.max(0, Math.floor(minutes || 0));
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Map internal collection types to display-friendly names.
 * Exported for unit tests.
 *
 * @param type - Collection type key
 */
export const getTypeDisplayName = (type?: string): string => {
  const typeMap: { [key: string]: string } = {
    trilogy: 'Trilogy',
    quadrilogy: 'Quadrilogy',
    pentology: 'Pentology',
    hexalogy: 'Hexalogy',
    septology: 'Septology',
    octology: 'Octology',
    nonology: 'Nonology',
    extended_series: 'Extended Series',
    incomplete_series: 'Series',
  };
  if (!type) return 'Series';
  return typeMap[type] || 'Series';
};

/**
 * Build an array of backdrop URLs (max 3) for crossfade backgrounds.
 * Exported for unit tests.
 *
 * @param parts - Collection parts array
 */
export const buildBackgroundImages = (parts: CollectionDetails['parts'] | undefined): string[] => {
  if (!parts || parts.length === 0) return [];
  return parts
    .slice(0, 3)
    .map((film) => getBackdropUrl(film.backdrop_path, 'w1280'))
    .filter(Boolean);
};

/**
 * Return the next film to watch: either user progress next_film or the first part.
 * Exported for unit tests.
 *
 * @param collection - The collection details
 */
export const safeGetNextFilm = (collection: CollectionDetails): FilmItem | null => {
  if (!collection) return null;
  return (collection.user_progress?.next_film as FilmItem) || collection.parts?.[0] || null;
};

/**
 * Calculate average rating of collection parts with safe guards.
 * Exported for unit tests.
 *
 * @param parts - Array of film parts
 */
export const calculateAverageRating = (parts: CollectionDetails['parts'] | undefined): number => {
  if (!parts || parts.length === 0) return 0;
  const sum = parts.reduce((acc, film) => acc + (film.vote_average || 0), 0);
  return sum / parts.length;
};

/**
 * Validate incoming collection prop at runtime.
 * Performs basic shape/type checks to guard component runtime usage.
 *
 * @param col - Unknown input to validate as CollectionDetails
 * @returns true when input conforms to minimal CollectionDetails shape
 */
export const validateCollectionInput = (col: any): col is CollectionDetails => {
  if (!col || typeof col !== 'object') return false;
  if (typeof col.id !== 'number') return false;
  if (typeof col.name !== 'string') return false;
  if (!Array.isArray(col.parts)) return false;
  if ('film_count' in col && typeof col.film_count !== 'number') return false;
  // basic checks passed
  return true;
};

const heroPosterOnError = makeImageOnErrorHandler(HERO_POSTER_PLACEHOLDER);
const smallPosterOnError = makeImageOnErrorHandler(SMALL_POSTER_PLACEHOLDER);

const CollectionsHero: React.FC<CollectionsHeroProps> = ({ collection, onStartMarathon, onViewCollection, onHeroInteraction }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const isValidCollection = validateCollectionInput(collection);

  useEffect(() => {
    if (!isValidCollection) return;
    const userProgress = CollectionsService.getFranchiseProgress(collection.id);
    if (userProgress) {
      setProgress(userProgress.completion_percentage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.id]);

  useEffect(() => {
    // Rotate through different backdrop images; guard against zero-length to avoid modulo by zero.
    const rotationLimit = Math.max(Math.min(collection.parts?.length ?? 0, 3), 1);
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % rotationLimit
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [collection.parts?.length]);

  if (!isValidCollection) {
    console.error('CollectionsHero: invalid "collection" prop provided', collection);
    return null;
  }

  const backgroundImages = buildBackgroundImages(collection.parts);

  const nextFilm = safeGetNextFilm(collection);
  const totalWatchTime = formatRuntime(collection.total_runtime);
  const averageRating = calculateAverageRating(collection.parts);

  const firstYearNumber = collection.first_release_date ? new Date(collection.first_release_date).getFullYear() : null;
  const latestYearNumber = collection.latest_release_date ? new Date(collection.latest_release_date).getFullYear() : null;
  const yearRangeDisplay = firstYearNumber && latestYearNumber ? `${firstYearNumber} - ${latestYearNumber}` : 'N/A';
  const yearSpanDisplay = (firstYearNumber && latestYearNumber) ? `${latestYearNumber - firstYearNumber + 1}` : 'multiple';

  return (
    <div
      className="relative h-screen flex items-center"
      onMouseEnter={onHeroInteraction}
    >
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 overflow-hidden">
        {backgroundImages.map((image, index) => (
          <div
            key={`${index}-${collection.id}`}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={collection.name}
              className="w-full h-full object-cover scale-110 animate-slow-zoom"
            />
          </div>
        ))}

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 flex items-center h-full">
        <div className="flex flex-col lg:flex-row items-start lg:items-center w-full gap-8">
          {/* Collection Poster */}
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={getPosterUrl(collection.poster_path, 'w500')}
                alt={collection.name}
                className="w-64 h-96 object-cover rounded-lg shadow-2xl transform hover:scale-105 transition-transform duration-300"
                onError={heroPosterOnError}
              />

              {/* Progress Ring */}
              {progress > 0 && (
                <div className="absolute -top-3 -right-3 w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-700"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-red-600"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${progress}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            {/* Title and Badges */}
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {getTypeDisplayName(collection.type)}
                </span>
                <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                  {(collection.status || '').charAt(0).toUpperCase() + (collection.status || '').slice(1)}
                </span>
                <div className="flex items-center space-x-1 bg-gray-800 text-yellow-400 px-3 py-1 rounded-full text-sm">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{averageRating.toFixed(1)}</span>
                </div>
              </div>

              <h1 className="text-6xl lg:text-7xl font-bold text-white mb-2 leading-tight">
                {collection.name}
              </h1>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 text-gray-300 mb-6">
              <div className="flex items-center space-x-2">
                <Film className="w-5 h-5" />
                <span className="font-medium">{collection.film_count} Films</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Total Runtime: {totalWatchTime}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">
                  {yearRangeDisplay}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xl text-gray-300 leading-relaxed mb-8 max-w-2xl">
              {collection.overview || `Experience the complete ${collection.name} franchise. Follow the epic journey through ${collection.film_count} films spanning ${yearSpanDisplay} years of cinematic excellence.`}
            </p>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-8">
              {(collection.genre_categories || []).map((genre, index) => (
                <span
                  key={index}
                  className="bg-gray-800/50 border border-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm backdrop-blur-sm"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={onStartMarathon}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center space-x-3 group"
              >
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>{progress > 0 ? 'Continue Marathon' : 'Start Marathon'}</span>
              </button>

              <button
                onClick={onViewCollection || onStartMarathon}
                className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors backdrop-blur-sm flex items-center space-x-3"
              >
                <Users className="w-6 h-6" />
                <span>View Collection</span>
              </button>

              <button className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white px-6 py-4 rounded-lg text-lg transition-colors backdrop-blur-sm">
                <Star className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Section */}
            {progress > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Your Progress</h3>
                  <span className="text-red-400 font-bold">{Math.round(progress)}% Complete</span>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {nextFilm && (
                  <div className="flex items-center space-x-4">
                    <img
                      src={getPosterUrl(nextFilm.poster_path, 'w92')}
                      alt={nextFilm.title}
                      className="w-12 h-18 object-cover rounded"
                      onError={smallPosterOnError}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">Up Next:</p>
                      <p className="text-white font-medium">{nextFilm.title}</p>
                      <p className="text-sm text-gray-400">
                        {nextFilm.release_date ? new Date(nextFilm.release_date).getFullYear() : 'N/A'}
                      </p>
                    </div>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Watch Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Film Preview Strip */}
          <div className="hidden xl:flex flex-col space-y-3">
            <h4 className="text-lg font-semibold text-white mb-2">Films in Collection</h4>
            {(collection.parts || []).slice(0, 4).map((film) => (
              <div
                key={film.id}
                className="flex items-center space-x-3 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-3 hover:bg-gray-800/50 transition-colors cursor-pointer group"
              >
                <img
                  src={getPosterUrl(film.poster_path, 'w92')}
                  alt={film.title}
                  className="w-10 h-15 object-cover rounded"
                  onError={smallPosterOnError}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate group-hover:text-red-400 transition-colors">
                    {film.title}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {film.release_date ? new Date(film.release_date).getFullYear() : 'N/A'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            ))}

            {(collection.parts && collection.parts.length > 4) && (
              <div className="text-center py-2">
                <span className="text-gray-400 text-sm">
                  +{collection.parts.length - 4} more films
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default CollectionsHero;