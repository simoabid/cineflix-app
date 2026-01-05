import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Plus, Calendar } from 'lucide-react';
import { Movie, TVShow } from '../../types';
import { ViewMode } from '../../types/browse';
import { getPosterUrl } from '../../services/tmdb';

interface BrowseResultsGridProps {
    results: (Movie | TVShow)[];
    loading: boolean;
    viewMode: ViewMode;
}

const BrowseResultsGrid: React.FC<BrowseResultsGridProps> = ({ results, loading, viewMode }) => {
    // Loading skeleton
    if (loading) {
        return (
            <div className={`grid gap-3 ${viewMode === 'compact'
                ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
                : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9'
                }`}>
                {Array.from({ length: 24 }).map((_, i) => (
                    <div
                        key={i}
                        className="aspect-[2/3] bg-gray-800/50 rounded-lg animate-pulse"
                        style={{ animationDelay: `${i * 30}ms` }}
                    />
                ))}
            </div>
        );
    }

    const isMovie = (item: Movie | TVShow): item is Movie => 'title' in item;

    return (
        <div className={`grid gap-3 ${viewMode === 'compact'
            ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
            : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9'
            }`}>
            {results.map((item, index) => {
                const title = isMovie(item) ? item.title : item.name;
                const date = isMovie(item) ? item.release_date : item.first_air_date;
                const year = date ? new Date(date).getFullYear() : '';
                const type = isMovie(item) ? 'movie' : 'tv';
                const rating = item.vote_average?.toFixed(1) || 'N/A';

                return (
                    <Link
                        key={`${type}-${item.id}`}
                        to={`/${type}/${item.id}`}
                        className="browse-card group relative aspect-[2/3] rounded-lg overflow-visible bg-gray-900 animate-fade-in-up transition-all duration-300 ease-out hover:scale-[1.15] hover:z-50 hover:shadow-[0_20px_60px_rgba(229,9,20,0.4)]"
                        style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
                    >
                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                            {/* Poster */}
                            <img
                                src={getPosterUrl(item.poster_path, 'w342')}
                                alt={title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />

                            {/* Simple gradient overlay - no backdrop blur for performance */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            {/* Rating Badge - simplified, no backdrop blur */}
                            <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/80">
                                <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                <span className="text-[10px] font-medium text-white">{rating}</span>
                            </div>

                            {/* Content Type Badge - simplified */}
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80">
                                <span className="text-[10px] font-medium text-gray-300">{type === 'movie' ? '🎬' : '📺'}</span>
                            </div>

                            {/* Hover Content - slides up smoothly */}
                            <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
                                <h3 className={`font-semibold text-white mb-1 line-clamp-2 ${viewMode === 'compact' ? 'text-[10px]' : 'text-xs'}`}>
                                    {title}
                                </h3>

                                {viewMode !== 'compact' && (
                                    <>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
                                            <Calendar className="w-2.5 h-2.5" />
                                            <span>{year}</span>
                                            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                            <span>{rating}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-netflix-red text-white text-[10px] font-medium hover:bg-red-700 transition-colors duration-150">
                                                <Play className="w-2.5 h-2.5 fill-current" />
                                                Play
                                            </button>
                                            <button className="p-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors duration-150">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default BrowseResultsGrid;
