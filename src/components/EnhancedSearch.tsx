import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Clock, Star, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'collection' | 'person';
  year?: string;
  rating?: number;
  poster?: string;
}

export type FilterType = 'all' | 'movie' | 'tv' | 'collection' | 'person';

interface EnhancedSearchProps {
  /**
   * Optional callback fired when the expanded search UI is closed.
   */
  onClose?: () => void;
  /**
   * Controls whether the enhanced (expanded) search UI is shown.
   */
  isExpanded?: boolean;
}

/**
 * Validate that a query is a non-empty, non-whitespace string.
 * @param query - The input query to validate.
 * @returns True if valid; false otherwise.
 */
export const isValidQuery = (query: unknown): query is string =>
  typeof query === 'string' && query.trim().length > 0;

/**
 * Normalize a query for consistent matching.
 * Trims and lowercases the input to make matching deterministic.
 * Guards against non-string inputs.
 * @param query - The raw query string.
 * @returns Normalized query string (or empty string for invalid inputs).
 */
export const normalizeQuery = (query: unknown): string =>
  typeof query === 'string' ? query.trim().toLowerCase() : '';

/**
 * Normalize/validate incoming filter values into a known FilterType.
 * Pure helper that ensures callers always receive a valid filter id.
 * @param filter - Potential filter value from user input or URL.
 * @returns A validated FilterType (defaults to 'all' when unknown).
 */
export const normalizeFilter = (filter: unknown): FilterType => {
  if (typeof filter === 'string') {
    const f = filter as FilterType;
    if (f === 'all' || f === 'movie' || f === 'tv' || f === 'collection' || f === 'person') {
      return f;
    }
  }
  return 'all';
};

/**
 * Paginate an array of SearchSuggestion items safely.
 * Guards against non-array inputs and normalizes page bounds.
 * @param items - Array of items to paginate.
 * @param page - 1-based page index.
 * @param pageSize - Items per page.
 * @returns Object containing paginated items and metadata.
 */
export const paginateResults = (
  items: SearchSuggestion[] | null | undefined,
  page = 1,
  pageSize = 10
) => {
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const paged = safeItems.slice(start, start + pageSize);
  return {
    items: paged,
    page: normalizedPage,
    pageSize,
    totalPages,
    totalItems,
  };
};

/**
 * Update the recent searches list in a pure manner.
 * Keeps the most recent distinct queries first and limits the list to `limit`.
 * @param previous - Previous recent searches array.
 * @param newQuery - The query to add.
 * @param limit - Maximum number of recent items to keep.
 * @returns New array of recent searches.
 */
export const updateRecentSearches = (
  previous: string[],
  newQuery: string,
  limit = 5
): string[] => {
  if (!isValidQuery(newQuery)) return previous.slice(0, limit);
  const normalized = newQuery.trim();
  const filtered = previous.filter((item) => item !== normalized);
  const updated = [normalized, ...filtered].slice(0, limit);
  return updated;
};

/**
 * Rank suggestions by relevance.
 * Scoring logic (simple heuristic):
 * - Exact prefix match (title startsWith query) gets +100.
 * - Partial inclusion gets +50.
 * - Rating contributes up to +10 (rating / 10 * 10).
 * - Higher score sorts first; ties fall back to alphabetical title.
 *
 * This function is pure and exported for unit testing.
 * @param suggestions - Array of suggestions to rank.
 * @param rawQuery - The user's raw query string.
 * @returns A new array of suggestions sorted by descending relevance.
 */
export const rankSuggestions = (
  suggestions: SearchSuggestion[] | null | undefined,
  rawQuery: string
): SearchSuggestion[] => {
  if (!Array.isArray(suggestions)) return [];
  const q = normalizeQuery(rawQuery);
  if (!q) return suggestions.slice();

  const scoreFor = (s: SearchSuggestion): number => {
    const title = normalizeQuery(s.title || '');
    let score = 0;

    if (title.startsWith(q)) score += 100;
    else if (title.includes(q)) score += 50;

    if (typeof s.rating === 'number' && !Number.isNaN(s.rating)) {
      // normalize to 0..10 scale contribution
      const ratingContribution = Math.max(0, Math.min(10, s.rating)) / 10 * 10;
      score += ratingContribution;
    }

    return score;
  };

  return suggestions
    .map((s) => ({ s, score: scoreFor(s) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.s.title.localeCompare(b.s.title);
    })
    .map((item) => item.s);
};

/**
 * Simulate fetching suggestions from an API.
 * This pure helper accepts a data source and filtering dependencies so it can be unit tested.
 * It returns a Promise that resolves with filtered and ranked suggestions.
 *
 * For robustness:
 * - Rejects if query is invalid.
 * - Returns an empty array if no matches.
 *
 * @param query - The raw query string.
 * @param filter - Selected filter string ('all'|'movie'|'tv'|'collection'|'person').
 * @param data - The array of available suggestions to search within.
 * @param delayMs - Artificial delay in milliseconds to simulate network latency (default 300ms).
 * @returns Promise resolving to an array of SearchSuggestion.
 */
export const fetchSuggestions = async (
  query: string,
  filter: FilterType,
  data: SearchSuggestion[],
  delayMs = 300
): Promise<SearchSuggestion[]> => {
  return new Promise<SearchSuggestion[]>((resolve, reject) => {
    if (!isValidQuery(query)) {
      // Immediately resolve to empty array for invalid queries to simplify callers.
      resolve([]);
      return;
    }

    // Simulate async latency
    setTimeout(() => {
      try {
        const normalized = normalizeQuery(query);
        const safeFilter = normalizeFilter(filter);
        const safeData = Array.isArray(data) ? data : [];
        const filtered = safeData.filter((item) => {
          const matchesQuery = (item.title || '').toLowerCase().includes(normalized);
          const matchesFilter = safeFilter === 'all' ? true : item.type === safeFilter;
          return matchesQuery && matchesFilter;
        });

        const ranked = rankSuggestions(filtered, query);
        resolve(ranked);
      } catch (err) {
        // Defensive: ensure any unexpected error is surfaced to caller.
        reject(err);
      }
    }, delayMs);
  });
};

/**
 * Return an emoji icon for a given suggestion type.
 * Exported to allow unit testing and reuse.
 * @param type - One of 'movie'|'tv'|'collection'|'person' or any other string for default.
 */
export const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'movie':
      return '🎬';
    case 'tv':
      return '📺';
    case 'collection':
      return '🎭';
    case 'person':
      return '👤';
    default:
      return '🔍';
  }
};

