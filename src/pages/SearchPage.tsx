import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { searchContent } from '../services/tmdb';
import { Content } from '../types';
import { getImageUrl } from '../services/tmdb';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchContent(query);
      setResults(response.results.filter(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      ));
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const getTitle = (item: Content) => {
    return item.title || item.name || 'Untitled';
  };

  const getReleaseYear = (item: Content) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  return (
    <div className="min-h-screen bg-netflix-black pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Search Results</h1>
          
          <form onSubmit={handleSearch} className="max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies and TV shows..."
                className="w-full bg-gray-800 text-white px-4 py-3 pl-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </form>
        </div>

        {/* Search Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              {/* Main thick spinner */}
              <div className="h-16 w-16 netflix-spinner-thick" />
              
              {/* Ripple effects */}
              <div className="h-16 w-16 netflix-ripple" />
              <div className="h-16 w-16 netflix-ripple" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400 mb-2">
              {searchQuery ? 'No results found' : 'Search for movies and TV shows'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? `No results found for "${searchQuery}"`
                : 'Enter a search term to get started'
              }
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-6">
              Found {results.length} results for "{searchQuery}"
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to={`/${item.media_type}/${item.id}`}
                  className="group relative"
                >
                  <div className="aspect-video bg-gray-800 rounded overflow-hidden">
                    <img
                      src={getImageUrl(item.poster_path, 'w500')}
                      alt={getTitle(item)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                      }}
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="mt-2">
                    <h3 className="text-white font-medium text-sm line-clamp-2">
                      {getTitle(item)}
                    </h3>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <span>{getReleaseYear(item)}</span>
                      <span className="mx-1">•</span>
                      <span className="text-yellow-400">★ {Math.round(item.vote_average * 10) / 10}</span>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">
                      {item.media_type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
