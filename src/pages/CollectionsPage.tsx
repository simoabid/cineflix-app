import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionDetails, CollectionCategory, FranchiseFilter } from '../types';
import {
  discoverAllCollections,
  getCollectionsByCategory,
  getCollectionStats,
  clearCollectionsCache,
  getNextCollectionsBatch,
  clearPaginationCache,
  getCachedCollections
} from '../services/tmdb';
import CollectionsService from '../services/collectionsService';
import FranchiseCard from '../components/FranchiseCard';
import CollectionsHero from '../components/CollectionsHero';
import CollectionsFilter from '../components/CollectionsFilter';
import CollectionsLoading from '../components/CollectionsLoading';
import { Search, Grid, List, Zap, Crown, Clock, Star, Gamepad2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionDetails[]>([]);
  const [allCollections, setAllCollections] = useState<CollectionDetails[]>([]);
  const [featuredCollection, setFeaturedCollection] = useState<CollectionDetails | null>(null);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FranchiseFilter>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionsPerPage] = useState(20);
  const [stats, setStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryProgress, setDiscoveryProgress] = useState({
    scanned: 0,
    found: 0,
    step: 'Initializing...'
  });

  // Infinite scroll state
  const [isAllCollectionsView, setIsAllCollectionsView] = useState(false);
  const [infiniteCollections, setInfiniteCollections] = useState<CollectionDetails[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCollections, setHasMoreCollections] = useState(true);
  const [heroRotationInterval, setHeroRotationInterval] = useState<number | null>(null);
  const [isHeroRotating, setIsHeroRotating] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (heroRotationInterval) {
        clearInterval(heroRotationInterval);
      }
    };
  }, [heroRotationInterval]);

  const fetchCollections = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
      // Only clear cache when explicitly refreshing
      clearCollectionsCache();
    } else {
      setLoading(true);
      setInitialLoading(true);
      // Don't clear cache on initial load - use cached data if available
    }

    setError(null);
    setDiscoveryProgress({ scanned: 0, found: 0, step: forceRefresh ? 'Starting fresh discovery...' : 'Loading collections...' });

    try {
      console.log(`🚀 ${forceRefresh ? 'Refreshing' : 'Loading'} collections from TMDB...`);

      // Progress callback to update UI in real-time
      const progressCallback = (progress: { scanned: number; found: number; step: string }) => {
        setDiscoveryProgress(progress);
      };

      // Use cached data on initial load, force refresh only when requested
      const discoveredCollections = await discoverAllCollections(200, forceRefresh, progressCallback);

      if (discoveredCollections.length === 0) {
        throw new Error('No collections discovered from TMDB. Please check your internet connection and try again.');
      }

      setDiscoveryProgress({
        scanned: discoveredCollections.length,
        found: discoveredCollections.length,
        step: 'Processing collections...'
      });

      // Enhance with user progress
      const enhancedCollections = CollectionsService.enhanceCollectionsWithProgress(discoveredCollections);

      setAllCollections(enhancedCollections);
      setCollections(enhancedCollections);

      // Set random featured collection on initial load
      setRandomFeaturedCollection(enhancedCollections);

      // Start hero rotation interval
      startHeroRotation(enhancedCollections);

      setDiscoveryProgress({
        scanned: enhancedCollections.length,
        found: enhancedCollections.length,
        step: 'Organizing categories...'
      });

      // Organize into dynamic categories
      await organizeDynamicCategories(enhancedCollections);

      // Fetch collection statistics (non-blocking)
      try {
        const collectionStats = await getCollectionStats();
        setStats(collectionStats);
      } catch (statsError) {
        console.warn('Failed to load stats:', statsError);
      }

      setDiscoveryProgress({
        scanned: enhancedCollections.length,
        found: enhancedCollections.length,
        step: `✅ Complete! Found ${enhancedCollections.length} collections`
      });

      console.log(`🎉 Successfully discovered and loaded ${enhancedCollections.length} collections from TMDB!`);

    } catch (error: any) {
      console.error('❌ Error in comprehensive collection discovery:', error);
      const errorMessage = error?.message || 'Failed to discover collections from TMDB. Please try again.';
      setError(errorMessage);

      setDiscoveryProgress({
        scanned: 0,
        found: 0,
        step: `❌ Error: ${errorMessage}`
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  const organizeDynamicCategories = async (collections: CollectionDetails[]) => {
    const continueWatching = CollectionsService.getContinueWatching(collections);
    const recommended = CollectionsService.getRecommendedCollections(collections);

    // Use the new category-based fetching for better organization
    const categoryPromises = [
      { id: 'popular', name: 'Popular Franchises', key: 'popular' },
      { id: 'complete', name: 'Complete Series', key: 'complete' },
      { id: 'trilogies', name: 'Trilogies', key: 'trilogies' },
      { id: 'extended', name: 'Extended Universes', key: 'extended' },
      { id: 'superhero', name: 'Superhero Universes', key: 'superhero' },
      { id: 'action', name: 'Action Franchises', key: 'action' }
    ].map(async (cat) => {
      const categoryCollections = await getCollectionsByCategory(cat.key);
      return {
        id: cat.id,
        name: cat.name,
        description: getCategoryDescription(cat.id),
        collections: categoryCollections,
        icon: getCategoryIcon(cat.id)
      };
    });

    const dynamicCategories = await Promise.all(categoryPromises);

    // Add special categories that use local data
    const specialCategories: CollectionCategory[] = [
      {
        id: 'continue',
        name: 'Continue Watching',
        description: 'Pick up where you left off',
        collections: continueWatching,
        icon: 'play'
      },
      {
        id: 'recommended',
        name: 'Recommended for You',
        description: 'Based on your viewing history',
        collections: recommended,
        icon: 'star'
      },
      {
        id: 'recent',
        name: 'Recently Updated',
        description: 'Franchises with new releases',
        collections: collections.filter(c => {
          const latestYear = Math.max(...c.parts.map(film =>
            new Date(film.release_date || '').getFullYear()
          ));
          return latestYear >= new Date().getFullYear() - 2;
        }).slice(0, 10),
        icon: 'clock'
      },
      {
        id: 'scifi',
        name: 'Sci-Fi Universes',
        description: 'Space operas and futuristic franchises',
        collections: collections.filter(c =>
          c.genre_categories.includes('Science Fiction') ||
          ['Star Wars', 'Star Trek', 'Matrix', 'Alien', 'Terminator'].some(keyword =>
            c.name.includes(keyword)
          )
        ).slice(0, 8),
        icon: 'rocket'
      },
      {
        id: 'fantasy',
        name: 'Fantasy Epics',
        description: 'Magical worlds and adventures',
        collections: collections.filter(c =>
          c.genre_categories.includes('Fantasy') ||
          ['Lord of the Rings', 'Harry Potter', 'Chronicles', 'Hobbit'].some(keyword =>
            c.name.includes(keyword)
          )
        ).slice(0, 8),
        icon: 'wand'
      }
    ];

    // Combine all categories and filter out empty ones
    const allCategories = [...specialCategories, ...dynamicCategories]
      .filter(category => category.collections.length > 0);

    setCategories(allCategories);
  };

  const getCategoryDescription = (categoryId: string): string => {
    const descriptions: { [key: string]: string } = {
      popular: 'Most-watched series on the platform',
      complete: 'Full franchises ready to binge',
      trilogies: 'Perfect three-film series',
      extended: 'Epic multi-film sagas',
      superhero: 'Marvel, DC and more hero franchises',
      action: 'High-octane movie series'
    };
    return descriptions[categoryId] || 'Great movie collections';
  };

  const getCategoryIcon = (categoryId: string): string => {
    const icons: { [key: string]: string } = {
      popular: 'crown',
      complete: 'check',
      trilogies: 'three',
      extended: 'infinity',
      superhero: 'zap',
      action: 'bomb'
    };
    return icons[categoryId] || 'film';
  };

  // Debounced search for better performance
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Infinite scroll detection
  useEffect(() => {
    if (!isAllCollectionsView) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.offsetHeight;

      // Load more when user is 800px from bottom (more aggressive)
      if (scrollTop + windowHeight >= documentHeight - 800) {
        if (!isLoadingMore && hasMoreCollections) {
          loadMoreCollections();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAllCollectionsView, isLoadingMore, hasMoreCollections]);

  // Load more collections for infinite scroll
  const loadMoreCollections = async () => {
    if (isLoadingMore || !hasMoreCollections) return;

    setIsLoadingMore(true);

    try {
      console.log('📄 Loading more collections...');
      const { collections: newCollections, hasMore } = await getNextCollectionsBatch(20);

      if (newCollections.length > 0) {
        // Enhance with user progress
        const enhancedCollections = CollectionsService.enhanceCollectionsWithProgress(newCollections);
        setInfiniteCollections(prev => [...prev, ...enhancedCollections]);
        console.log(`✅ Loaded ${newCollections.length} more collections`);
      }

      // Always assume there are more collections unless we've had multiple failed attempts
      if (newCollections.length === 0) {
        // If no collections loaded, still keep hasMore true for retry
        console.log('⚠️ No new collections in this batch, but keeping infinite scroll active');
      }
      setHasMoreCollections(hasMore);

    } catch (error) {
      console.error('❌ Error loading more collections:', error);
      // Don't disable infinite scroll on error - let user try again
      console.log('🔄 Keeping infinite scroll active despite error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Initialize All Collections view
  const initializeAllCollectionsView = async () => {
    setIsAllCollectionsView(true);
    setLoading(true);
    setError(null);

    try {
      // Check if we have cached collections
      const cachedCollections = getCachedCollections();

      if (cachedCollections.length > 0) {
        console.log(`📦 Using ${cachedCollections.length} cached collections`);
        const enhancedCollections = CollectionsService.enhanceCollectionsWithProgress(cachedCollections);
        setInfiniteCollections(enhancedCollections);
      } else {
        // Load initial batch
        console.log('🚀 Loading initial collections batch...');
        const { collections: initialCollections, hasMore } = await getNextCollectionsBatch(20);

        if (initialCollections.length > 0) {
          const enhancedCollections = CollectionsService.enhanceCollectionsWithProgress(initialCollections);
          setInfiniteCollections(enhancedCollections);
          setHasMoreCollections(hasMore);
        } else {
          setError('No collections found. Please try refreshing.');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing All Collections view:', error);
      setError('Failed to load collections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Exit All Collections view
  const exitAllCollectionsView = () => {
    setIsAllCollectionsView(false);
    setInfiniteCollections([]);
    setCurrentPage(1);
    // Return to categorized view with existing collections
  };

  const performSearch = async (query: string) => {
    if (query.trim()) {
      setIsSearching(true);
      try {
        console.log(`🔍 Searching for: "${query}"`);

        // Use local search first (faster and doesn't hit API)
        const localResults = allCollections.filter(collection => {
          const searchableText = [
            collection.name,
            collection.overview,
            ...collection.genre_categories,
            collection.type,
            collection.status,
            ...collection.parts.map(movie => movie.title)
          ].join(' ').toLowerCase();

          const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
          return searchTerms.some(term => searchableText.includes(term));
        });

        // Apply active filters to search results
        let filteredResults = localResults;

        if (activeFilter.length === 'trilogy') {
          filteredResults = filteredResults.filter(c => c.film_count === 3);
        } else if (activeFilter.length === 'extended') {
          filteredResults = filteredResults.filter(c => c.film_count >= 5);
        }

        if (activeFilter.genre && activeFilter.genre.length > 0) {
          filteredResults = filteredResults.filter(c =>
            activeFilter.genre!.some(genre => c.genre_categories.includes(genre))
          );
        }

        if (activeFilter.status && activeFilter.status.length > 0) {
          filteredResults = filteredResults.filter(c => activeFilter.status!.includes(c.status));
        }

        if (activeFilter.type && activeFilter.type.length > 0) {
          filteredResults = filteredResults.filter(c => activeFilter.type!.includes(c.type));
        }

        // Sort results by relevance
        const scoredResults = filteredResults.map(collection => {
          let score = 0;
          const lowerQuery = query.toLowerCase();
          const lowerName = collection.name.toLowerCase();

          // Exact name match gets highest score
          if (lowerName === lowerQuery) score += 100;
          // Name starts with query gets high score  
          else if (lowerName.startsWith(lowerQuery)) score += 50;
          // Name contains query gets medium score
          else if (lowerName.includes(lowerQuery)) score += 25;

          // Boost popular collections
          score += Math.min(collection.film_count * 2, 20);

          return { collection, score };
        }).sort((a, b) => b.score - a.score);

        const finalResults = scoredResults.map(item => item.collection);

        console.log(`✅ Found ${finalResults.length} matching collections`);
        setCollections(finalResults);

        // Show search results feedback with suggestions
        if (finalResults.length === 0 && query.length > 2) {
          console.log(`💡 Try searching for: Marvel, Batman, Harry Potter, Star Wars, Disney, Pixar, Horror, Animation`);
        }

      } catch (error) {
        console.error('Search error:', error);
        setCollections([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Reset to all collections when search is cleared
      setCollections(allCollections);
      setIsSearching(false);
    }
  };

  // Enhanced search with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const newTimeout = window.setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms delay

    setSearchTimeout(newTimeout);
  };

  const filteredCollections = collections.filter(collection => {
    // Category filter (applied after search)
    if (selectedCategory !== 'all') {
      const category = categories.find(c => c.id === selectedCategory);
      if (category && !category.collections.some(c => c.id === collection.id)) {
        return false;
      }
    }

    // Active filters
    if (activeFilter.type && activeFilter.type.length > 0) {
      if (!activeFilter.type.includes(collection.type)) return false;
    }

    if (activeFilter.status && activeFilter.status.length > 0) {
      if (!activeFilter.status.includes(collection.status)) return false;
    }

    if (activeFilter.genre && activeFilter.genre.length > 0) {
      if (!activeFilter.genre.some(genre => collection.genre_categories.includes(genre))) {
        return false;
      }
    }

    if (activeFilter.completion) {
      const progress = collection.completion_progress || 0;
      switch (activeFilter.completion) {
        case 'completed':
          if (progress !== 100) return false;
          break;
        case 'in_progress':
          if (progress === 0 || progress === 100) return false;
          break;
        case 'not_started':
          if (progress > 0) return false;
          break;
      }
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCollections.length / collectionsPerPage);
  const startIndex = (currentPage - 1) * collectionsPerPage;
  const endIndex = startIndex + collectionsPerPage;
  const paginatedCollections = filteredCollections.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollectionClick = (collection: CollectionDetails) => {
    // Navigate to collection detail page
    navigate(`/collection/${collection.id}`);
  };

  // Helper function to select a random featured collection
  const setRandomFeaturedCollection = (collections: CollectionDetails[]) => {
    if (collections.length === 0) return;

    // Prioritize popular franchises for better selection
    const popularCollections = collections.filter(c =>
      ['Marvel', 'Star Wars', 'Harry Potter', 'Lord of the Rings', 'Avengers', 'Spider-Man', 'Fast', 'Furious', 'Transformers', 'Pirates', 'Jurassic', 'Mission', 'John Wick', 'Batman', 'Superman', 'X-Men', 'Terminator', 'Alien', 'Predator', 'Indiana Jones'].some(keyword =>
        c.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // If we have popular collections, use them with higher probability
    const candidateCollections = popularCollections.length >= 5 ? popularCollections : collections;

    // Select random collection, but avoid selecting the same one if possible
    let randomCollection;
    if (candidateCollections.length > 1 && featuredCollection) {
      const filteredCandidates = candidateCollections.filter(c => c.id !== featuredCollection.id);
      randomCollection = filteredCandidates[Math.floor(Math.random() * filteredCandidates.length)];
    } else {
      randomCollection = candidateCollections[Math.floor(Math.random() * candidateCollections.length)];
    }

    setFeaturedCollection(randomCollection);
  };

  // Start hero rotation interval
  const startHeroRotation = (collections: CollectionDetails[]) => {
    // Clear existing interval if any
    if (heroRotationInterval) {
      clearInterval(heroRotationInterval);
    }

    // Start new rotation interval (5 seconds)
    const interval = window.setInterval(() => {
      setRandomFeaturedCollection(collections);
    }, 5000);

    setHeroRotationInterval(interval);
    setIsHeroRotating(true);
  };

  // Stop hero rotation (can be called when user interacts with hero)
  const stopHeroRotation = () => {
    if (heroRotationInterval) {
      clearInterval(heroRotationInterval);
      setHeroRotationInterval(null);
      setIsHeroRotating(false);
    }
  };

  // Restart hero rotation after user interaction
  // removed unused restartHeroRotation

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'play': return <Clock className="w-5 h-5" />;
      case 'crown': return <Crown className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'star': return <Star className="w-5 h-5" />;
      case 'gamepad': return <Gamepad2 className="w-5 h-5" />;
      case 'check': return <Star className="w-5 h-5" />;
      case 'clock': return <Clock className="w-5 h-5" />;
      case 'bomb': return <Zap className="w-5 h-5" />;
      case 'rocket': return <Star className="w-5 h-5" />;
      case 'wand': return <Star className="w-5 h-5" />;
      default: return <Grid className="w-5 h-5" />;
    }
  };

  if (loading && !error) {
    return <CollectionsLoading />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      {/* Hero Section */}
      {featuredCollection && (
        <div className="relative">
          <CollectionsHero
            collection={featuredCollection}
            onStartMarathon={() => {
              stopHeroRotation();
              handleCollectionClick(featuredCollection);
            }}
            onViewCollection={() => {
              stopHeroRotation();
              handleCollectionClick(featuredCollection);
            }}
            onHeroInteraction={stopHeroRotation}
          />

          {/* Rotation Controls */}
          <div className="absolute top-6 right-6 z-10 flex items-center space-x-3">
            {/* Manual Next Button */}
            <button
              onClick={() => setRandomFeaturedCollection(allCollections)}
              className="bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors group"
              title="Next Collection"
            >
              <ChevronRight className="w-5 h-5 text-white group-hover:text-netflix-red transition-colors" />
            </button>

            {/* Rotation Indicator */}
            {isHeroRotating && (
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-2 flex items-center space-x-2">
                <div className="w-2 h-2 bg-netflix-red rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">Auto-rotating</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center space-x-3">
              <span>Collections</span>
              {(initialLoading || isRefreshing) && (
                <div className="flex items-center space-x-2 text-red-400 text-lg">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Discovering...</span>
                </div>
              )}
            </h1>
            <div className="space-y-1">
              <p className="text-gray-400 text-lg">
                Smart collection discovery from TMDB API - Fresh data every time!
              </p>
              {discoveryProgress.step && (initialLoading || isRefreshing) && (
                <p className="text-red-400 text-sm font-medium">
                  {discoveryProgress.step}
                </p>
              )}
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="mt-4 lg:mt-0 flex items-center flex-wrap gap-4 text-sm text-gray-400">
            <div className="text-center bg-gray-800/50 rounded-lg px-4 py-2 min-w-20">
              <div className="text-2xl font-bold text-green-400">{collections.length}</div>
              <div className="text-xs">Collections</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg px-4 py-2 min-w-20">
              <div className="text-2xl font-bold text-blue-400">
                {stats ? stats.totalFilms.toLocaleString() : '0'}
              </div>
              <div className="text-xs">Total Films</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg px-4 py-2 min-w-20">
              <div className="text-2xl font-bold text-purple-400">
                {stats ? stats.averageFilmsPerCollection : '0'}
              </div>
              <div className="text-xs">Avg per Collection</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg px-4 py-2 min-w-20">
              <div className="text-2xl font-bold text-yellow-400">
                {CollectionsService.getCollectionStats().completedCollections}
              </div>
              <div className="text-xs">Completed</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Enhanced Search */}
          <div className="relative flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? 'text-red-400 animate-pulse' : 'text-gray-400'
                }`} />
              <input
                type="text"
                placeholder="Search collections, movies, characters, genres, keywords..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none transition-all"
              />
              {/* Search activity indicator */}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 netflix-spinner" />
                </div>
              )}
              {/* Clear button */}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search suggestions */}
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 z-10">
                <p className="text-sm text-gray-400 mb-2">💡 Try searching for:</p>
                <div className="flex flex-wrap gap-2">
                  {['Marvel', 'Batman', 'Star Wars', 'Disney', 'Horror', 'Animation'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearch(suggestion)}
                      className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comprehensive Discovery Button */}
          <button
            onClick={() => fetchCollections(true)}
            disabled={isRefreshing || initialLoading}
            className={`px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 border border-red-500 rounded-lg text-white hover:from-red-700 hover:to-red-800 transition-all flex items-center space-x-2 ${isRefreshing || initialLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-lg hover:shadow-red-500/25'
              }`}
            title="Clear cache and discover fresh collections from TMDB"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block font-medium">
              {isRefreshing ? 'Discovering...' : '🔍 Fresh Discovery'}
            </span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Button */}
          <CollectionsFilter
            onFilterChange={setActiveFilter}
            collections={collections}
          />
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => {
              setSelectedCategory('all');
              exitAllCollectionsView();
            }}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === 'all' && !isAllCollectionsView
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            All Categories
          </button>
          <button
            onClick={initializeAllCollectionsView}
            className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center space-x-2 ${isAllCollectionsView
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            <span>🔄</span>
            <span>All Collections</span>
            {infiniteCollections.length > 0 && (
              <span className="bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                {infiniteCollections.length}
              </span>
            )}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center space-x-2 ${selectedCategory === category.id
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              {category.icon && renderCategoryIcon(category.icon)}
              <span>{category.name}</span>
              <span className="bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                {category.collections.length}
              </span>
            </button>
          ))}
        </div>

        {/* Collections Grid/List */}
        {isAllCollectionsView ? (
          // Infinite scroll view - All Collections
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold">🔄 All Collections</h2>
                <span className="text-gray-400">
                  ({infiniteCollections.length} collections loaded)
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  Scroll down to load more
                </div>
                <button
                  onClick={async () => {
                    clearPaginationCache();
                    setInfiniteCollections([]);
                    setHasMoreCollections(true);
                    await initializeAllCollectionsView();
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                >
                  🔄 Fresh Collections
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {infiniteCollections.map((collection) => (
                <FranchiseCard
                  key={collection.id}
                  collection={collection}
                  onClick={handleCollectionClick}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 netflix-spinner-thick" />
                  </div>
                  <span className="text-gray-400 loading-text">Loading more collections...</span>
                </div>
              </div>
            )}

            {/* Keep scrolling hint */}
            {!isLoadingMore && infiniteCollections.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">🎬 Keep scrolling to discover more collections!</p>
                <p className="text-sm text-gray-500 mt-2">
                  {infiniteCollections.length} collections loaded • Powered by TMDB's vast database
                </p>
                <button
                  onClick={loadMoreCollections}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Load More Collections
                </button>
              </div>
            )}
          </div>
        ) : selectedCategory === 'all' ? (
          // Show all categories
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {category.icon && renderCategoryIcon(category.icon)}
                    <div>
                      <h2 className="text-2xl font-bold">{category.name}</h2>
                      <p className="text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.collections.slice(0, 4).map((collection) => (
                    <FranchiseCard
                      key={collection.id}
                      collection={collection}
                      onClick={handleCollectionClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Collections Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold">
                  {searchQuery ? `Search Results` : selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name : 'All Collections'}
                </h2>
                <span className="text-gray-400">
                  ({filteredCollections.length} collections)
                </span>
              </div>

              {/* Advanced Stats */}
              {stats && (
                <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-400">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.totalCollections}</div>
                    <div>Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.totalFilms}</div>
                    <div>Films</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.averageFilmsPerCollection}</div>
                    <div>Avg/Collection</div>
                  </div>
                </div>
              )}
            </div>

            {/* Show paginated collections */}
            <div className={`${viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }`}>
              {paginatedCollections.map((collection) => (
                <FranchiseCard
                  key={collection.id}
                  collection={collection}
                  onClick={handleCollectionClick}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-12">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${currentPage === 1
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-2">
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${currentPage === pageNum
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${currentPage === totalPages
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {filteredCollections.length === 0 && !loading && !initialLoading && (
          <div className="text-center py-16">
            <div className="text-gray-500 text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No collections found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? `No collections match "${searchQuery}". Try a different search term or clear filters.`
                : 'Try adjusting your filters to find the perfect franchise to binge.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter({});
                  setSelectedCategory('all');
                  setCurrentPage(1);
                  setCollections(allCollections);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => fetchCollections(true)}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Collections</span>
              </button>
            </div>

            {/* Additional help text */}
            <div className="mt-8 text-sm text-gray-400">
              <p>💡 <strong>Tip:</strong> We discover collections dynamically from TMDB.</p>
              <p>Try refreshing to get the latest collections or search for specific franchises.</p>
            </div>
          </div>
        )}

        {/* Enhanced Loading State with Progress */}
        {initialLoading && !error && (
          <div className="text-center py-16 max-w-2xl mx-auto">
            <div className="relative mb-8 flex justify-center">
              <div className="relative">
                <div className="h-20 w-20 netflix-spinner-thick" />
                <div className="h-20 w-20 netflix-ripple" />
                <div className="h-20 w-20 netflix-ripple" style={{ animationDelay: '0.5s' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-netflix-red font-bold text-lg z-10">{discoveryProgress.found}</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">🚀 Lightning-Fast Discovery</h3>
            <p className="text-red-400 font-medium mb-4 text-lg">
              {discoveryProgress.step}
            </p>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-center">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{discoveryProgress.scanned.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Movies Scanned</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{discoveryProgress.found.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Collections Found</div>
              </div>
            </div>

            {/* Discovery Info */}
            <div className="bg-gray-800/30 rounded-lg p-6 text-left">
              <h4 className="text-lg font-semibold text-white mb-3">🚀 Lightning-Fast Discovery:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>⚡ Quick scan of popular and trending movies</li>
                <li>🔍 Instant search for top franchises (Marvel, Star Wars, etc.)</li>
                <li>🎭 Smart sampling of key genres (Action, Animation, etc.)</li>
                <li>💨 Optimized for speed - reduced delays and API calls</li>
              </ul>
              <div className="mt-4 text-xs text-gray-400 bg-gray-900/50 rounded p-3">
                <strong>Performance:</strong> Super-fast discovery completes in 10-20 seconds! Uses cached data when available, reduced API calls, and intelligent fallbacks for the best user experience.
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Something went wrong</h3>
            <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => fetchCollections(true)}
                disabled={isRefreshing}
                className={`px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Retrying...' : 'Try Again'}</span>
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Error
              </button>
            </div>

            {/* Troubleshooting tips */}
            <div className="mt-8 text-sm text-gray-400 max-w-lg mx-auto">
              <p className="mb-2"><strong>Troubleshooting:</strong></p>
              <ul className="text-left space-y-1">
                <li>• Check your internet connection</li>
                <li>• TMDB API might be temporarily unavailable</li>
                <li>• Try refreshing the page</li>
                <li>• Clear your browser cache if the issue persists</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsPage;
