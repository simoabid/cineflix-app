import React from 'react';
import { Plus, Search, Filter, Heart, Film, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  hasItems: boolean;
  searchQuery: string;
  onClearFilters: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasItems,
  searchQuery,
  onClearFilters
}) => {
  // No search results
  if (hasItems && searchQuery) {
    return (
      <div className="text-center py-16">
        <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          No results found for "{searchQuery}"
        </h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Try adjusting your search terms or clearing filters to see more results.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onClearFilters}
            className="px-6 py-3 bg-netflix-red hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Clear Search & Filters
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Browse Content
          </Link>
        </div>
      </div>
    );
  }

  // No items after filtering
  if (hasItems) {
    return (
      <div className="text-center py-16">
        <Filter className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          No items match your filters
        </h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Try adjusting your filters to see more content from your list.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onClearFilters}
            className="px-6 py-3 bg-netflix-red hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Add More Content
          </Link>
        </div>
      </div>
    );
  }

  // Completely empty list
  return (
    <div className="text-center py-16">
      <div className="mb-8">
        <div className="flex justify-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
            <Film className="w-8 h-8 text-gray-600" />
          </div>
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
            <Tv className="w-8 h-8 text-gray-600" />
          </div>
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
            <Heart className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Your list is empty
        </h2>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
          Start building your personal watchlist by adding movies and TV shows you want to watch. 
          Keep track of your progress, rate content, and organize everything in one place.
        </p>
      </div>

      {/* Quick Start Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
        <Link
          to="/movies"
          className="group bg-gray-900 hover:bg-gray-800 rounded-lg p-6 transition-colors"
        >
          <Film className="w-12 h-12 text-netflix-red mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-white mb-2">Browse Movies</h3>
          <p className="text-gray-400">
            Discover trending movies, classics, and new releases to add to your list.
          </p>
        </Link>

        <Link
          to="/tv-shows"
          className="group bg-gray-900 hover:bg-gray-800 rounded-lg p-6 transition-colors"
        >
          <Tv className="w-12 h-12 text-netflix-red mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-white mb-2">Browse TV Shows</h3>
          <p className="text-gray-400">
            Find your next binge-worthy series from our extensive TV show collection.
          </p>
        </Link>

        <Link
          to="/new-popular"
          className="group bg-gray-900 hover:bg-gray-800 rounded-lg p-6 transition-colors"
        >
          <Plus className="w-12 h-12 text-netflix-red mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-white mb-2">What's Popular</h3>
          <p className="text-gray-400">
            Check out what's trending and popular right now across all categories.
          </p>
        </Link>
      </div>

      {/* Features Preview */}
      <div className="bg-gray-900/50 rounded-lg p-8 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          What you can do with My List
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <div className="w-12 h-12 bg-netflix-red/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-netflix-red" />
            </div>
            <h4 className="text-white font-medium mb-1">Add & Organize</h4>
            <p className="text-gray-400 text-sm">Save movies and shows with custom tags and priorities</p>
          </div>
          
          <div>
            <div className="w-12 h-12 bg-netflix-red/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-netflix-red" />
            </div>
            <h4 className="text-white font-medium mb-1">Search & Filter</h4>
            <p className="text-gray-400 text-sm">Quickly find content with powerful search and filters</p>
          </div>
          
          <div>
            <div className="w-12 h-12 bg-netflix-red/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-netflix-red" />
            </div>
            <h4 className="text-white font-medium mb-1">Track Progress</h4>
            <p className="text-gray-400 text-sm">Monitor your watching progress and completion status</p>
          </div>
          
          <div>
            <div className="w-12 h-12 bg-netflix-red/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6 text-netflix-red" />
            </div>
            <h4 className="text-white font-medium mb-1">Multiple Views</h4>
            <p className="text-gray-400 text-sm">Switch between grid, list, and compact viewing modes</p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Start Building Your List
        </Link>
      </div>
    </div>
  );
};

export default EmptyState;
