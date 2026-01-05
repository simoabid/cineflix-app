import React from 'react';
import {
  Grid,
  List,
  MoreHorizontal,
  BarChart3,
  Download,

  Search
} from 'lucide-react';
import { ViewMode, ListStats } from '../../types/myList';

interface MyListHeaderProps {
  stats: ListStats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  onStatsClick: () => void;
  onExportClick: () => void;
  selectedCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MyListHeader: React.FC<MyListHeaderProps> = ({
  stats,
  viewMode,
  onViewModeChange,

  onStatsClick,
  onExportClick,
  selectedCount,
  totalCount,
  searchQuery,
  onSearchChange
}) => {


  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="mb-2">
      {/* Title and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2 gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-2">
            <h1 className="text-4xl font-bold text-white whitespace-nowrap">My List</h1>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your list..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-gray-800/50 text-white pl-9 pr-4 py-2 rounded-full border border-gray-700/50 focus:border-netflix-red focus:outline-none focus:ring-1 focus:ring-netflix-red text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-gray-400 text-sm">
            <span>{stats.totalItems} items</span>
            <span>•</span>
            <span>{stats.totalMovies} movies</span>
            <span>•</span>
            <span>{stats.totalTVShows} TV shows</span>
            <span>•</span>
            <span>{formatHours(stats.totalHours)} total</span>
            {stats.completionRate > 0 && (
              <>
                <span>•</span>
                <span>{stats.completionRate}% completed</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-1">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm mr-2">View:</span>
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'bg-netflix-red text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                onClick={() => onViewModeChange('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${viewMode === 'list'
                  ? 'bg-netflix-red text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>

              <button
                onClick={() => onViewModeChange('compact')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${viewMode === 'compact'
                  ? 'bg-netflix-red text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>
          </div>

          <button
            onClick={onStatsClick}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          <button
            onClick={onExportClick}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Selection Info */}
      {selectedCount > 0 && (
        <div className="bg-netflix-red/10 border border-netflix-red/20 rounded-lg p-4 mb-6">
          <p className="text-netflix-red">
            {selectedCount} of {totalCount} items selected
          </p>
        </div>
      )}


    </div>
  );
};

export default MyListHeader;
