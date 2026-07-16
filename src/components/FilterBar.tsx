import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Check, Star } from 'lucide-react';
import { Genre } from '../types';
import { Container } from './layout';
import { analytics } from '../services/analytics';

interface FilterBarProps {
  genres: Genre[];
  years: string[];
  searchQuery: string;
  selectedGenre: string;
  selectedYear: string;
  selectedRating: number;
  showFilters: boolean;
  onSearchChange: (query: string) => void;
  onGenreChange: (genre: string) => void;
  onYearChange: (year: string) => void;
  onRatingChange: (rating: number) => void;
  onToggleFilters: () => void;
  type?: 'movie' | 'tv';
}

/**
 * Normalize and sanitize an array of Genre objects into a stable option list.
 * Removes duplicates by name and ensures each entry has an id and name.
 *
 * Exported for unit testing.
 */
export function normalizeGenres(genres: Genre[]): Genre[] {
  if (!Array.isArray(genres)) {
    console.error('normalizeGenres expected an array of genres.');
    return [];
  }
  const seen = new Set<string>();
  const normalized: Genre[] = [];
  for (const g of genres) {
    if (!g || typeof g.name !== 'string') continue;
    const name = g.name.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    normalized.push({ id: g.id, name });
  }
  return normalized;
}

/**
 * Normalize and sanitize an array of year strings.
 * Filters out invalid numeric years and returns unique, sorted (desc) years.
 *
 * Exported for unit testing.
 */
export function normalizeYears(years: string[]): string[] {
  if (!Array.isArray(years)) {
    console.error('normalizeYears expected an array of year strings.');
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const y of years) {
    if (typeof y !== 'string') continue;
    const trimmed = y.trim();
    const num = Number(trimmed);
    if (!trimmed || Number.isNaN(num) || !Number.isFinite(num)) continue;
    const yearStr = String(Math.trunc(num));
    if (seen.has(yearStr)) continue;
    seen.add(yearStr);
    normalized.push(yearStr);
  }
  normalized.sort((a, b) => Number(b) - Number(a));
  return normalized;
}

/**
 * Validate and sanitize a rating value.
 * Ensures value is within [0, 10] and snaps to nearest 0.5 step.
 */
export function validateRating(rating: number): number {
  if (typeof rating !== 'number' || Number.isNaN(rating) || !Number.isFinite(rating)) {
    console.error('validateRating expected a finite number. Received:', rating);
    return 0;
  }
  let clamped = Math.max(0, Math.min(10, rating));
  clamped = Math.round(clamped * 2) / 2;
  return clamped;
}

/**
 * Ensure selectedGenre exists in the provided normalized genres list.
 */
export function validateSelectedGenre(selectedGenre: string, genres: Genre[]): string {
  if (!selectedGenre) return '';
  if (!Array.isArray(genres)) return '';
  const found = genres.find((g) => g.name === selectedGenre);
  if (!found) {
    console.warn('validateSelectedGenre: selected genre is not in available options:', selectedGenre);
    return '';
  }
  return selectedGenre;
}

/**
 * Ensure selectedYear exists in the provided normalized years list.
 */
export function validateSelectedYear(selectedYear: string, years: string[]): string {
  if (!selectedYear) return '';
  if (!Array.isArray(years)) return '';
  const found = years.find((y) => y === selectedYear);
  if (!found) {
    console.warn('validateSelectedYear: selected year is not in available options:', selectedYear);
    return '';
  }
  return selectedYear;
}

/**
 * Transform and validate raw filter inputs into sanitized, UI-safe values.
 */
