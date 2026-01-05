import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Plus, Calendar, Info } from 'lucide-react';
import { Movie, TVShow } from '../../types';
import { getPosterUrl } from '../../services/tmdb';

interface BrowseResultsListProps {
    results: (Movie | TVShow)[];
}

const BrowseResultsList: React.FC<BrowseResultsListProps> = ({ results }) => {
    const isMovie = (item: Movie | TVShow): item is Movie => 'title' in item;

    return (
        <div className="space-y-4">
            {results.map((item, index) => {
                const title = isMovie(item) ? item.title : item.name;
                const date = isMovie(item) ? item.release_date : item.first_air_date;
                const year = date ? new Date(date).getFullYear() : '';
                const type = isMovie(item) ? 'movie' : 'tv';
                const rating = item.vote_average?.toFixed(1) || 'N/A';
                const overview = item.overview || 'No description available.';

                return (
                    <div
                        key={`${type}-${item.id}`}
                        className="browse-card group flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors duration-150 animate-fade-in-up"
                        style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                    >
                        {/* Poster */}
                        <Link to={`/${type}/${item.id}`} className="flex-shrink-0">
                            <img
                                src={getPosterUrl(item.poster_path, 'w185')}
                                alt={title}
                                className="w-24 md:w-32 aspect-[2/3] object-cover rounded-xl"
                                loading="lazy"
                            />
                        </Link>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                                <Link to={`/${type}/${item.id}`}>
                                    <h3 className="text-lg md:text-xl font-semibold text-white hover:text-netflix-red transition-colors line-clamp-1">
                                        {title}
                                    </h3>
                                </Link>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{year}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-white">{rating}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                                        {type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                                    </span>
                                </div>

                                <p className="mt-3 text-sm text-gray-400 line-clamp-2 md:line-clamp-3">
                                    {overview}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                                <Link
                                    to={`/${type}/${item.id}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-netflix-red text-white text-sm font-medium hover:bg-red-700 transition-colors duration-150"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    <span className="hidden sm:inline">Watch Now</span>
                                </Link>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors duration-150">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">My List</span>
                                </button>
                                <Link
                                    to={`/${type}/${item.id}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors duration-150"
                                >
                                    <Info className="w-4 h-4" />
                                    <span className="hidden sm:inline">More Info</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BrowseResultsList;
