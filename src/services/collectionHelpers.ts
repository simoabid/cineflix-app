/**
 * Collection Helpers — Pure Functions & Constants
 *
 * Stateless classification, extraction, and mapping utilities used by
 * the collection discovery system. Extracted to keep collectionDiscovery.ts
 * focused on API-dependent orchestration logic.
 */

import type { Movie, CollectionType, CollectionStatus } from '../types';

// ─── Genre Mapping ────────────────────────────────────────────────────────────

/** TMDB genre ID → human-readable name mapping */
export const GENRE_MAP: Readonly<Record<number, string>> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
} as const;

// ─── Classification Functions ─────────────────────────────────────────────────

/** Classify a collection's type based on the number of films */
export const classifyCollectionType = (filmCount: number): CollectionType => {
  if (filmCount === 3) return 'trilogy';
  if (filmCount === 4) return 'quadrilogy';
  if (filmCount === 5) return 'pentology';
  if (filmCount === 6) return 'hexalogy';
  if (filmCount === 7) return 'septology';
  if (filmCount === 8) return 'octology';
  if (filmCount === 9) return 'nonology';
  if (filmCount > 9) return 'extended_series';
  return 'incomplete_series';
};

/** Determine if a collection is complete, ongoing, or incomplete */
export const determineCollectionStatus = (films: Movie[]): CollectionStatus => {
  if (films.length < 3) return 'incomplete';
  const currentYear = new Date().getFullYear();
  const latestYear = Math.max(
    ...films.map(f => new Date(f.release_date || '').getFullYear())
  );
  if (currentYear - latestYear <= 3) return 'ongoing';
  return 'complete';
};

// ─── Extraction Functions ─────────────────────────────────────────────────────

/**
 * Extract genre categories from a list of films.
 * Handles both genre_ids (list endpoints) and genres (detail endpoints).
 */
export const extractGenreCategories = (films: Movie[]): string[] => {
  const genreSet = new Set<string>();
  films.forEach(film => {
    film.genre_ids?.forEach(genreId => {
      if (GENRE_MAP[genreId]) genreSet.add(GENRE_MAP[genreId]);
    });
    film.genres?.forEach(genre => {
      if (genre.name) genreSet.add(genre.name);
    });
  });
  return Array.from(genreSet);
};

/** Extract the most common production studio across all films in a collection */
export const extractStudio = (films: Movie[]): string => {
  const studioCount = new Map<string, number>();
  films.forEach(film => {
    film.production_companies?.forEach(company => {
      if (company.name) {
        studioCount.set(company.name, (studioCount.get(company.name) || 0) + 1);
      }
    });
  });
  if (studioCount.size === 0) return 'Various Studios';
  const sorted = [...studioCount.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
};
