import {
  getTVShowSeasonDetails,
  getMovieDetails,
  getTVShowDetails,
  getLogoUrl,
  getTVShowEpisodeDetails,
} from '../../services/tmdb';
import { MWMediaType } from './types/mw';
import { TMDBContentTypes } from './types/tmdb';

export function mediaItemTypeToMediaType(type: 'movie' | 'show'): MWMediaType {
  return type === 'show' ? MWMediaType.SERIES : MWMediaType.MOVIE;
}

export function formatTMDBEpisode(v: {
  id: number | string;
  episode_number: number;
  title?: string;
  name?: string;
  air_date?: string;
  still_path?: string | null;
  overview?: string;
}) {
  return {
    id: v.id.toString(),
    number: v.episode_number,
    title: v.title ?? v.name ?? `Episode ${v.episode_number}`,
    air_date: v.air_date ?? '',
    still_path: v.still_path ?? null,
    overview: v.overview ?? '',
  };
}

/**
 * Fetches the list of episodes for a specific TV show season.
 * 
 * @param tvId TMDB ID of the TV show
 * @param seasonNumber The season number
 */
export async function getEpisodes(
  tvId: string,
  seasonNumber: number
): Promise<Array<Parameters<typeof formatTMDBEpisode>[0]>> {
  try {
    const details = await getTVShowSeasonDetails(parseInt(tvId, 10), seasonNumber);
    if (!details || !details.episodes) return [];
    return details.episodes.map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      title: ep.name,
      air_date: ep.air_date,
      still_path: ep.still_path,
      overview: ep.overview,
    }));
  } catch (error) {
    console.error('Failed to get episodes:', error);
    return [];
  }
}

/**
 * Fetches the logo URL for a movie or TV show.
 * 
 * @param tmdbId TMDB ID of the media
 * @param mediaType Movie or TV show type
 */
export async function getMediaLogo(
  tmdbId: string,
  mediaType: TMDBContentTypes
): Promise<string | null> {
  try {
    const id = parseInt(tmdbId, 10);
    if (mediaType === TMDBContentTypes.MOVIE) {
      const details = await getMovieDetails(id);
      return details?.logo_path ? getLogoUrl(details.logo_path) : null;
    } else {
      const details = await getTVShowDetails(id);
      return details?.logo_path ? getLogoUrl(details.logo_path) : null;
    }
  } catch (error) {
    console.error('Failed to get media logo:', error);
    return null;
  }
}

/**
 * Fetches runtime, genres, and ratings details for a movie or TV show.
 * 
 * @param tmdbId TMDB ID of the media
 * @param mediaType Movie or TV show type
 */
export async function getMediaDetails(
  tmdbId: string,
  mediaType: TMDBContentTypes,
  ..._args: unknown[]
): Promise<{
  vote_average?: number;
  genres?: Array<{ name: string }>;
  runtime?: number;
  episode_run_time?: number[];
} | null> {
  try {
    const id = parseInt(tmdbId, 10);
    if (mediaType === TMDBContentTypes.MOVIE) {
      const movie = await getMovieDetails(id);
      if (!movie) return null;
      return {
        vote_average: movie.vote_average,
        genres: movie.genres?.map((g) => ({ name: g.name })),
        runtime: movie.runtime,
      };
    } else {
      const tvShow = await getTVShowDetails(id);
      if (!tvShow) return null;
      return {
        vote_average: tvShow.vote_average,
        genres: tvShow.genres?.map((g) => ({ name: g.name })),
        episode_run_time: tvShow.episode_run_time,
      };
    }
  } catch (error) {
    console.error('Failed to get media details:', error);
    return null;
  }
}

/**
 * Fetches detailed info for a specific episode, including runtime and ratings.
 * 
 * @param tmdbId TMDB ID of the TV show
 * @param seasonNumber The season number
 * @param episodeNumber The episode number
 */
export async function getEpisodeDetails(
  tmdbId: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<{
  runtime?: number;
  vote_average?: number;
} | null> {
  try {
    const tvId = parseInt(tmdbId, 10);
    const data = await getTVShowEpisodeDetails(tvId, seasonNumber, episodeNumber);
    if (!data) return null;
    return {
      runtime: data.runtime,
      vote_average: data.vote_average,
    };
  } catch (error) {
    console.error('Failed to get episode details:', error);
    return null;
  }
}

export { TMDBContentTypes };
