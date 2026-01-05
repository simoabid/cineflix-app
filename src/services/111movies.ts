export type SourceType = 'direct' | 'hls' | 'mp4';
export type Quality = 'SD' | 'HD' | 'FHD' | '4K';
export type Reliability = 'Fast' | 'Stable' | 'Premium';

export interface MovieSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  quality: Quality;
  reliability: Reliability;
  isAdFree: boolean;
  language?: string;
  fileSize?: string;
}

/**
 * Normalize an ID to a non-empty string.
 * Throws a TypeError if the ID is invalid.
 * Exported for unit testing.
 * @param id - string or number ID
 */
export function normalizeIdToString(id: string | number): string {
  if (typeof id === 'number') {
    if (!Number.isFinite(id)) {
      throw new TypeError('ID number must be finite');
    }
    return String(id);
  }
  if (typeof id === 'string') {
    const trimmed = id.trim();
    if (trimmed.length === 0) {
      throw new TypeError('ID string must be non-empty');
    }
    return trimmed;
  }
  throw new TypeError('ID must be a string or number');
}

/**
 * Validate that a value is a positive integer for TMDB/season/episode IDs.
 * Throws a TypeError when validation fails.
 * Exported for unit testing.
 * @param value - value to validate
 * @param name - parameter name used in error messages
 */
export function assertPositiveInteger(value: unknown, name = 'value'): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
}

/**
 * Tolerant ID normalization used by public API surfaces.
 * This helper will coerce falsy or otherwise non-strict values into
 * legacy-safe string outputs instead of throwing. This preserves legacy
 * behavior where callers that passed empty/undefined values receive
 * stringified segments in constructed URLs (e.g. "undefined", "null", "").
 *
 * Note: For strict validation in exported pure builders/tests use the
 * exported normalizeIdToString which throws on invalid input.
 *
 * @param id - any value typically string or number
 * @returns a string representation safe for use in URLs
 */
function tolerantNormalizeIdToString(id: unknown): string {
  if (typeof id === 'string') {
    // Preserve trimming but allow empty strings to remain (legacy behavior)
    return id.trim();
  }
  // For numbers and all other types, fallback to String coercion.
  // This mirrors legacy behavior where undefined/null would be stringified.
  return String(id);
}

/**
 * Tolerant season/episode normalizer used by public API surfaces.
 * Coerces the provided value into a string suitable for URL path segments.
 * Unlike strict validators, this will not throw on falsy or non-numeric input,
 * instead returning the legacy stringified value so callers receive the
 * same constructed URL they would have previously.
 *
 * Note: For strict validation in exported pure builders/tests use
 * assertPositiveInteger which throws on invalid input.
 *
 * @param value - season or episode value (number/string/others)
 * @returns string representation safe for use in URLs
 */
function tolerantNormalizeSeasonEpisode(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return String(value);
}

/**
 * Build a MovieSource object for a movie (pure transformation helper).
 * Exported for unit testing.
 * @param tmdbId - TMDB numeric ID
 */
export function buildMovieSource(tmdbId: number): MovieSource {
  assertPositiveInteger(tmdbId, 'tmdbId');
  const id = `111movies_movie_${tmdbId}`;
  return {
    id,
    name: '111movies',
    url: Movies111Service.getMovieEmbedUrl(tmdbId),
    type: 'hls',
    quality: 'HD',
    reliability: 'Stable',
    isAdFree: false,
    language: 'Multi',
    fileSize: 'Auto'
  };
}

/**
 * Build a MovieSource object for a TV episode (pure transformation helper).
 * Exported for unit testing.
 * @param tmdbId - TMDB numeric ID
 * @param season - season number
 * @param episode - episode number
 */
export function buildTVSource(tmdbId: number, season: number, episode: number): MovieSource {
  assertPositiveInteger(tmdbId, 'tmdbId');
  assertPositiveInteger(season, 'season');
  assertPositiveInteger(episode, 'episode');
  const id = `111movies_tv_${tmdbId}_s${season}e${episode}`;
  return {
    id,
    name: `111movies S${season}E${episode}`,
    url: Movies111Service.getTVEmbedUrl(tmdbId, season, episode),
    type: 'hls',
    quality: 'HD',
    reliability: 'Stable',
    isAdFree: false,
    language: 'Multi',
    fileSize: 'Auto'
  };
}

/**
 * 111movies API Service
 * Handles URL generation for 111movies player embed endpoints
 */
export class Movies111Service {
  private static readonly BASE_URL = 'https://111movies.com';

  /**
   * Generate movie embed URL
   * @param id - TMDB ID or IMDb ID (with tt prefix)
   * @returns embed URL string
   * @throws TypeError for invalid id when called indirectly by strict helpers
   *
   * Note: This public method uses a tolerant normalization strategy so that
   * callers that pass empty/undefined values receive legacy stringified
   * segments in the produced URL rather than having the call throw.
   */
  static getMovieEmbedUrl(id: string | number): string {
    try {
      const sid = tolerantNormalizeIdToString(id);
      return `${this.BASE_URL}/movie/${sid}`;
    } catch (err) {
      // Explicit error handling to surface malformed id issues
      throw err;
    }
  }

  /**
   * Generate TV show embed URL
   * @param id - TMDB ID or IMDb ID (with tt prefix)
   * @param season - Season number
   * @param episode - Episode number
   * @returns embed URL string
   * @throws TypeError for invalid id/season/episode when called indirectly by strict helpers
   *
   * Note: This public method uses tolerant normalization strategies so that
   * callers that pass empty/undefined values receive legacy stringified
   * segments in the produced URL rather than having the call throw.
   */
  static getTVEmbedUrl(id: string | number, season: number, episode: number): string {
    try {
      const sid = tolerantNormalizeIdToString(id);
      const s = tolerantNormalizeSeasonEpisode(season);
      const e = tolerantNormalizeSeasonEpisode(episode);
      return `${this.BASE_URL}/tv/${sid}/${s}/${e}`;
    } catch (err) {
      // Explicit error handling to surface malformed id/segment issues
      throw err;
    }
  }

  /**
   * Validate if ID is an IMDb ID (starts with 'tt')
   * @param id - string id to check
   * @returns true if id starts with 'tt'
   */
  static isImdbId(id: string): boolean {
    return typeof id === 'string' && id.startsWith('tt');
  }

  /**
   * Generate single 111movies source for a movie (TMDB ID only)
   * @param tmdbId - numeric TMDB ID
   * @returns array with a single MovieSource
   * @throws TypeError for invalid tmdbId
   */
  static generateMovieSources(tmdbId: number): MovieSource[] {
    // Keep API behavior: returns an array containing a single source
    return [buildMovieSource(tmdbId)];
  }

  /**
   * Generate single 111movies source for a TV show episode (TMDB ID only)
   * @param tmdbId - numeric TMDB ID
   * @param season - season number
   * @param episode - episode number
   * @returns array with a single MovieSource for the episode
   * @throws TypeError for invalid inputs
   */
  static generateTVSource(
    tmdbId: number,
    season: number,
    episode: number
  ): MovieSource[] {
    return [buildTVSource(tmdbId, season, episode)];
  }

  /**
   * Get supported subtitle languages (basic set)
   * @returns array of supported language names
   */
  static getSupportedSubtitleLanguages(): string[] {
    return [
      'English',
      'Spanish',
      'French',
      'German',
      'Portuguese',
      'Russian',
      'Italian',
      'Dutch'
    ];
  }
}

export default Movies111Service;