/**
 * Map suggestion type to a Tailwind color class.
 * Exported for consistency and unit testing.
 * @param type - Suggestion type string.
 */
export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'movie':
      return 'text-blue-400';
    case 'tv':
      return 'text-green-400';
    case 'collection':
      return 'text-purple-400';
    case 'person':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

/**
 * Mock suggestion data used by the component as a local data source.
 * Kept in-file so the UI remains consistent and testable without external APIs.
 */
const mockSuggestions: SearchSuggestion[] = [
  {
    id: '1',
    title: 'Marvel Cinematic Universe',
    type: 'collection',
    year: '2008-2024',
    rating: 8.2,
    poster: '/api/placeholder/40/60'
  },
  {
    id: '2',
    title: 'The Dark Knight',
    type: 'movie',
    year: '2008',
    rating: 9.0,
    poster: '/api/placeholder/40/60'
  },
  {
    id: '3',
    title: 'Breaking Bad',
    type: 'tv',
    year: '2008-2013',
    rating: 9.5,
    poster: '/api/placeholder/40/60'
  },
  {
    id: '4',
    title: 'Star Wars Saga',
    type: 'collection',
    year: '1977-2019',
    rating: 8.5,
    poster: '/api/placeholder/40/60'
  }
];

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ onClose, isExpanded = false }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Marvel Cinematic Universe',
    'Christopher Nolan',
    'Horror Movies 2024',
    'Top Rated TV Shows'
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const searchFilters: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'movie', label: 'Movies', icon: Star },
    { id: 'tv', label: 'TV Shows', icon: TrendingUp },
    { id: 'collection', label: 'Collections', icon: Filter },
  ];

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  /**
   * Handle performing a search action triggered by user interactions.
   * Validates input, updates recent searches, navigates to the search results route,
   * clears transient state, and closes the expanded UI if provided.
   * This function intentionally accepts a raw string and performs its own validation.
   *
   * @param searchQuery - The raw query entered or selected by the user.
   */
  const handleSearch = (searchQuery: string) => {
    if (!isValidQuery(searchQuery)) {
      // Defensive: ignore invalid submissions.
      return;
    }

    const normalized = searchQuery.trim();

    setRecentSearches((prev) => updateRecentSearches(prev, normalized, 5));

    try {
      navigate(`/search?q=${encodeURIComponent(normalized)}&filter=${selectedFilter}`);
    } catch (err) {
      // If navigation fails, still clear UI state to avoid leaving inconsistent UI.
      // In real app, we might surface an error toast; keep silent here for parity.
    } finally {
      setQuery('');
      setSuggestions([]);
      onClose?.();
    }
  };

  /**
   * Handle input changes in a robust, testable manner.
   * Uses fetchSuggestions helper to retrieve suggestions and manages loading and error states.
   * The function is async but intentionally not awaited by callers to allow React events to continue.
   *
   * @param value - The new input value from the user.
   */
  const handleInputChange = async (value: string) => {
    setQuery(value);

    if (!isValidQuery(value)) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await fetchSuggestions(value, selectedFilter, mockSuggestions, 300);
      setSuggestions(results);
    } catch (err) {
      // Log for diagnostics but keep UI stable by setting no suggestions.
      // In a production app, we'd report this to monitoring or show user feedback.
      // eslint-disable-next-line no-console
      console.error('Failed to fetch suggestions', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="relative">
        <div className="flex items-center bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-netflix-red/50 transition-all duration-300">
          <Search className="w-5 h-5 text-gray-400 ml-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Search..."
            className="bg-transparent text-white placeholder-gray-400 px-3 py-3 outline-none w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="w-full max-w-4xl mx-4">
        <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white">Search CineFlix</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search for movies, TV shows, collections, or people..."
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-netflix-red/50 focus:outline-none focus:ring-2 focus:ring-netflix-red/20 transition-all"
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Search Filters */}
            <div className="flex items-center space-x-2 mt-4">
              {searchFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-netflix-red text-white'
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query && suggestions.length > 0 && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSearch(suggestion.title)}
                      className="w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
                    >
                      <div className="w-12 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                        <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                          <span className="text-2xl">{getTypeIcon(suggestion.type)}</span>
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-medium group-hover:text-netflix-red transition-colors">
                          {suggestion.title}
                        </h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className={`text-sm font-medium ${getTypeColor(suggestion.type)}`}>
                            {suggestion.type.toUpperCase()}
                          </span>
                          {suggestion.year && (
                            <span className="text-gray-400 text-sm">{suggestion.year}</span>
                          )}
                          {suggestion.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-gray-300 text-sm">{suggestion.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Searches</span>
                </h3>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                          {search}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecentSearches((prev) => prev.filter((item) => item !== search));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query && suggestions.length === 0 && !isLoading && (
              <div className="p-6 text-center">
                <div className="text-gray-400 mb-2">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No results found for "{query}"</p>
                  <p className="text-sm mt-1">Try searching for something else or check your spelling</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSearch;