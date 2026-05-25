import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  getMovieDetails,
  getTVShowDetails,
  getMovieVideos,
  getTVShowVideos,
  getMovieCredits,
  getTVShowCredits,
  getSimilarMovies,
  getSimilarTVShows,
  getEnhancedSimilarTVShows,
  getEnhancedSimilarMovies,
  getEnhancedRecommendationsMovies,
  getEnhancedRecommendationsTVShows,
  getMovieRecommendations,
  getTVShowRecommendations,
  getTVShowSeasons,
  getTVShowSeasonDetails,
  getMovieExternalIds,
  getTVShowExternalIds,
} from '../services/tmdb';
import {
  Movie,
  TVShow,
  Video,
  MovieCredits,
  Season,
  SeasonDetails,
  ExternalIds,
} from '../types';

export type DetailContentType = 'movie' | 'tv';

export interface DetailPageData {
  content: Movie | TVShow | null;
  videos: Video[];
  credits: MovieCredits | null;
  similar: (Movie | TVShow)[];
  recommended: (Movie | TVShow)[];
  externalIds: ExternalIds | null;
  seasons: Season[];
  selectedSeason: Season | null;
  selectedSeasonDetails: SeasonDetails | null;
  loading: boolean;
  loadingSeasons: boolean;
  error: string | null;
}

const initialData: DetailPageData = {
  content: null,
  videos: [],
  credits: null,
  similar: [],
  recommended: [],
  externalIds: null,
  seasons: [],
  selectedSeason: null,
  selectedSeasonDetails: null,
  loading: true,
  loadingSeasons: false,
  error: null,
};

/**
 * Encapsulates all detail page data fetching for movies and TV shows.
 * Returns content, credits, similar/recommended titles, videos, external IDs
 * (and for TV shows: seasons + selected season details).
 */
export function useDetailPageData(id: string | undefined, type: DetailContentType) {
  const [data, setData] = useState<DetailPageData>(initialData);

  const setSelectedSeason = useCallback(async (season: Season) => {
    if (!id || !season) return;
    setData(prev => ({ ...prev, loadingSeasons: true, selectedSeason: season }));
    try {
      const seasonDetails = await getTVShowSeasonDetails(parseInt(id), season.season_number);
      setData(prev => ({ ...prev, selectedSeasonDetails: seasonDetails, loadingSeasons: false }));
    } catch (err) {
      logger.error('Error fetching season details:', err);
      setData(prev => ({ ...prev, loadingSeasons: false }));
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const fetchAllData = async () => {
      if (!id) return;
      const numericId = parseInt(id);
      if (Number.isNaN(numericId)) return;

      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        if (type === 'movie') {
          const [movieData, videosData, creditsData, externalIdsData] = await Promise.all([
            getMovieDetails(numericId),
            getMovieVideos(numericId),
            getMovieCredits(numericId),
            getMovieExternalIds(numericId),
          ]);

          let similarContent: Movie[] = [];
          let recommendedContent: Movie[] = [];
          try {
            const [enhancedSimilar, enhancedRecommended] = await Promise.all([
              getEnhancedSimilarMovies(movieData),
              getEnhancedRecommendationsMovies(movieData),
            ]);
            similarContent = enhancedSimilar.slice(0, 12);
            recommendedContent = enhancedRecommended.slice(0, 12);
          } catch (err) {
            logger.error('Enhanced movie fetch failed, using fallback:', err);
            const [similarFallback, recommendedFallback] = await Promise.all([
              getSimilarMovies(movieData.id),
              getMovieRecommendations(movieData.id),
            ]);
            similarContent = (similarFallback.results || []).slice(0, 12);
            recommendedContent = (recommendedFallback.results || []).slice(0, 12);
          }

          if (cancelled) return;

          const ALLOWED_VIDEO_TYPES: readonly string[] = ['Trailer', 'Teaser', 'Clip', 'Featurette'];

          setData({
            content: movieData,
            videos: (videosData || []).filter(v => v.site === 'YouTube' && ALLOWED_VIDEO_TYPES.includes(v.type)),
            credits: creditsData,
            similar: similarContent,
            recommended: recommendedContent,
            externalIds: externalIdsData,
            seasons: [],
            selectedSeason: null,
            selectedSeasonDetails: null,
            loading: false,
            loadingSeasons: false,
            error: null,
          });
        } else {
          const [tvData, videosData, creditsData, seasonsData, externalIdsData] = await Promise.all([
            getTVShowDetails(numericId),
            getTVShowVideos(numericId),
            getTVShowCredits(numericId),
            getTVShowSeasons(numericId),
            getTVShowExternalIds(numericId),
          ]);

          let similarContent: TVShow[] = [];
          let recommendedContent: TVShow[] = [];
          try {
            const [enhancedSimilar, enhancedRecommended] = await Promise.all([
              getEnhancedSimilarTVShows(tvData),
              getEnhancedRecommendationsTVShows(tvData),
            ]);
            similarContent = enhancedSimilar.slice(0, 12);
            recommendedContent = enhancedRecommended.slice(0, 12);
          } catch (err) {
            logger.error('Enhanced TV fetch failed, using fallback:', err);
            const [similarFallback, recommendedFallback] = await Promise.all([
              getSimilarTVShows(tvData.id),
              getTVShowRecommendations(tvData.id),
            ]);
            similarContent = (similarFallback.results || []).slice(0, 12);
            recommendedContent = (recommendedFallback.results || []).slice(0, 12);
          }

          // Pick first regular season as default
          const firstRegularSeason = (seasonsData || []).find(s => s.season_number > 0)
            || (seasonsData || [])[0]
            || null;

          let selectedSeasonDetails: SeasonDetails | null = null;
          if (firstRegularSeason) {
            try {
              selectedSeasonDetails = await getTVShowSeasonDetails(numericId, firstRegularSeason.season_number);
            } catch (err) {
              logger.error('Error fetching first season details:', err);
            }
          }

          if (cancelled) return;

          const ALLOWED_VIDEO_TYPES: readonly string[] = ['Trailer', 'Teaser', 'Clip', 'Featurette'];

          setData({
            content: tvData,
            videos: (videosData || []).filter(v => v.site === 'YouTube' && ALLOWED_VIDEO_TYPES.includes(v.type)),
            credits: creditsData,
            similar: similarContent,
            recommended: recommendedContent,
            externalIds: externalIdsData,
            seasons: seasonsData || [],
            selectedSeason: firstRegularSeason,
            selectedSeasonDetails,
            loading: false,
            loadingSeasons: false,
            error: null,
          });
        }
      } catch (err) {
        logger.error('Error fetching content:', err);
        if (cancelled) return;
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load content',
        }));
      }
    };

    fetchAllData();
    return () => { cancelled = true; };
  }, [id, type]);

  return { data, setSelectedSeason };
}
