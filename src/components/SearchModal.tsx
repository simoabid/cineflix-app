import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
import { useLenisToggle } from '../hooks/useLenisToggle';

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
  // Disable background scrolling when modal is open
  useLenisToggle(isOpen);

  // Hooks
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { addToList, removeByContentId, isInList, isLiked, toggleLike } = useMyList();


  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'documentary' | 'kids'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState<string[]>([
    'Marvel', 'Star Wars', 'Harry Potter', 'The Office', 'Breaking Bad',
    'Stranger Things', 'Game of Thrones', 'The Batman', 'Top Gun', 'Avatar'
  ]);
  const [page, setPage] = useState(1);
  const [, setHasMore] = useState(true);

  const handleLike = async (e: React.MouseEvent, item: SearchResult) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Please sign in to like your favorite content', 'warning');
      return;
    }
    try {
      await toggleLike(item as any, item.media_type as 'movie' | 'tv' || 'movie');
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleMyListClick = async (e: React.MouseEvent, item: SearchResult) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Please sign in to add items to your list', 'warning');
      return;
    }
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

  // Re-run search automatically when category tab or filters change
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery, true);
    }
  }, [activeTab, filters, performSearch]);

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
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

          {/* Transparent/Glassmorphic Modal Box - Full Screen on mobile, Centered Modal on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="relative w-full h-full md:max-w-7xl md:h-[85vh] bg-[#0c0c0e]/95 md:bg-[#121212]/70 md:backdrop-blur-xl border-0 md:border md:border-white/10 rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header / Search Input */}
            <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 flex items-center gap-1.5 sm:gap-4">
              <Search className="w-4 h-4 sm:w-5 h-5 md:w-6 h-6 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search movies, shows..."
                className="flex-1 bg-transparent text-sm sm:text-base md:text-xl text-white placeholder-gray-500 outline-none font-medium"
              />
              <div className="flex items-center gap-0.5 sm:gap-2">
                <button
                  onClick={startVoiceSearch}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors ${isVoiceSearch
                    ? 'text-netflix-red bg-netflix-red/10 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  aria-label={isVoiceSearch ? 'Listening...' : 'Voice search'}
                >
                  <Mic className="w-4 h-4 sm:w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-white/10 mx-0.5 sm:mx-2" />
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

              {/* Sidebar Filters (Restored, hidden on mobile) */}
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
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 md:p-8">

                {/* Mobile Categories Bar */}
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-hide pb-2.5 mb-3 md:hidden border-b border-white/5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'movie', label: 'Movies' },
                    { id: 'tv', label: 'TV Shows' },
                    { id: 'documentary', label: 'Docs' },
                    { id: 'kids', label: 'Kids' }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        activeTab === id
                          ? 'bg-netflix-red text-white shadow-md shadow-netflix-red/20'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Header & View toggles */}
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider truncate">
                    {searchQuery ? `Results` : "Discover"}
                  </h2>
                  <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 flex-shrink-0">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-all ${
                        viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                    >
                      <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-all ${
                        viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                    >
                      <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {!searchQuery && searchResults.length === 0 ? (
                  <div className="w-full max-w-2xl mx-auto space-y-8 py-2">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <h3 className="text-gray-500 uppercase text-[10px] sm:text-xs font-bold tracking-widest mb-3 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Recent Searches
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {recentSearches.map((term, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSearchQuery(term);
                                performSearch(term, true);
                              }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/5 text-left group transition-all text-gray-400 hover:text-white text-xs sm:text-sm"
                            >
                              <History className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80" />
                              <span className="truncate">{term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trending Searches */}
                    <div>
                      <h3 className="text-gray-500 uppercase text-[10px] sm:text-xs font-bold tracking-widest mb-3 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-netflix-red" /> Trending Now
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {trendingSearches.map((term, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSearchQuery(term);
                              performSearch(term, true);
                            }}
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 text-[11px] sm:text-xs transition-all border border-white/5 hover:border-white/10"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6" : "space-y-4"}>
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
                                  {(item.vote_average || 0).toFixed(1)}
                                </span>
                                <span>{new Date(item.release_date || item.first_air_date || '').getFullYear() || ''}</span>
                              </div>
                            </div>
                          )}

                          {viewMode === 'list' && (
                            <div className="flex-1 py-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm sm:text-lg text-white font-bold mb-1.5 group-hover:text-netflix-red transition-colors truncate">{item.title || item.name}</h4>
                                <span className="px-2 py-0.5 bg-white/10 rounded text-[9px] sm:text-xs uppercase text-gray-400 flex-shrink-0">{item.media_type}</span>
                              </div>
                              <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-2 leading-relaxed">{item.overview}</p>
                              <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-300">
                                <span className="text-netflix-red flex items-center gap-1 bg-netflix-red/10 px-1.5 py-0.5 rounded"><Star className="w-3 h-3 fill-current" /> {(item.vote_average || 0).toFixed(1)}</span>
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