import { getTVShowDetails, getTVShowSeasonDetails, getMovieDetails } from '../../services/tmdb';
import { MWMediaType, MWSeasonMeta, MWSeasonWithEpisodeMeta, MWMediaMeta } from './types/mw';

export interface DetailedMeta {
  meta: MWMediaMeta;
  tmdbId?: string;
  imdbId?: string;
}

/**
 * Fetches media metadata from TMDB based on type and id.
 * 
 * @param type The media type (movie or series)
 * @param id The TMDB ID of the media
 * @param seasonId The TMDB ID of the season to fetch details for
 */
export async function getMetaFromId(
  type: MWMediaType,
  id: string,
  seasonId?: string
): Promise<DetailedMeta | null> {
  try {
    const tmdbIdNum = parseInt(id, 10);
    if (isNaN(tmdbIdNum)) return null;

    if (type === MWMediaType.SERIES) {
      const show = await getTVShowDetails(tmdbIdNum);
      if (!show || !show.seasons || show.seasons.length === 0) return null;

      // Find target season: match by seasonId or fallback to season_number 1, or the first available
      const targetSeason = show.seasons.find((s) => s.id.toString() === seasonId) ||
        show.seasons.find((s) => s.season_number === 1) ||
        show.seasons[0];

      if (!targetSeason) return null;

      const seasonDetails = await getTVShowSeasonDetails(tmdbIdNum, targetSeason.season_number);
      if (!seasonDetails) return null;

      const seasonsList: MWSeasonMeta[] = show.seasons.map((s) => ({
        id: s.id.toString(),
        number: s.season_number,
        title: s.name || `Season ${s.season_number}`,
      }));

      const seasonData: MWSeasonWithEpisodeMeta = {
        id: targetSeason.id.toString(),
        number: targetSeason.season_number,
        title: targetSeason.name || `Season ${targetSeason.season_number}`,
        episodes: (seasonDetails.episodes || []).map((ep) => ({
          id: ep.id.toString(),
          number: ep.episode_number,
          title: ep.name || `Episode ${ep.episode_number}`,
          air_date: ep.air_date || "",
          still_path: ep.still_path || null,
          overview: ep.overview || "",
        })),
      };

      return {
        meta: {
          type: MWMediaType.SERIES,
          title: show.name,
          id: id,
          year: show.first_air_date ? new Date(show.first_air_date).getFullYear().toString() : undefined,
          poster: show.poster_path || undefined,
          overview: show.overview || undefined,
          seasons: seasonsList,
          seasonData,
        },
        tmdbId: id,
        imdbId: show.external_ids?.imdb_id,
      };
    }

    if (type === MWMediaType.MOVIE) {
      const movie = await getMovieDetails(tmdbIdNum);
      if (!movie) return null;

      return {
        meta: {
          type: MWMediaType.MOVIE,
          title: movie.title,
          id: id,
          year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : undefined,
          poster: movie.poster_path || undefined,
          overview: movie.overview || undefined,
          seasons: undefined,
        },
        tmdbId: id,
        imdbId: movie.imdb_id,
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to get metadata from TMDB ID:", error);
    return null;
  }
}
