import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScreenSize } from '../hooks/useScreenSize';
import {
  Search,
  X,
  Star,
  Mic,
  History,
  Heart,
  Plus,
  Check,
  Grid,
  List,
  Flame,
  Clock
} from 'lucide-react';
import { Content, Genre } from '../types';
import { searchContent, getMovieGenres, getTVGenres, getPosterUrl } from '../services/tmdb';
import { useMyList } from '../hooks/useMyList';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean; // Kept optional for compatibility but unused
  onToggleTheme?: () => void; // Kept optional for compatibility but unused
}

interface SearchFilters {
  genres: number[];
  releaseYear: { min: number; max: number };
  rating: { min: number; max: number };
  duration: { min: number; max: number };
  language: string;
  sortBy: 'relevance' | 'rating' | 'release_date' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

interface SearchResult extends Content {
  runtime?: number;
  first_air_date?: string;
  release_date?: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  // Hooks
  const navigate = useNavigate();
  const { addToList, removeByContentId, isInList, isLiked, toggleLike } = useMyList();
  const { isMobile } = useScreenSize();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'documentary' | 'kids'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState<string[]>([
    'Marvel', 'Star Wars', 'Harry Potter', 'The Office', 'Breaking Bad',
    'Stranger Things', 'Game of Thrones', 'The Batman', 'Top Gun', 'Avatar'
  ]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const handleLike = async (e: React.MouseEvent, item: SearchResult) => {
    e.stopPropagation();
    try {
      await toggleLike(item as any, item.media_type as 'movie' | 'tv' || 'movie');
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleMyListClick = async (e: React.MouseEvent, item: SearchResult) => {
    e.stopPropagation();
    const mediaType = item.media_type as 'movie' | 'tv' || 'movie';
    if (isInList(item.id, mediaType)) {
      await removeByContentId(item.id, mediaType);
    } else {
      await addToList(item as any, mediaType);
    }
  };

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    releaseYear: { min: 1900, max: new Date().getFullYear() },
    rating: { min: 0, max: 10 },
    duration: { min: 0, max: 300 },
    language: '',
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load genres on mount
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const [movieGenres, tvGenres] = await Promise.all([
          getMovieGenres(),
          getTVGenres()
        ]);
        const allGenres = [...movieGenres, ...tvGenres].reduce((acc, genre) => {
          if (!acc.find(g => g.id === genre.id)) {
            acc.push(genre);
          }
          return acc;
        }, [] as Genre[]);
        setGenres(allGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    loadGenres();

    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));

    const savedRecent = localStorage.getItem('recent_searches');
    if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (query: string, resetResults = true) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const searchPage = resetResults ? 1 : page;
      const response = await searchContent(query, searchPage);

      let filteredResults = response.results;

      // Apply tab filter
      if (activeTab !== 'all') {
        filteredResults = filteredResults.filter(item => {
          if (activeTab === 'movie') return item.media_type === 'movie';
          if (activeTab === 'tv') return item.media_type === 'tv';
          if (activeTab === 'documentary') return item.genre_ids.includes(99);
          if (activeTab === 'kids') return item.genre_ids.includes(10751);
          return true;
        });
      }

      // Apply filters
      filteredResults = applyFilters(filteredResults);

      if (resetResults) {
        setSearchResults(filteredResults);
        setPage(1);
      } else {
        setSearchResults(prev => [...prev, ...filteredResults]);
      }

      setHasMore(response.page < response.total_pages);

      // Save to search history
      if (resetResults && query.trim()) {
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 20);
        setSearchHistory(newHistory);
        localStorage.setItem('search_history', JSON.stringify(newHistory));

        const newRecent = [query, ...recentSearches.filter(r => r !== query)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recent_searches', JSON.stringify(newRecent));
      }

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchHistory, recentSearches, activeTab, page, filters]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(value, true);
    }, 300);
  };

  const applyFilters = (results: Content[]): SearchResult[] => {
    return results.filter(item => {
      if (filters.genres.length > 0) {
        const hasMatchingGenre = filters.genres.some(genreId =>
          item.genre_ids.includes(genreId)
        );
        if (!hasMatchingGenre) return false;
      }

      if (item.vote_average < filters.rating.min || item.vote_average > filters.rating.max) return false;

      const year = item.media_type === 'movie'
        ? new Date(item.release_date || '').getFullYear()
        : new Date(item.first_air_date || '').getFullYear();

      if (year < filters.releaseYear.min || year > filters.releaseYear.max) return false;

      return true;
    }) as SearchResult[];
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsVoiceSearch(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        performSearch(transcript, true);
      };

      recognition.onend = () => setIsVoiceSearch(false);

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsVoiceSearch(false);
      };

      recognition.start();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

          {/* Transparent Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl h-[85vh] bg-[#121212]/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header / Search Input */}
            <div className="flex-shrink-0 p-6 border-b border-white/10 flex items-center gap-4">
              <Search className="w-6 h-6 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search titles, people, or genres..."
                className="flex-1 bg-transparent text-2xl text-white placeholder-gray-500 outline-none font-medium"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={startVoiceSearch}
                  className={`p-3 rounded-full transition-colors ${isVoiceSearch
                    ? 'text-netflix-red bg-netflix-red/10 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <div className="h-8 w-px bg-white/10 mx-2" />
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

              {/* Sidebar Filters (Restored) */}
              <div className="w-72 flex-shrink-0 border-r border-white/10 overflow-y-auto scrollbar-hide bg-black/20 p-6 space-y-8 hidden md:block">

                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Categories</h3>
                  <div className="space-y-1">
                    {[
                      { id: 'all', label: 'All Results' },
                      { id: 'movie', label: 'Movies' },
                      { id: 'tv', label: 'TV Shows' },
                      { id: 'documentary', label: 'Documentaries' },
                      { id: 'kids', label: 'Kids' }
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === id
                          ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Sort By</h3>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:border-netflix-red outline-none"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Top Rated</option>
                    <option value="release_date">Newest Releases</option>
                    <option value="popularity">Popularity</option>
                  </select>
                </div>

                {/* Genres */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map(genre => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          if (filters.genres.includes(genre.id)) {
                            setFilters(prev => ({ ...prev, genres: prev.genres.filter(id => id !== genre.id) }));
                          } else {
                            setFilters(prev => ({ ...prev, genres: [...prev.genres, genre.id] }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${filters.genres.includes(genre.id)
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
                          }`}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ratings */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Min Rating: {filters.rating.min}</h3>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={filters.rating.min}
                    onChange={(e) => setFilters(prev => ({ ...prev, rating: { ...prev.rating, min: parseFloat(e.target.value) } }))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-netflix-red"
                  />
                </div>
              </div>

              {/* Results Grid */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8">

                {/* View toggles & Mobile Filter toggle */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {searchQuery ? `Results for "${searchQuery}"` : "Discover"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                          }`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                          }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {!searchQuery && searchResults.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center -mt-20">
                    {/* Default View / Recent / Trending */}
                    <div className="w-full max-w-2xl space-y-12">
                      {recentSearches.length > 0 && (
                        <div>
                          <h3 className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Recent
                          </h3>
                          <div className="space-y-1">
                            {recentSearches.map((term, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setSearchQuery(term);
                                  performSearch(term, true);
                                }}
                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 text-left group transition-all text-gray-400 hover:text-white"
                              >
                                <History className="w-4 h-4 opacity-50" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
                          <Flame className="w-4 h-4 text-netflix-red" /> Trending Now
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trendingSearches.map((term, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSearchQuery(term);
                                performSearch(term, true);
                              }}
                              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 text-sm transition-all"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "space-y-4"}>
                    {searchResults.length === 0 && !isLoading ? (
                      <div className="col-span-full py-20 text-center text-gray-500">
                        No results found for your search.
                      </div>
                    ) : (
                      searchResults.map((item) => (
                        <motion.div
                          layout
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          className={`group cursor-pointer relative ${viewMode === 'list' ? 'flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-netflix-red/30 transition-colors' : ''
                            }`}
                          onClick={() => {
                            onClose();
                            navigate(item.media_type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`);
                          }}
                        >
                          <div className={`relative overflow-hidden rounded-xl bg-gray-900 ${viewMode === 'list' ? 'w-32 aspect-[2/3]' : 'aspect-[2/3] shadow-lg'}`}>
                            <img
                              src={getPosterUrl(item.poster_path)}
                              alt={item.title || item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />

                            {/* Hover Overlay with Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-10 backdrop-blur-[2px]">
                              <button
                                onClick={(e) => handleLike(e, item as any)}
                                className="p-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white hover:scale-110 transition-all group/btn"
                                title="Like"
                              >
                                <Heart className={`w-5 h-5 transition-colors ${isLiked(item.id, (item.media_type as 'movie' | 'tv') || 'movie')
                                  ? 'fill-netflix-red text-netflix-red'
                                  : 'text-white'
                                  }`} />
                              </button>
                              <button
                                onClick={(e) => handleMyListClick(e, item as any)}
                                className={`p-3 rounded-full border hover:scale-110 transition-all group/btn ${isInList(item.id, (item.media_type as 'movie' | 'tv') || 'movie')
                                  ? 'bg-netflix-red border-netflix-red text-white'
                                  : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white text-white'
                                  }`}
                                title={isInList(item.id, (item.media_type as 'movie' | 'tv') || 'movie') ? "Remove from List" : "Add to My List"}
                              >
                                {isInList(item.id, (item.media_type as 'movie' | 'tv') || 'movie') ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {viewMode === 'grid' && (
                            <div className="mt-3 space-y-1">
                              <h4 className="text-white font-medium leading-tight line-clamp-1 text-sm group-hover:text-netflix-red transition-colors">
                                {item.title || item.name}
                              </h4>
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-netflix-red fill-current" />
                                  {item.vote_average.toFixed(1)}
                                </span>
                                <span>{new Date(item.release_date || item.first_air_date || '').getFullYear() || ''}</span>
                              </div>
                            </div>
                          )}

                          {viewMode === 'list' && (
                            <div className="flex-1 py-1">
                              <div className="flex items-start justify-between">
                                <h4 className="text-lg text-white font-bold mb-2 group-hover:text-netflix-red transition-colors">{item.title || item.name}</h4>
                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs uppercase text-gray-400">{item.media_type}</span>
                              </div>
                              <p className="text-gray-400 text-sm line-clamp-2 mb-3 leading-relaxed">{item.overview}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-300">
                                <span className="text-netflix-red flex items-center gap-1 bg-netflix-red/10 px-2 py-1 rounded"><Star className="w-3 h-3 fill-current" /> {item.vote_average.toFixed(1)}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;