export function transformFilterInputs(params: {
  genres?: Genre[] | null;
  years?: string[] | null;
  selectedGenre?: string | null;
  selectedYear?: string | null;
  selectedRating?: number | null;
}): {
  normalizedGenres: Genre[];
  normalizedYears: string[];
  safeSelectedGenre: string;
  safeSelectedYear: string;
  safeSelectedRating: number;
} {
  const {
    genres = [],
    years = [],
    selectedGenre = '',
    selectedYear = '',
    selectedRating = 0,
  } = params || {};

  const normalizedGenres = normalizeGenres(Array.isArray(genres) ? genres : []);
  const normalizedYears = normalizeYears(Array.isArray(years) ? years : []);

  const safeSelectedGenre =
    typeof selectedGenre === 'string' ? validateSelectedGenre(selectedGenre, normalizedGenres) : '';
  const safeSelectedYear =
    typeof selectedYear === 'string' ? validateSelectedYear(selectedYear, normalizedYears) : '';
  const safeSelectedRating =
    typeof selectedRating === 'number' ? validateRating(selectedRating) : validateRating(0);

  return {
    normalizedGenres,
    normalizedYears,
    safeSelectedGenre,
    safeSelectedYear,
    safeSelectedRating,
  };
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 w-full px-4.5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none active:scale-98 shadow-md border ${
          isOpen
            ? 'bg-red-500/10 border-buttons-purple/60 text-white shadow-buttons-purple/10'
            : value
              ? 'bg-white/5 border-buttons-purple/30 text-white'
              : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-200 hover:text-white'
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-500' : value ? 'text-red-400' : 'text-gray-400'}`} />
      </button>

      {isOpen && (
        <div data-lenis-prevent className="absolute left-0 right-0 md:left-0 md:right-auto mt-2 min-w-[200px] max-h-72 overflow-y-auto bg-[#0E0E2E] border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
            {label}
          </div>
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors ${
              !value
                ? 'bg-red-500/15 text-red-400 font-semibold'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-4 h-4 text-red-400" />}
          </div>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-red-500/15 text-red-400 font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-red-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
  genres,
  years,
  searchQuery,
  selectedGenre,
  selectedYear,
  selectedRating,
  showFilters,
  onSearchChange,
  onGenreChange,
  onYearChange,
  onRatingChange,
  onToggleFilters,
  type = 'movie',
}) => {
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchQuery);
  const timeoutRef = useRef<number | null>(null);

  const {
    normalizedGenres,
    normalizedYears,
    safeSelectedGenre,
    safeSelectedYear,
    safeSelectedRating,
  } = transformFilterInputs({
    genres,
    years,
    selectedGenre,
    selectedYear,
    selectedRating,
  });

  const handleGenreSelect = useCallback((genre: string) => {
    analytics.trackFilter('genre', genre || 'all');
    onGenreChange(genre);
  }, [onGenreChange]);

  const handleYearSelect = useCallback((year: string) => {
    analytics.trackFilter('year', year || 'all');
    onYearChange(year);
  }, [onYearChange]);

  const handleRatingSelect = useCallback((rating: number) => {
    analytics.trackFilter('rating', String(rating));
    onRatingChange(rating);
  }, [onRatingChange]);

  useEffect(() => {
    setDebouncedSearch(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDebouncedSearch(value);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      try {
        onSearchChange(value);
      } catch (err) {
        console.error('onSearchChange handler threw an error:', err);
      }
    }, 300);
  }, [onSearchChange]);

  const handleClearFilters = useCallback(() => {
    try {
      onSearchChange('');
      onGenreChange('');
      onYearChange('');
      onRatingChange(0);
      setDebouncedSearch('');
    } catch (err) {
      console.error('Error while clearing filters:', err);
    }
  }, [onSearchChange, onGenreChange, onYearChange, onRatingChange]);

  const hasActiveFilters = Boolean(searchQuery) || Boolean(selectedGenre) || Boolean(selectedYear) || safeSelectedRating > 0;

  return (
    <div className="sticky top-[56px] sm:top-[64px] z-40 bg-gradient-to-b from-background-main/98 to-background-main/93 backdrop-blur-md border-b border-white/5 shadow-lg">
      {/* Self-contained styling for WebKit range input and custom dropdown scrollbar */}
      <style>{`
        .custom-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
        }
        .custom-slider::-moz-range-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          margin-top: -5px;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #f87171;
        }
        .custom-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        .custom-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          background: #f87171;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <Container className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Left Side: Search Bar & Mobile Filters Toggle */}
          <div className="flex items-center gap-3 w-full md:max-w-md lg:max-w-lg">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={type === 'movie' ? 'Search movies...' : 'Search TV shows...'}
                value={debouncedSearch}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 focus:bg-white/10 focus:border-buttons-purple/50 focus:ring-2 focus:ring-red-500/10 rounded-full text-sm text-white placeholder-gray-400 transition-all duration-300 focus:outline-none shadow-inner"
                aria-label={type === 'movie' ? 'Search movies' : 'Search TV shows'}
              />
              {debouncedSearch && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    setDebouncedSearch('');
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={onToggleFilters}
              className={`md:hidden flex items-center gap-2 px-4.5 py-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-md font-medium text-sm border ${
                showFilters
                  ? 'bg-red-500/10 border-buttons-purple/50 text-white'
                  : hasActiveFilters
                    ? 'bg-white/5 border-buttons-purple/30 text-white'
                    : 'bg-white/5 border-white/10 text-gray-200'
              }`}
              aria-label="Toggle filters"
            >
              <Filter className={`w-4 h-4 ${showFilters ? 'text-red-500' : hasActiveFilters ? 'text-red-400' : 'text-gray-400'}`} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Right Side: Desktop Filters */}
          <div className="hidden md:flex items-center gap-4">
            <CustomDropdown
              label="Genre"
              value={safeSelectedGenre}
              options={normalizedGenres.map((genre) => ({ label: genre.name, value: genre.name }))}
              onChange={handleGenreSelect}
              placeholder="All Genres"
              className="w-44"
            />

            <CustomDropdown
              label="Year"
              value={safeSelectedYear}
              options={normalizedYears.map((year) => ({ label: year, value: year }))}
              onChange={handleYearSelect}
              placeholder="All Years"
              className="w-36"
            />

            <div className={`flex items-center gap-3 bg-white/5 border px-4.5 py-2 rounded-full transition-all duration-300 shadow-md ${
              safeSelectedRating > 0 ? 'border-buttons-purple/30' : 'border-white/10 hover:border-white/20'
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Star className={`w-3.5 h-3.5 transition-all duration-300 ${
                  safeSelectedRating > 0 ? 'text-yellow-500 fill-current scale-110' : 'text-gray-400'
                }`} />
                <span className={safeSelectedRating > 0 ? 'text-white' : 'text-gray-400'}>Min Rating</span>
              </div>
              <input
                id="rating-slider"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={safeSelectedRating}
                onChange={(e) => handleRatingSelect(validateRating(parseFloat(e.target.value)))}
                className="w-24 lg:w-28 h-1 bg-transparent appearance-none cursor-pointer focus:outline-none custom-slider"
                aria-label="Filter by minimum rating"
              />
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                safeSelectedRating >= 7
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : safeSelectedRating >= 4
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : safeSelectedRating > 0
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'bg-white/5 text-gray-400 border border-white/5'
              }`}>
                {safeSelectedRating > 0 ? safeSelectedRating.toFixed(1) : 'Any'}
              </span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-buttons-purple/25 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters Drawer */}
        {showFilters && (
          <div className="md:hidden space-y-4 mt-4 p-4 bg-[#0E0E2E] border border-white/15 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Genre</label>
              <CustomDropdown
                label="Genre"
                value={safeSelectedGenre}
                options={normalizedGenres.map((genre) => ({ label: genre.name, value: genre.name }))}
                onChange={handleGenreSelect}
                placeholder="All Genres"
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Year</label>
              <CustomDropdown
                label="Year"
                value={safeSelectedYear}
                options={normalizedYears.map((year) => ({ label: year, value: year }))}
                onChange={handleYearSelect}
                placeholder="All Years"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="mobile-rating-slider" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Min Rating
                </label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  safeSelectedRating >= 7
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : safeSelectedRating >= 4
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : safeSelectedRating > 0
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-white/5 text-gray-400 border border-white/5'
                }`}>
                  {safeSelectedRating > 0 ? safeSelectedRating.toFixed(1) : 'Any'}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-full">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <input
                  id="mobile-rating-slider"
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={safeSelectedRating}
                  onChange={(e) => handleRatingSelect(validateRating(parseFloat(e.target.value)))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
                  aria-label="Filter by minimum rating"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="w-full py-2.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-buttons-purple/20 rounded-full font-semibold transition-all duration-300 active:scale-95 shadow-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </Container>
    </div>
  );
};

export default FilterBar;