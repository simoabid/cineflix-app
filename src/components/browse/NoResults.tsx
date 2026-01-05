import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface NoResultsProps {
    hasFilters: boolean;
    onClearFilters: () => void;
}

const NoResults: React.FC<NoResultsProps> = ({ hasFilters, onClearFilters }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            {/* Illustration */}
            <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <Search className="w-16 h-16 text-gray-600" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-netflix-red/20 flex items-center justify-center">
                    <span className="text-2xl">😕</span>
                </div>
            </div>

            {/* Message */}
            <h3 className="text-2xl font-bold text-white mb-3">
                No Results Found
            </h3>
            <p className="text-gray-400 max-w-md mb-8">
                {hasFilters
                    ? "We couldn't find anything matching your filters. Try adjusting your criteria or clear all filters to see more content."
                    : "Something went wrong loading content. Please try again."}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
                {hasFilters && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red text-white font-medium hover:bg-red-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Clear All Filters
                    </button>
                )}
            </div>

            {/* Suggestions */}
            {hasFilters && (
                <div className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/10 max-w-md">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">💡 Suggestions</h4>
                    <ul className="text-sm text-gray-400 space-y-2 text-left">
                        <li>• Try removing some genre filters</li>
                        <li>• Broaden your year range</li>
                        <li>• Lower the minimum rating</li>
                        <li>• Switch between Movies and TV Shows</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default NoResults;
