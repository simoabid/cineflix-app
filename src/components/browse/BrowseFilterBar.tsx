import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Calendar, SlidersHorizontal, Check } from 'lucide-react';
import { Genre } from '../../types';
import { BrowseFilters, SortOption, ViewMode, DisplayMode } from '../../types/browse';

interface BrowseFilterBarProps {
    filters: BrowseFilters;
    genres: Genre[];
    genreIcons: Record<number, string>;
    sortOptions: { value: SortOption; label: string }[];
    viewModeOptions: { mode: ViewMode; icon: React.ReactNode; label: string }[];
    displayModeOptions: { mode: DisplayMode; icon: React.ReactNode; label: string }[];
    onUpdateFilters: (updates: Partial<BrowseFilters>) => void;
    onToggleMobileFilters: () => void;
    inline?: boolean;
}

const BrowseFilterBar: React.FC<BrowseFilterBarProps> = ({
    filters,
    genres,
    genreIcons,
    sortOptions,
    viewModeOptions,
    displayModeOptions,
    onUpdateFilters,
    onToggleMobileFilters,
    inline = false,
}) => {
    const [showGenreDropdown, setShowGenreDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const genreDropdownRef = useRef<HTMLDivElement>(null);
    const yearDropdownRef = useRef<HTMLDivElement>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
                setShowGenreDropdown(false);
            }
            if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
                setShowYearDropdown(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleGenre = (genreId: number) => {
        const newGenres = filters.genres.includes(genreId)
            ? filters.genres.filter(id => id !== genreId)
            : [...filters.genres, genreId];
        onUpdateFilters({ genres: newGenres });
    };

    const currentSortLabel = sortOptions.find(s => s.value === filters.sortBy)?.label || 'Sort';

    return (
        <div className={inline ? '' : 'sticky top-16 z-30 bg-[#0a0a0a]/95 border-b border-white/5'}>
            <div className={inline ? '' : 'max-w-7xl mx-auto px-4 md:px-8 lg:px-16'}>
                <div className={`flex items-center gap-4 ${inline ? '' : 'justify-between py-4'}`}>
                    {/* Desktop Filters */}
                    <div className="hidden md:flex items-center gap-3 flex-wrap">
                        {/* Genre Dropdown */}
                        <div className="relative" ref={genreDropdownRef}>
                            <button
                                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filters.genres.length > 0
                                    ? 'bg-netflix-red/20 text-netflix-red border border-netflix-red/30'
                                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <span>Genres</span>
                                {filters.genres.length > 0 && (
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-netflix-red text-white text-xs">
                                        {filters.genres.length}
                                    </span>
                                )}
                                <ChevronDown className={`w-4 h-4 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showGenreDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-[420px] bg-[#13132B] border border-gray-700/50 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up">
                                    <div className="flex flex-wrap gap-2">
                                        {genres.map(genre => (
                                            <button
                                                key={genre.id}
                                                onClick={() => toggleGenre(genre.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${filters.genres.includes(genre.id)
                                                    ? 'bg-[#ff0000] text-white shadow-lg shadow-red-900/20 border border-[#ff0000]/50'
                                                    : 'bg-[#1F1F35] text-gray-400 border border-white/5 hover:bg-[#2A2A45] hover:text-white hover:border-white/20'
                                                    }`}
                                            >
                                                <span>{genreIcons[genre.id] || '🎬'}</span>
                                                <span>{genre.name}</span>
                                                {filters.genres.includes(genre.id) && (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {filters.genres.length > 0 && (
                                        <button
                                            onClick={() => onUpdateFilters({ genres: [] })}
                                            className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white transition-colors border-t border-white/10"
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Year Range Dropdown */}
                        <div className="relative" ref={yearDropdownRef}>
                            <button
                                onClick={() => setShowYearDropdown(!showYearDropdown)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filters.yearMin !== 1920 || filters.yearMax !== new Date().getFullYear()
                                    ? 'bg-netflix-red/20 text-netflix-red border border-netflix-red/30'
                                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>{filters.yearMin} - {filters.yearMax}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showYearDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-[#13132B] border border-gray-700/50 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">From Year</label>
                                            <input
                                                type="number"
                                                min="1920"
                                                max={filters.yearMax}
                                                value={filters.yearMin}
                                                onChange={(e) => onUpdateFilters({ yearMin: parseInt(e.target.value) || 1920 })}
                                                className="w-full bg-[#1F1F35] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">To Year</label>
                                            <input
                                                type="number"
                                                min={filters.yearMin}
                                                max={new Date().getFullYear()}
                                                value={filters.yearMax}
                                                onChange={(e) => onUpdateFilters({ yearMax: parseInt(e.target.value) || new Date().getFullYear() })}
                                                className="w-full bg-[#1F1F35] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                                            />
                                        </div>

                                        {/* Quick Presets */}
                                        <div className="pt-2 border-t border-white/5">
                                            <p className="text-xs text-gray-500 mb-2 font-medium">Quick Select</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: '2020s', min: 2020, max: 2029 },
                                                    { label: '2010s', min: 2010, max: 2019 },
                                                    { label: '2000s', min: 2000, max: 2009 },
                                                    { label: '90s', min: 1990, max: 1999 },
                                                    { label: '80s', min: 1980, max: 1989 }
                                                ].map(preset => (
                                                    <button
                                                        key={preset.label}
                                                        onClick={() => {
                                                            onUpdateFilters({
                                                                yearMin: preset.min,
                                                                yearMax: Math.min(preset.max, new Date().getFullYear())
                                                            });
                                                        }}
                                                        className="px-2 py-1 text-xs rounded-md bg-[#1F1F35] text-gray-400 hover:text-white hover:bg-[#2A2A45] border border-white/5 transition-colors"
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {(filters.yearMin !== 1920 || filters.yearMax !== new Date().getFullYear()) && (
                                            <button
                                                onClick={() => onUpdateFilters({ yearMin: 1920, yearMax: new Date().getFullYear() })}
                                                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors border-t border-white/10 mt-2"
                                            >
                                                Reset Years
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rating Filter */}
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm text-gray-300">
                                {filters.minRating > 0 ? `${filters.minRating}+` : 'Any Rating'}
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="9"
                                step="0.5"
                                value={filters.minRating}
                                onChange={(e) => onUpdateFilters({ minRating: parseFloat(e.target.value) })}
                                className="w-20 accent-netflix-red"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative" ref={sortDropdownRef}>
                            <button
                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <span>{currentSortLabel}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showSortDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-[#13132B] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onUpdateFilters({ sortBy: option.value });
                                                setShowSortDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${filters.sortBy === option.value
                                                ? 'bg-[#ff0000] text-white'
                                                : 'text-gray-300 hover:bg-[#1F1F35] hover:text-white'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Filter Button */}
                    <button
                        onClick={onToggleMobileFilters}
                        className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filters</span>
                        {(filters.genres.length > 0 || filters.minRating > 0) && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-netflix-red text-white text-xs">
                                {filters.genres.length + (filters.minRating > 0 ? 1 : 0)}
                            </span>
                        )}
                    </button>

                    {/* Display Mode Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        {displayModeOptions.map(option => (
                            <button
                                key={option.mode}
                                onClick={() => onUpdateFilters({ displayMode: option.mode })}
                                className={`p-2 rounded-lg transition-all ${filters.displayMode === option.mode
                                    ? 'bg-netflix-red text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                title={option.label}
                            >
                                {option.icon}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle */}
                    <div className={`flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 ${filters.displayMode === 'grid' ? '' : 'hidden'}`}>
                        {viewModeOptions.map(option => (
                            <button
                                key={option.mode}
                                onClick={() => onUpdateFilters({ viewMode: option.mode })}
                                className={`p-2 rounded-lg transition-all ${filters.viewMode === option.mode
                                    ? 'bg-netflix-red text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                title={option.label}
                            >
                                {option.icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrowseFilterBar;
