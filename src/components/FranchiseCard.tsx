import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionDetails } from '../types';
import { getPosterUrl, getBackdropUrl } from '../services/tmdb';
import { Play, Calendar, Clock, Star, Film } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface FranchiseCardProps {
  collection: CollectionDetails;
  onClick?: (collection: CollectionDetails) => void;
}

const FranchiseCard: React.FC<FranchiseCardProps> = ({ collection, onClick }) => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreenSize();
  
  // Disable hover effects on mobile and tablet
  const shouldShowHover = !isMobile && !isTablet;
  
  const formatRuntime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes}m`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTypeDisplayName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'trilogy': 'Trilogy',
      'quadrilogy': 'Quadrilogy',
      'pentology': 'Pentology',
      'hexalogy': 'Hexalogy',
      'septology': 'Septology',
      'octology': 'Octology',
      'nonology': 'Nonology',
      'extended_series': 'Extended Series',
      'incomplete_series': 'Series'
    };
    return typeMap[type] || 'Series';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'complete': return 'bg-green-600';
      case 'ongoing': return 'bg-blue-600';
      case 'incomplete': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const calculateProgress = (): number => {
    if (!collection.user_progress) return 0;
    return (collection.user_progress.watched_films.length / collection.film_count) * 100;
  };

  const progress = calculateProgress();

  const handleClick = () => {
    if (onClick) {
      onClick(collection);
    } else {
      navigate(`/collection/${collection.id}`);
    }
  };

  return (
    <div 
      className={`relative group cursor-pointer transform transition-all duration-300 ${shouldShowHover ? 'hover:scale-105 hover:z-10' : ''}`}
      onClick={handleClick}
    >
      {/* Main Card */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        {/* Cover Image */}
        <div className="relative h-64 w-full overflow-hidden bg-gray-900">
          {collection.backdrop_path ? (
            <img
              src={getBackdropUrl(collection.backdrop_path, 'w780')}
              alt={collection.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${shouldShowHover ? 'group-hover:scale-110' : ''}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/fallback-poster.jpg'; // A generic fallback
                target.onerror = null;
              }}
            />
          ) : collection.parts && collection.parts.length > 0 ? (
            <div className={`grid h-full w-full ${collection.parts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {collection.parts.slice(0, collection.parts.length >= 4 ? 4 : 2).map((film) => (
                <img
                  key={film.id}
                  src={getPosterUrl(film.poster_path, 'w342')}
                  alt={film.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/fallback-poster.jpg';
                    target.onerror = null;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Film className="w-16 h-16 text-gray-500" />
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          
          {/* Status Badge */}
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(collection.status)}`}>
            {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
          </div>
          
          {/* Type Badge */}
          <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            {getTypeDisplayName(collection.type)}
          </div>
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-red-600 rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
            {collection.name}
          </h3>
          
          {/* Stats Row */}
          <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
            <div className="flex items-center space-x-1">
              <Film className="w-4 h-4" />
              <span>{collection.film_count} Films</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatRuntime(collection.total_runtime)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(collection.first_release_date).getFullYear()}-{new Date(collection.latest_release_date).getFullYear()}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-white">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-gray-300 text-sm line-clamp-2 mb-3">
            {collection.overview || `Experience the complete ${collection.name} franchise with all ${collection.film_count} films.`}
          </p>
          
          {/* Genres */}
          <div className="flex flex-wrap gap-1 mb-3">
            {collection.genre_categories.slice(0, 3).map((genre, index) => (
              <span 
                key={index}
                className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs"
              >
                {genre}
              </span>
            ))}
            {collection.genre_categories.length > 3 && (
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                +{collection.genre_categories.length - 3}
              </span>
            )}
          </div>

          {/* Poster Collage */}
          <div className="flex -space-x-2 mb-3">
            {collection.parts.slice(0, 4).map((film, index) => (
              <div 
                key={film.id}
                className="relative w-8 h-12 border-2 border-gray-900 rounded overflow-hidden"
                style={{ zIndex: 4 - index }}
              >
                <img
                  src={getPosterUrl(film.poster_path, 'w92')}
                  alt={film.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Fallback to small themed poster placeholder
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjMTQxNDE0Ii8+CjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSI4NiIgaGVpZ2h0PSIxMzIiIHJ4PSI0IiBmaWxsPSIjMkEyQTJBIiBzdHJva2U9IiMzNzQxNTEiIHN0cm9rZS13aWR0aD0iMSIvPgo8c3ZnIHg9IjM2IiB5PSI1OSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTQgMlYyMEwxOSAxNVYxMUwxNCA2VjJaIiBmaWxsPSIjRTUwOTE0Ii8+CjxwYXRoIGQ9Ik0xMyAySDVDMy45IDIgMyAyLjkgMyA0VjIwQzMgMjEuMSAzLjkgMjIgNSAyMkgxM1YyWiIgZmlsbD0iI0U1MDkxNCIvPgo8L3N2Zz4KPC9zdmc+';
                    target.onerror = null; // Prevent infinite loop
                  }}
                />
              </div>
            ))}
            {collection.parts.length > 4 && (
              <div className="w-8 h-12 bg-gray-700 border-2 border-gray-900 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">+{collection.parts.length - 4}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                handleClick(); // Navigate to detail page
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Marathon</span>
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors">
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FranchiseCard;
