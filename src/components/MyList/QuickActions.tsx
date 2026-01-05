import React from 'react';
import { Play, Plus, ArrowRight } from 'lucide-react';
import { MyListItem } from '../../types/myList';
import { Link } from 'react-router-dom';

interface QuickActionsProps {
  continueWatching: MyListItem[];
  recentlyAdded: MyListItem[];
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  continueWatching,
  recentlyAdded
}) => {
  const getImageUrl = (path: string | null, size: string = 'w300') => {
    if (!path) return '/api/placeholder/300/450';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const getTitle = (item: MyListItem) => {
    return (item.content as any).title || (item.content as any).name || 'Unknown Title';
  };

  const getYear = (item: MyListItem) => {
    const date = (item.content as any).release_date || (item.content as any).first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  const formatProgress = (progress: number) => {
    return `${Math.round(progress)}%`;
  };

  const ItemCard: React.FC<{ item: MyListItem; showProgress?: boolean }> = ({ item, showProgress = false }) => (
    <div className="group relative bg-gray-900 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
      <Link to={`/${item.contentType}/${item.contentId}`} className="block">
        <div className="aspect-[2/3] relative">
          <img
            src={getImageUrl(item.content.poster_path)}
            alt={getTitle(item)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Progress Bar */}
          {showProgress && item.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
              <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                <div 
                  className="bg-netflix-red h-1 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="text-xs text-white">{formatProgress(item.progress)} watched</p>
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
            <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>

          {/* Priority Indicator */}
          {item.priority === 'high' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-netflix-red rounded-full"></div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">{getTitle(item)}</h3>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{getYear(item)}</span>
          <span className="capitalize">{item.contentType}</span>
        </div>
        
        {item.personalRating && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-400">★</span>
            <span className="text-xs text-gray-400">{item.personalRating}/5</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mb-8 space-y-6">
      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-netflix-red" />
              Continue Watching
            </h2>
            <Link 
              to="/my-list?filter=inProgress"
              className="text-netflix-red hover:text-red-400 text-sm flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {continueWatching.slice(0, 6).map(item => (
              <ItemCard key={item.id} item={item} showProgress={true} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-netflix-red" />
              Recently Added
            </h2>
            <Link 
              to="/my-list?sort=dateAdded"
              className="text-netflix-red hover:text-red-400 text-sm flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyAdded.slice(0, 6).map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-netflix-red">{continueWatching.length}</div>
            <div className="text-sm text-gray-400">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-netflix-red">{recentlyAdded.length}</div>
            <div className="text-sm text-gray-400">Recently Added</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-netflix-red">
              {continueWatching.filter(item => item.priority === 'high').length}
            </div>
            <div className="text-sm text-gray-400">High Priority</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-netflix-red">
              {Math.round(continueWatching.reduce((sum, item) => sum + item.progress, 0) / Math.max(continueWatching.length, 1))}%
            </div>
            <div className="text-sm text-gray-400">Avg Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
