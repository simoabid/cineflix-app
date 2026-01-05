import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Genre } from '../types';

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
}

/**
 * Normalize and sanitize an array of Genre objects into a stable option list.
 * Removes duplicates by name and ensures each entry has an id and name.
 *
 * Exported for unit testing.
 *
 * @param genres - Array of Genre objects from API or props
 * @returns Normalized Genre array
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
 *
 * @param years - Array of year strings
 * @returns Normalized year strings
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
    // Convert to integer-like string to avoid duplicates like "2020" and "2020 "
    const yearStr = String(Math.trunc(num));
    if (seen.has(yearStr)) continue;
    seen.add(yearStr);
    normalized.push(yearStr);
  }
  // Sort descending to show most recent years first
  normalized.sort((a, b) => Number(b) - Number(a));
  return normalized;
}

/**
 * Validate and sanitize a rating value.
 * Ensures value is within [0, 10] and snaps to nearest 0.5 step.
 *
 * @param rating - incoming rating number
 * @returns sanitized rating number
 */
export function validateRating(rating: number): number {
  if (typeof rating !== 'number' || Number.isNaN(rating) || !Number.isFinite(rating)) {
    console.error('validateRating expected a finite number. Received:', rating);
    return 0;
  }
  let clamped = Math.max(0, Math.min(10, rating));
  // Snap to nearest 0.5
  clamped = Math.round(clamped * 2) / 2;
  return clamped;
}

/**
 * Ensure selectedGenre exists in the provided normalized genres list.
 * Returns empty string if invalid.
 *
 * @param selectedGenre - genre name from props/state
 * @param genres - normalized genres list
 * @returns valid genre name or empty string
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
 * Returns empty string if invalid.
 *
 * @param selectedYear - year string from props/state
 * @param years - normalized years list
 * @returns valid year string or empty string
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
 *
 * This helper centralizes normalization and validation for genres, years,
 * selected values, and rating so callers (including the FilterBar component)
 * can rely on consistent sanitized outputs.
 *
 * @param params - raw filter inputs; any field may be null/undefined
 * @returns object containing normalizedGenres, normalizedYears, safeSelectedGenre, safeSelectedYear, safeSelectedRating
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
}) => {
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchQuery);
  const timeoutRef = useRef<number | null>(null);

  // Normalize options and validate incoming selected values for robustness
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

  useEffect(() => {
    // Keep local debounce state in sync when parent updates searchQuery
    setDebouncedSearch(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    // Clean up timeout on unmount
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

    // Clear any previous timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Debounce search input
    // Use window.setTimeout to get a number in TS DOM
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
    <div className="sticky top-0 z-40 bg-[#0A0A1F]/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search TV shows..."
              value={debouncedSearch}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              aria-label="Search TV shows"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onToggleFilters}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-4">
          <select
            value={safeSelectedGenre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
            aria-label="Filter by genre"
          >
            <option value="">All Genres</option>
            {normalizedGenres.map((genre) => (
              <option key={genre.id} value={genre.name}>
                {genre.name}
              </option>
            ))}
          </select>

          <select
            value={safeSelectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {normalizedYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label htmlFor="rating-slider" className="text-sm text-gray-400">
              Min Rating: {safeSelectedRating || 0}
            </label>
            <input
              id="rating-slider"
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={safeSelectedRating}
              onChange={(e) => onRatingChange(validateRating(parseFloat(e.target.value)))}
              className="w-32 accent-red-600"
              aria-label="Filter by minimum rating"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="md:hidden space-y-4 mt-4 p-4 bg-gray-800 rounded-lg">
            <select
              value={safeSelectedGenre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              aria-label="Filter by genre"
            >
              <option value="">All Genres</option>
              {normalizedGenres.map((genre) => (
                <option key={genre.id} value={genre.name}>
                  {genre.name}
                </option>
              ))}
            </select>

            <select
              value={safeSelectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              aria-label="Filter by year"
            >
              <option value="">All Years</option>
              {normalizedYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              <label htmlFor="mobile-rating-slider" className="text-sm text-gray-400">
                Min Rating: {safeSelectedRating || 0}
              </label>
              <input
                id="mobile-rating-slider"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={safeSelectedRating}
                onChange={(e) => onRatingChange(validateRating(parseFloat(e.target.value)))}
                className="w-full accent-red-600"
                aria-label="Filter by minimum rating"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;