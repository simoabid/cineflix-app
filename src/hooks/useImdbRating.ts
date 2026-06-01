import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchImdbRatingByTmdbId, ImdbRatingResult } from '../services/omdb';

interface UseImdbRatingOptions {
  /** TMDB numeric ID */
  readonly tmdbId: number | undefined;
  /** Media type for TMDB lookup */
  readonly mediaType: 'movie' | 'tv';
  /** TMDB vote_average — used as fallback if OMDb is rate-limited */
  readonly tmdbRating?: number;
  /** Whether to enable lazy loading via IntersectionObserver (default: true) */
  readonly lazy?: boolean;
}

interface UseImdbRatingResult {
  /** The rating string (e.g. "7.6"), or null if unavailable */
  readonly rating: string | null;
  /** Where the rating came from: 'imdb' (real OMDb), 'tmdb' (fallback), or 'none' */
  readonly source: 'imdb' | 'tmdb' | 'none';
  /** Whether the rating is currently being fetched */
  readonly isLoading: boolean;
  /** Ref to attach to the container element for IntersectionObserver */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook to lazily fetch IMDb ratings from OMDb API when a content card
 * becomes visible in the viewport. Falls back to TMDB rating when
 * OMDb is rate-limited or unavailable.
 */
export const useImdbRating = ({
  tmdbId,
  mediaType,
  tmdbRating,
  lazy = true,
}: UseImdbRatingOptions): UseImdbRatingResult => {
  const [result, setResult] = useState<ImdbRatingResult>({ rating: null, source: 'none' });
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchRating = useCallback(async () => {
    if (!tmdbId || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setIsLoading(true);
    try {
      const ratingResult = await fetchImdbRatingByTmdbId(tmdbId, mediaType, tmdbRating);
      setResult(ratingResult);
    } catch {
      setResult({ rating: null, source: 'none' });
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId, mediaType, tmdbRating]);

  useEffect(() => {
    // Reset when tmdbId changes
    hasFetchedRef.current = false;
    setResult({ rating: null, source: 'none' });
    setIsLoading(false);
  }, [tmdbId, mediaType]);

  useEffect(() => {
    if (!tmdbId) return;
    if (!lazy) {
      fetchRating();
      return;
    }
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasFetchedRef.current) {
          fetchRating();
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [tmdbId, lazy, fetchRating]);

  return { rating: result.rating, source: result.source, isLoading, containerRef };
};
