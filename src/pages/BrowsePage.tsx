import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    LayoutGrid,
    List,
    LayoutList,
    X,
    Film,
    Tv,
    Sparkles
} from 'lucide-react';
import { Movie, TVShow, Genre } from '../types';
import {
    BrowseFilters,
    DEFAULT_BROWSE_FILTERS,
    SORT_OPTIONS,
    FILTER_PRESETS,
    ViewMode,
    SortOption,
    DisplayMode,
    GENRE_ICONS
} from '../types/browse';
import {
    getMovieGenres,
    getTVGenres,
    discoverMoviesByGenre,
    discoverTVShowsByGenre,
    getPopularMovies,
    getPopularTVShows,
    getTopRatedMovies,
    getTopRatedTVShows
} from '../services/tmdb';
import BrowseFilterBar from '../components/browse/BrowseFilterBar';
import BrowseResultsGrid from '../components/browse/BrowseResultsGrid';
import BrowseResultsList from '../components/browse/BrowseResultsList';
import ActiveFilters from '../components/browse/ActiveFilters';
import FilterPresets from '../components/browse/FilterPresets';
import NoResults from '../components/browse/NoResults';
import GenreCollections from '../components/GenreCollections';

const BrowsePage = (): JSX.Element => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse filters from URL
    const getFiltersFromURL = useCallback((): BrowseFilters => {
        const genres = searchParams.get('genres')?.split(',').map(Number).filter(Boolean) || [];
        const yearMin = parseInt(searchParams.get('yearMin') || '') || DEFAULT_BROWSE_FILTERS.yearMin;
        const yearMax = parseInt(searchParams.get('yearMax') || '') || DEFAULT_BROWSE_FILTERS.yearMax;
        const minRating = parseFloat(searchParams.get('minRating') || '') || DEFAULT_BROWSE_FILTERS.minRating;
        const contentType = (searchParams.get('type') as 'movie' | 'tv' | 'all') || DEFAULT_BROWSE_FILTERS.contentType;
        const sortBy = (searchParams.get('sort') as SortOption) || DEFAULT_BROWSE_FILTERS.sortBy;
        const viewMode = (searchParams.get('view') as ViewMode) || DEFAULT_BROWSE_FILTERS.viewMode;
        const displayMode = (searchParams.get('display') as DisplayMode) || DEFAULT_BROWSE_FILTERS.displayMode;

        return { genres, yearMin, yearMax, minRating, contentType, sortBy, viewMode, displayMode };
    }, [searchParams]);

    const [filters, setFilters] = useState<BrowseFilters>(getFiltersFromURL);
    const [results, setResults] = useState<(Movie | TVShow)[]>([]);
    const [loading, setLoading] = useState(true);
    const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
    const [tvGenres, setTVGenres] = useState<Genre[]>([]);
    const [page, setPage] = useState(1);
    const [, setTotalPages] = useState(1);
    const [, setTotalResults] = useState(0);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Combined genres list
    const allGenres = useMemo(() => {
        const genreMap = new Map<number, Genre>();
        movieGenres.forEach(g => genreMap.set(g.id, g));
        tvGenres.forEach(g => genreMap.set(g.id, g));
        return Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [movieGenres, tvGenres]);

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams();

        if (filters.genres.length > 0) params.set('genres', filters.genres.join(','));
        if (filters.yearMin !== DEFAULT_BROWSE_FILTERS.yearMin) params.set('yearMin', filters.yearMin.toString());
        if (filters.yearMax !== DEFAULT_BROWSE_FILTERS.yearMax) params.set('yearMax', filters.yearMax.toString());
        if (filters.minRating > 0) params.set('minRating', filters.minRating.toString());
        if (filters.contentType !== 'all') params.set('type', filters.contentType);
        if (filters.sortBy !== DEFAULT_BROWSE_FILTERS.sortBy) params.set('sort', filters.sortBy);
        if (filters.viewMode !== DEFAULT_BROWSE_FILTERS.viewMode) params.set('view', filters.viewMode);
        if (filters.displayMode !== DEFAULT_BROWSE_FILTERS.displayMode) params.set('display', filters.displayMode);

        setSearchParams(params, { replace: true });
    }, [filters, setSearchParams]);

    // Fetch genres on mount
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const [movieGenresList, tvGenresList] = await Promise.all([
                    getMovieGenres(),
                    getTVGenres()
                ]);
                setMovieGenres(movieGenresList);
                setTVGenres(tvGenresList);
            } catch (error) {
                console.error('Error fetching genres:', error);
            }
        };
        fetchGenres();
    }, []);

    // Fetch content based on filters
    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                let movieResults: Movie[] = [];
                let tvResults: TVShow[] = [];

                const shouldFetchMovies = filters.contentType === 'all' || filters.contentType === 'movie';
                const shouldFetchTV = filters.contentType === 'all' || filters.contentType === 'tv';

                // Build discover params
                const currentYear = new Date().getFullYear();
                const yearFilterApplied = filters.yearMin !== 1920 || filters.yearMax !== currentYear;

                if (filters.genres.length > 0) {
                    // Fetch by genre
                    if (shouldFetchMovies) {
                        const moviePromises = filters.genres.map(genreId =>
                            discoverMoviesByGenre(genreId, page)
                        );
                        const movieResponses = await Promise.all(moviePromises);
                        movieResults = movieResponses.flatMap(r => r.results);
                    }

                    if (shouldFetchTV) {
                        const tvPromises = filters.genres.map(genreId =>
                            discoverTVShowsByGenre(genreId, page)
                        );
                        const tvResponses = await Promise.all(tvPromises);
                        tvResults = tvResponses.flatMap(r => r.results);
                    }
                } else {
                    // Fetch popular/top-rated based on sort
                    if (shouldFetchMovies) {
                        const response = filters.sortBy === 'vote_average.desc'
                            ? await getTopRatedMovies(page)
                            : await getPopularMovies(page);
                        movieResults = response.results;
                        setTotalPages(response.total_pages);
                        setTotalResults(response.total_results);
                    }

                    if (shouldFetchTV) {
                        const response = filters.sortBy === 'vote_average.desc'
                            ? await getTopRatedTVShows(page)
                            : await getPopularTVShows(page);
                        tvResults = response.results;
                        if (!shouldFetchMovies) {
                            setTotalPages(response.total_pages);
                            setTotalResults(response.total_results);
                        }
                    }
                }

                // Combine and deduplicate results
                let combined: (Movie | TVShow)[] = [...movieResults, ...tvResults];

                // Remove duplicates by ID
                const seen = new Set<number>();
                combined = combined.filter(item => {
                    if (seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });

                // Apply client-side filters
                if (yearFilterApplied) {
                    combined = combined.filter(item => {
                        const dateStr = 'release_date' in item ? item.release_date : item.first_air_date;
                        if (!dateStr) return false;
                        const year = new Date(dateStr).getFullYear();
                        return year >= filters.yearMin && year <= filters.yearMax;
                    });
                }

                if (filters.minRating > 0) {
                    combined = combined.filter(item => item.vote_average >= filters.minRating);
                }

                // Sort results
                combined.sort((a, b) => {
                    switch (filters.sortBy) {
                        case 'vote_average.desc':
                            return b.vote_average - a.vote_average;
                        case 'vote_count.desc':
                            return b.vote_count - a.vote_count;
                        case 'primary_release_date.desc': {
                            const dateA = 'release_date' in a ? a.release_date : a.first_air_date;
                            const dateB = 'release_date' in b ? b.release_date : b.first_air_date;
                            return new Date(dateB || '').getTime() - new Date(dateA || '').getTime();
                        }
                        case 'title.asc': {
                            const titleA = 'title' in a ? a.title : a.name;
                            const titleB = 'title' in b ? b.title : b.name;
                            return titleA.localeCompare(titleB);
                        }
                        default: // popularity.desc
                            return (b.vote_count * b.vote_average) - (a.vote_count * a.vote_average);
                    }
                });

                setResults(combined);
            } catch (error) {
                console.error('Error fetching content:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [filters, page]);

    const updateFilters = useCallback((updates: Partial<BrowseFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        setPage(1); // Reset to first page on filter change
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_BROWSE_FILTERS);
        setPage(1);
    }, []);

    const applyPreset = useCallback((presetId: string) => {
        const preset = FILTER_PRESETS.find(p => p.id === presetId);
        if (preset) {
            setFilters(prev => ({
                ...DEFAULT_BROWSE_FILTERS,
                ...preset.filters,
                viewMode: prev.viewMode // Keep current view mode
            }));
            setPage(1);
        }
    }, []);

    const hasActiveFilters = useMemo(() => {
        return (
            filters.genres.length > 0 ||
            filters.yearMin !== DEFAULT_BROWSE_FILTERS.yearMin ||
            filters.yearMax !== DEFAULT_BROWSE_FILTERS.yearMax ||
            filters.minRating > 0 ||
            filters.contentType !== 'all'
        );
    }, [filters]);

    // View mode icons
    const viewModeOptions: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'grid', icon: <LayoutGrid className="w-4 h-4" />, label: 'Grid View' },
        { mode: 'list', icon: <List className="w-4 h-4" />, label: 'List View' },
        { mode: 'compact', icon: <LayoutList className="w-4 h-4" />, label: 'Compact View' },
    ];

    // Display mode icons
    const displayModeOptions: { mode: DisplayMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'carousels', icon: <LayoutList className="w-4 h-4" />, label: 'Genre Carousels' },
        { mode: 'grid', icon: <LayoutGrid className="w-4 h-4" />, label: 'Grid View' },
    ];

    return (
        <div className="min-h-screen bg-[#0A0A1F]">
            {/* Page Header with inline Filter Bar */}
            <div className="pt-24 pb-6 px-4 md:px-6 lg:px-12">
                {/* Title + Filters on same line */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-2">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                        Browse
                    </h1>
                    <BrowseFilterBar
                        filters={filters}
                        genres={allGenres}
                        genreIcons={GENRE_ICONS}
                        sortOptions={SORT_OPTIONS}
                        viewModeOptions={viewModeOptions}
                        displayModeOptions={displayModeOptions}
                        onUpdateFilters={updateFilters}
                        onToggleMobileFilters={() => setShowMobileFilters(!showMobileFilters)}
                        inline={true}
                    />
                </div>
                <p className="text-gray-400 text-sm md:text-base">
                    Discover your next favorite movie or TV show
                </p>
            </div>

            {/* Filter Presets */}
            <div className="px-4 md:px-6 lg:px-12 mb-6">
                <FilterPresets
                    presets={FILTER_PRESETS}
                    onApply={applyPreset}
                />
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
                <div className="px-4 md:px-6 lg:px-12 py-4">
                    <ActiveFilters
                        filters={filters}
                        genres={allGenres}
                        onRemoveGenre={(genreId) => updateFilters({
                            genres: filters.genres.filter(id => id !== genreId)
                        })}
                        onResetYears={() => updateFilters({
                            yearMin: DEFAULT_BROWSE_FILTERS.yearMin,
                            yearMax: DEFAULT_BROWSE_FILTERS.yearMax
                        })}
                        onResetRating={() => updateFilters({ minRating: 0 })}
                        onResetContentType={() => updateFilters({ contentType: 'all' })}
                        onClearAll={clearFilters}
                    />
                </div>
            )}

            {/* Results Header */}
            <div className="px-4 md:px-6 lg:px-12 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        {loading ? (
                            <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
                        ) : (
                            <>
                                <span className="text-white font-medium">{results.length}</span>
                                <span>results found</span>
                            </>
                        )}
                    </div>

                    {/* Content Type Quick Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => updateFilters({ contentType: 'all' })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filters.contentType === 'all'
                                ? 'bg-netflix-red text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            All
                        </button>
                        <button
                            onClick={() => updateFilters({ contentType: 'movie' })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filters.contentType === 'movie'
                                ? 'bg-netflix-red text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Film className="w-3.5 h-3.5" />
                            Movies
                        </button>
                        <button
                            onClick={() => updateFilters({ contentType: 'tv' })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filters.contentType === 'tv'
                                ? 'bg-netflix-red text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Tv className="w-3.5 h-3.5" />
                            TV Shows
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Content */}
            <div className="px-4 md:px-6 lg:px-12 pb-20">
                {filters.displayMode === 'carousels' ? (
                    /* Genre Carousels Mode */
                    <GenreCollections
                        selectedGenres={filters.genres}
                        contentType={filters.contentType}
                    />
                ) : (
                    /* Grid/List Mode */
                    loading ? (
                        <BrowseResultsGrid results={[]} loading={true} viewMode={filters.viewMode} />
                    ) : results.length === 0 ? (
                        <NoResults
                            hasFilters={hasActiveFilters}
                            onClearFilters={clearFilters}
                        />
                    ) : filters.viewMode === 'list' ? (
                        <BrowseResultsList results={results} />
                    ) : (
                        <BrowseResultsGrid
                            results={results}
                            loading={false}
                            viewMode={filters.viewMode}
                        />
                    )
                )}
            </div>

            {/* Mobile Filter Overlay */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowMobileFilters(false)}
                    />
                    <div className="absolute inset-x-0 bottom-0 max-h-[80vh] bg-[#1a1a1a] rounded-t-3xl overflow-hidden animate-slide-in-up">
                        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a1a]">
                            <h3 className="text-lg font-semibold text-white">Filters</h3>
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {/* Mobile filter content - simplified version */}
                            <div className="space-y-6">
                                {/* Genres */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 mb-3">Genres</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {allGenres.map(genre => (
                                            <button
                                                key={genre.id}
                                                onClick={() => {
                                                    const newGenres = filters.genres.includes(genre.id)
                                                        ? filters.genres.filter(id => id !== genre.id)
                                                        : [...filters.genres, genre.id];
                                                    updateFilters({ genres: newGenres });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filters.genres.includes(genre.id)
                                                    ? 'bg-netflix-red text-white'
                                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                    }`}
                                            >
                                                {GENRE_ICONS[genre.id] || '🎬'} {genre.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Rating */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                                        Minimum Rating: {filters.minRating > 0 ? filters.minRating.toFixed(1) : 'Any'}
                                    </h4>
                                    <input
                                        type="range"
                                        min="0"
                                        max="9"
                                        step="0.5"
                                        value={filters.minRating}
                                        onChange={(e) => updateFilters({ minRating: parseFloat(e.target.value) })}
                                        className="w-full accent-netflix-red"
                                    />
                                </div>

                                {/* Year Range */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                                        Year: {filters.yearMin} - {filters.yearMax}
                                    </h4>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            min="1920"
                                            max={filters.yearMax}
                                            value={filters.yearMin}
                                            onChange={(e) => updateFilters({ yearMin: parseInt(e.target.value) || 1920 })}
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                        <input
                                            type="number"
                                            min={filters.yearMin}
                                            max={new Date().getFullYear()}
                                            value={filters.yearMax}
                                            onChange={(e) => updateFilters({ yearMax: parseInt(e.target.value) || new Date().getFullYear() })}
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="sticky bottom-0 p-4 border-t border-white/10 bg-[#1a1a1a] flex gap-3">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="flex-1 py-3 rounded-lg bg-netflix-red text-white font-medium hover:bg-red-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrowsePage;
