import React, { useState } from 'react';
import { Filter, X, ChevronDown, Tag, Calendar, Star, Clock, Film, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { FilterOptions, SortOption, SortDirection } from '../../types/myList';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  availableTags: string[];
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SortOption, direction?: SortDirection) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableTags,
  sortBy,
  sortDirection,
  onSortChange
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const hasActiveFilters = () => {
    return (
      filters.contentType !== 'all' ||
      filters.status !== 'all' ||
      filters.genres.length > 0 ||
      filters.dateAdded !== 'all' ||
      filters.rating !== 'all' ||
      filters.runtime !== 'all' ||
      filters.releaseYear !== 'all' ||
      filters.customTags.length > 0 ||
      filters.priority !== 'all' ||
      filters.liked !== 'all'
    );
  };

  const clearAllFilters = () => {
    onFilterChange({
      contentType: 'all',
      status: 'all',
      genres: [],
      dateAdded: 'all',
      rating: 'all',
      runtime: 'all',
      releaseYear: 'all',
      customTags: [],
      priority: 'all',
      liked: 'all'
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.customTags.includes(tag)
      ? filters.customTags.filter(t => t !== tag)
      : [...filters.customTags, tag];
    onFilterChange({ customTags: newTags });
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-4">
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Filters:</span>
          </div>

          {/* Content Type */}
          <select
            value={filters.contentType}
            onChange={(e) => onFilterChange({ contentType: e.target.value as any })}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
          >
            <option value="all">All Content</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
            <option value="documentary">Documentaries</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value as any })}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="notStarted">Not Started</option>
            <option value="inProgress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          {/* Priority */}
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value as any })}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Liked Content */}
          <select
            value={filters.liked}
            onChange={(e) => onFilterChange({ liked: e.target.value as any })}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
          >
            <option value="all">All Content</option>
            <option value="liked">❤️ Liked</option>
            <option value="notLiked">Not Liked</option>
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <span>Advanced</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear Filters */}
          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-3 py-2 bg-netflix-red hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start xl:self-auto pt-1 xl:pt-0">
          <span className="text-gray-400 text-sm mr-2 whitespace-nowrap">Sort by:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSortChange('dateAdded')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${sortBy === 'dateAdded'
                ? 'bg-netflix-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              Date Added
              {getSortIcon('dateAdded')}
            </button>

            <button
              onClick={() => onSortChange('title')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${sortBy === 'title'
                ? 'bg-netflix-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              Title
              {getSortIcon('title')}
            </button>

            <button
              onClick={() => onSortChange('rating')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${sortBy === 'rating'
                ? 'bg-netflix-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              Rating
              {getSortIcon('rating')}
            </button>

            <button
              onClick={() => onSortChange('runtime')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${sortBy === 'runtime'
                ? 'bg-netflix-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              <span className="hidden sm:inline">Runtime</span>
              <span className="sm:hidden">Time</span>
              {getSortIcon('runtime')}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Added */}
            <div>
              <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                Date Added
              </label>
              <select
                value={filters.dateAdded}
                onChange={(e) => onFilterChange({ dateAdded: e.target.value as any })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="lastWeek">Last Week</option>
                <option value="lastMonth">Last Month</option>
                <option value="lastYear">Last Year</option>
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Star className="w-4 h-4" />
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => onFilterChange({ rating: e.target.value as any })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
              >
                <option value="all">All Ratings</option>
                <option value="high">High (8.0+)</option>
                <option value="medium">Medium (6.0-7.9)</option>
                <option value="low">Low (&lt;6.0)</option>
              </select>
            </div>

            {/* Runtime */}
            <div>
              <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                Runtime
              </label>
              <select
                value={filters.runtime}
                onChange={(e) => onFilterChange({ runtime: e.target.value as any })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
              >
                <option value="all">All Lengths</option>
                <option value="short">Short (&lt;90 min)</option>
                <option value="medium">Medium (90-150 min)</option>
                <option value="long">Long (150+ min)</option>
              </select>
            </div>

            {/* Release Year */}
            <div>
              <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                Release Year
              </label>
              <select
                value={filters.releaseYear}
                onChange={(e) => onFilterChange({ releaseYear: e.target.value as any })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-netflix-red focus:outline-none"
              >
                <option value="all">All Years</option>
                <option value="recent">Recent (2020+)</option>
                <option value="classic">Classic (Before 2000)</option>
              </select>
            </div>
          </div>

          {/* Custom Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Tag className="w-4 h-4" />
                Custom Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${filters.customTags.includes(tag)
                      ? 'bg-netflix-red text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Pills */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 mt-4">
          {filters.contentType !== 'all' && (
            <div className="flex items-center gap-2 bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm">
              <Film className="w-3 h-3" />
              {filters.contentType === 'movie' ? 'Movies' :
                filters.contentType === 'tv' ? 'TV Shows' :
                  filters.contentType === 'documentary' ? 'Documentaries' : filters.contentType}
              <button
                onClick={() => onFilterChange({ contentType: 'all' })}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {filters.status !== 'all' && (
            <div className="flex items-center gap-2 bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm">
              <span className="capitalize">{filters.status.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button
                onClick={() => onFilterChange({ status: 'all' })}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {filters.priority !== 'all' && (
            <div className="flex items-center gap-2 bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm">
              <span className="capitalize">{filters.priority} Priority</span>
              <button
                onClick={() => onFilterChange({ priority: 'all' })}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {filters.customTags.map(tag => (
            <div key={tag} className="flex items-center gap-2 bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm">
              <Tag className="w-3 h-3" />
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
