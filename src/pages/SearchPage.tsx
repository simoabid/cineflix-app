import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { searchContent } from '../services/tmdb';
import { Content } from '../types';
import { getImageUrl } from '../services/tmdb';
import { Container } from '../components/layout';
import LoadingScreen from '../components/feedback/LoadingScreen';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import { SEOHead } from '../components/layout/SEOHead';
import { analytics } from '../services/analytics';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await searchContent(query);
      const filtered = response.results.filter(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
      setResults(filtered);
      analytics.trackSearch(query, filtered.length);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
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

  const handleClick = (item: Content) => {
    analytics.trackContentClick({
      contentId: item.id,
      contentTitle: getTitle(item),
      contentType: item.media_type as 'movie' | 'tv',
      section: 'Search Results'
    });
  };

  return (
    <div className="min-h-screen bg-background-main pt-24">
      <SEOHead
        title="Search"
        description="Search for movies, TV shows, and cast members on CINEFLIX."
      />
      <Container>
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
                className="w-full bg-gray-800 text-white px-4 py-3 pl-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-buttons-purple"
              />
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </form>
        </div>

        {/* Search Results */}
        {loading ? (
          <LoadingScreen inline message={`Searching for "${searchQuery}"...`} />
        ) : error ? (
          <ErrorState
            inline
            title="Search failed"
            message={error}
            onRetry={() => performSearch(searchQuery)}
          />
        ) : results.length === 0 ? (
          <EmptyState
            variant="search"
            title={searchQuery ? 'No results found' : 'Search CineFlix'}
            description={
              searchQuery 
                ? `We couldn't find any matches for "${searchQuery}". Please check your spelling or try another keyword.`
                : 'Enter a search term above to discover movies and TV shows.'
            }
          />
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
                  onClick={() => handleClick(item)}
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
      </Container>
    </div>
  );
};

export default SearchPage;
