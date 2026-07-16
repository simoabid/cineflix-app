import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Film, Tv, Play } from 'lucide-react';
import { Movie, TVShow, Genre } from '../../types';
import {
    getMovieGenres,
    getTVGenres,
    discoverMoviesByGenre,
    discoverTVShowsByGenre,
    getBackdropUrl,
    getPosterUrl
} from '../../services/tmdb';
import SafeImage from '../SafeImage';

interface GenreLandscapeCardProps {
    readonly item: Movie | TVShow;
    readonly type: 'movie' | 'tv';
}

const GenreLandscapeCard: React.FC<GenreLandscapeCardProps> = ({ item, type }) => {
    const title = 'title' in item ? item.title : item.name;
    const dateStr = 'release_date' in item ? item.release_date : item.first_air_date;
    const year = dateStr ? new Date(dateStr).getFullYear() : '';
    const rating = item.vote_average;

    const backdropUrl = item.backdrop_path
        ? getBackdropUrl(item.backdrop_path, 'w300')
        : (item.poster_path ? getPosterUrl(item.poster_path, 'w342') : '');

    return (
        <Link
            to={`/${type}/${item.id}`}
            className="flex-shrink-0 w-64 sm:w-72 md:w-80 lg:w-[340px] group block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-buttons-purple focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl p-1 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-2xl"
        >
            {/* Card Media Container */}
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-md">
                {backdropUrl ? (
                    <SafeImage
                        src={backdropUrl}
                        alt={title}
                        title={title}
                        mediaType={type}
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <span className="text-gray-500 text-[10px] font-medium">No Image</span>
                    </div>
                )}

                {/* Ambient dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 group-hover:from-black/70 group-hover:to-black/40 transition-all duration-300" />

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/40 transition-all duration-300">
                    <div className="w-10 h-10 bg-buttons-purple text-white rounded-full flex items-center justify-center shadow-lg opacity-0 transform scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 ease-out group-hover:shadow-[0_0_16px_rgba(229,9,20,0.5)]">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                    </div>
                </div>
            </div>

            {/* Details Information */}
            <div className="mt-2.5 px-2 pb-2 flex flex-col gap-1 w-full text-left">
                {/* Title */}
                <h4 className="text-white font-bold text-xs sm:text-sm line-clamp-1 leading-tight tracking-wide group-hover:text-type-logo transition-colors duration-300">
                    {title}
                </h4>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/5 uppercase tracking-wider">
                            {type === 'movie' ? 'MOVIE' : 'TV'}
                        </span>
                        {year && <span>{year}</span>}
                    </div>

                    {rating !== undefined && rating > 0 && (
                        <div className="flex items-center gap-0.5 text-yellow-500 font-semibold">
                            <Star className="w-3 h-3 fill-current text-yellow-500" />
                            <span>{rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

const LandscapeCardSkeleton: React.FC = () => {
    return (
        <div className="flex-shrink-0 w-64 sm:w-72 md:w-80 lg:w-[340px] rounded-2xl p-1 bg-white/[0.01] border border-white/5 flex flex-col gap-3">
            <div className="aspect-[16/9] w-full rounded-xl bg-white/5 animate-pulse" />
            <div className="flex flex-col gap-2 px-2 pb-2">
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="flex justify-between items-center">
                    <div className="h-3.5 w-16 rounded bg-white/5 animate-pulse" />
                    <div className="h-3.5 w-8 rounded bg-white/5 animate-pulse" />
                </div>
            </div>
        </div>
    );
};

const BrowseByGenre: React.FC = () => {
    const [selectedType, setSelectedType] = useState<'movie' | 'tv'>('movie');
    const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
    const [tvGenres, setTVGenres] = useState<Genre[]>([]);
    const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
    const [items, setItems] = useState<(Movie | TVShow)[]>([]);
    
    const [genresLoading, setGenresLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const sectionRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Defer network until near viewport (parent LazySection may still mount us early)
    useEffect(() => {
        const node = sectionRef.current;
        if (!node) return;

        let cancelled = false;

        const startDataLoad = () => {
            if (cancelled) return;
            setIsVisible(true);
            const fetchGenres = async () => {
                try {
                    const [movieGenresList, tvGenresList] = await Promise.all([
                        getMovieGenres(),
                        getTVGenres()
                    ]);
                    if (cancelled) return;
                    setMovieGenres(movieGenresList);
                    setTVGenres(tvGenresList);
                    if (movieGenresList.length > 0) {
                        setSelectedGenreId(movieGenresList[0].id);
                    }
                } catch (error) {
                    console.error('Error fetching genres in BrowseByGenre component:', error);
                } finally {
                    if (!cancelled) setGenresLoading(false);
                }
            };
            void fetchGenres();
        };

        if (typeof IntersectionObserver === 'undefined') {
            startDataLoad();
            return () => {
                cancelled = true;
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        startDataLoad();
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0,
                rootMargin: '150px 0px 0px 0px'
            }
        );

        observer.observe(node);
        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, []);

    // Current active genres based on selected type
    const activeGenres = useMemo(() => {
        return selectedType === 'movie' ? movieGenres : tvGenres;
    }, [selectedType, movieGenres, tvGenres]);

    // Active selected genre name
    const selectedGenreName = useMemo(() => {
        const found = activeGenres.find((g: Genre) => g.id === selectedGenreId);
        return found ? found.name : '';
    }, [selectedGenreId, activeGenres]);

    // Fetch items when type or genre changes (only after section activated)
    useEffect(() => {
        if (!isVisible || selectedGenreId === null) return;

        const fetchItems = async () => {
            setItemsLoading(true);
            try {
                const response = selectedType === 'movie'
                    ? await discoverMoviesByGenre(selectedGenreId, 1)
                    : await discoverTVShowsByGenre(selectedGenreId, 1);

                setItems(response.results.slice(0, 16));
            } catch (error) {
                console.error(`Error fetching browse genre items (genreId: ${selectedGenreId}):`, error);
                setItems([]);
            } finally {
                setItemsLoading(false);
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = 0;
                }
            }
        };

        void fetchItems();
    }, [selectedType, selectedGenreId, isVisible]);

    // Monitor scroll behavior of the items container
    const updateScrollState = useCallback(() => {
        const element = scrollRef.current;
        if (!element) return;

        const { scrollLeft, scrollWidth, clientWidth } = element;
        const maxScroll = scrollWidth - clientWidth;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft < maxScroll - 5);
    }, []);

    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) {
            updateScrollState();
            scrollElement.addEventListener('scroll', updateScrollState, { passive: true });
            window.addEventListener('resize', updateScrollState);

            return () => {
                scrollElement.removeEventListener('scroll', updateScrollState);
                window.removeEventListener('resize', updateScrollState);
            };
        }
    }, [items, updateScrollState]);

    const handleScroll = (direction: 'left' | 'right') => {
        const element = scrollRef.current;
        if (!element) return;

        const scrollAmount = window.innerWidth > 768 ? 680 : 320;
        const currentScroll = element.scrollLeft;
        const newScroll = direction === 'left'
            ? currentScroll - scrollAmount
            : currentScroll + scrollAmount;

        element.scrollTo({
            left: newScroll,
            behavior: 'smooth'
        });
    };

    const handleTypeChange = (type: 'movie' | 'tv') => {
        setSelectedType(type);
        const nextGenres = type === 'movie' ? movieGenres : tvGenres;
        if (nextGenres.length > 0) {
            setSelectedGenreId(nextGenres[0].id);
        }
    };

    const handleGenreChange = (genreId: number) => {
        setSelectedGenreId(genreId);
    };

    return (
        <section
            ref={sectionRef}
            className={`py-8 border-b border-gray-800/40 relative max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 transition-all duration-1000 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
        >
            {genresLoading ? (
                <div className="animate-pulse space-y-6">
                    <div className="h-6 w-48 bg-white/5 rounded" />
                    <div className="h-10 w-64 bg-white/5 rounded-xl" />
                    <div className="flex gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-8 w-24 rounded-full bg-white/5" />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Row 1: Header title and Browse all button */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-5 bg-buttons-purple rounded-full inline-block" />
                            <h2 className="text-sm font-semibold tracking-[0.2em] text-gray-400 uppercase">
                                Browse by Genre
                            </h2>
                        </div>
                        <Link
                            to="/browse"
                            className="text-xs text-gray-300 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/20 bg-black/40 hover:bg-white/5 px-4 py-1.5 rounded-full font-semibold flex items-center gap-1 shadow-md"
                        >
                            Browse all
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* Row 2: Movies / TV Shows toggler */}
                    <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-xl w-fit mb-6 shadow-inner">
                        <button
                            onClick={() => handleTypeChange('movie')}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 ${
                                selectedType === 'movie'
                                    ? 'bg-modal-background text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/5'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                            }`}
                        >
                            <Film className="w-3.5 h-3.5" />
                            Movies
                        </button>
                        <button
                            onClick={() => handleTypeChange('tv')}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 ${
                                selectedType === 'tv'
                                    ? 'bg-modal-background text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/5'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                            }`}
                        >
                            <Tv className="w-3.5 h-3.5" />
                            TV Shows
                        </button>
                    </div>

                    {/* Row 3: Genre Selector Pills */}
                    <div className="relative mb-6">
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 px-0.5 no-scrollbar">
                            {activeGenres.map((genre: Genre) => {
                                const isActive = selectedGenreId === genre.id;
                                return (
                                    <button
                                        key={genre.id}
                                        onClick={() => handleGenreChange(genre.id)}
                                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                                            isActive
                                                ? 'border-white bg-modal-background text-white shadow-[0_4px_12px_rgba(255,255,255,0.05)] font-bold'
                                                : 'border-white/10 bg-black/20 text-gray-400 hover:text-white hover:border-white/30'
                                        }`}
                                    >
                                        {genre.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 4: Active Selected Category Header */}
                    <div className="flex items-center gap-2.5 mb-6">
                        <h3 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                            {selectedGenreName}
                        </h3>
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-[#121216] border border-white/5 text-gray-500">
                            {selectedType === 'movie' ? 'Movies' : 'TV Shows'}
                        </span>
                    </div>

                    {/* Row 5: Horizontal Carousel */}
                    <div 
                        className="relative" 
                        onMouseEnter={() => setIsHovered(true)} 
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Scroll buttons */}
                        <button
                            onClick={() => handleScroll('left')}
                            className={`absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 hidden md:flex items-center justify-center ${
                                !canScrollLeft ? 'md:opacity-0 md:pointer-events-none' : isHovered ? 'md:opacity-100' : 'md:opacity-0 md:pointer-events-none'
                            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => handleScroll('right')}
                            className={`absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-300 hidden md:flex items-center justify-center ${
                                !canScrollRight ? 'md:opacity-0 md:pointer-events-none' : isHovered ? 'md:opacity-100' : 'md:opacity-0 md:pointer-events-none'
                            } backdrop-blur-sm border border-white/20 hover:border-white/40 shadow-xl hover:scale-110`}
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Items container */}
                        <div
                            ref={scrollRef}
                            className="flex overflow-x-auto gap-5 scrollbar-hide pb-3 no-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {itemsLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <LandscapeCardSkeleton key={i} />
                                ))
                            ) : items.length === 0 ? (
                                <div className="w-full py-16 flex flex-col items-center justify-center text-gray-500 text-sm">
                                    <span>No titles found matching this genre.</span>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <GenreLandscapeCard
                                        key={item.id}
                                        item={item}
                                        type={selectedType}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
};

export default BrowseByGenre;
