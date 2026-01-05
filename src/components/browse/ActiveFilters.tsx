import React from 'react';
import { X, Calendar, Star, Film, Tv } from 'lucide-react';
import { Genre } from '../../types';
import { BrowseFilters, DEFAULT_BROWSE_FILTERS } from '../../types/browse';

interface ActiveFiltersProps {
    filters: BrowseFilters;
    genres: Genre[];
    onRemoveGenre: (genreId: number) => void;
    onResetYears: () => void;
    onResetRating: () => void;
    onResetContentType: () => void;
    onClearAll: () => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
    filters,
    genres,
    onRemoveGenre,
    onResetYears,
    onResetRating,
    onResetContentType,
    onClearAll,
}) => {
    const getGenreName = (id: number) => genres.find(g => g.id === id)?.name || 'Unknown';

    const currentYear = new Date().getFullYear();
    const hasYearFilter = filters.yearMin !== DEFAULT_BROWSE_FILTERS.yearMin ||
        filters.yearMax !== currentYear;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Active Filters:</span>

            {/* Genre Chips */}
            {filters.genres.map(genreId => (
                <button
                    key={genreId}
                    onClick={() => onRemoveGenre(genreId)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-netflix-red/20 text-netflix-red text-sm font-medium border border-netflix-red/30 hover:bg-netflix-red/30 transition-colors"
                >
                    <span>{getGenreName(genreId)}</span>
                    <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </button>
            ))}

            {/* Year Range Chip */}
            {hasYearFilter && (
                <button
                    onClick={onResetYears}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{filters.yearMin} - {filters.yearMax}</span>
                    <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </button>
            )}

            {/* Rating Chip */}
            {filters.minRating > 0 && (
                <button
                    onClick={onResetRating}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
                >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{filters.minRating}+ Rating</span>
                    <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </button>
            )}

            {/* Content Type Chip */}
            {filters.contentType !== 'all' && (
                <button
                    onClick={onResetContentType}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                >
                    {filters.contentType === 'movie' ? (
                        <>
                            <Film className="w-3.5 h-3.5" />
                            <span>Movies Only</span>
                        </>
                    ) : (
                        <>
                            <Tv className="w-3.5 h-3.5" />
                            <span>TV Shows Only</span>
                        </>
                    )}
                    <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </button>
            )}

            {/* Clear All */}
            <button
                onClick={onClearAll}
                className="ml-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
                Clear All
            </button>
        </div>
    );
};

export default ActiveFilters;
