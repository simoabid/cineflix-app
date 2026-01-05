/**
 * SmashyStream API Service
 * Handles URL generation for SmashyStream player embed endpoints
 */

export interface SmashyStreamOptions {
  subLang?: string; // Default subtitle language (e.g., 'Arabic', 'English')
}

export type SmashyStreamQuality = 'SD' | 'HD' | 'FHD' | '4K';
export type SmashyStreamSourceType = 'direct' | 'hls' | 'mp4';
export type SmashyStreamReliability = 'Fast' | 'Stable' | 'Premium';

export interface SmashyStreamSource {
  id: string;
  name: string;
  url: string;
  type: SmashyStreamSourceType;
  quality: SmashyStreamQuality;
  reliability: SmashyStreamReliability;
  isAdFree: boolean;
  language?: string;
  fileSize?: string;
}

/**
 * Supported subtitle languages exposed for tests and validation helpers.
 */
export const SUPPORTED_SUBTITLE_LANGUAGES: string[] = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Chinese',
  'Arabic',
  'Turkish',
  'Hindi',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish'
];

/**
 * Pure helper: Determine if an identifier is an IMDb ID (starts with "tt").
 * Accepts unknown input and safely checks type.
 * @param id - Value to check
 * @returns true if id is a string starting with 'tt'
 */
export function isImdbIdPure(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith('tt');
}

/**
 * Strict helper: Validate and normalize subtitle language input and throw on invalid input.
 * This preserves the original strict behavior for callers that need it.
 * @param subLang - Subtitle language to validate
 * @returns the validated subtitle language or undefined
 * @throws TypeError if subLang is non-string when provided
 * @throws RangeError if subLang is not in the supported list
 */
export function strictValidateSubtitleLanguage(subLang?: unknown): string | undefined {
  if (subLang === undefined || subLang === null) return undefined;
  if (typeof subLang !== 'string') {
    throw new TypeError('subLang must be a string when provided');
  }
  if (!SUPPORTED_SUBTITLE_LANGUAGES.includes(subLang)) {
    throw new RangeError(`Unsupported subtitle language: ${subLang}`);
  }
  return subLang;
}

/**
 * Pure helper: Validate and normalize subtitle language input.
 * Legacy non-throwing contract: this sanitizer will NOT throw. It returns a validated
 * subtitle language string when valid, and returns undefined for undefined/null or any invalid input.
 * This preserves backward-compatible, lenient behavior for public APIs.
 * @param subLang - Subtitle language to validate
 * @returns the validated subtitle language or undefined
 */
export function validateSubtitleLanguage(subLang?: unknown): string | undefined {
  if (subLang === undefined || subLang === null) return undefined;
  if (typeof subLang !== 'string') {
    return undefined;
  }
  if (!SUPPORTED_SUBTITLE_LANGUAGES.includes(subLang)) {
    return undefined;
  }
  return subLang;
}

/**
 * Pure helper: Build encoded subtitle query param fragment (without leading ? or &).
 * Returns empty string when subLang is undefined.
 * @param subLang - validated subtitle language string or undefined
 */
export function buildSubLangQueryFragment(subLang?: string): string {
  return subLang ? `subLang=${encodeURIComponent(subLang)}` : '';
}

export class SmashyStreamService {
  private static readonly BASE_URL = 'https://player.smashy.stream';

  /**
   * Generate movie embed URL
   * Legacy non-throwing: This function sanitizes inputs and will not throw for invalid id or options.subLang.
   * Invalid id values are coerced to an empty string path segment, and invalid subtitle languages are omitted.
   * @param id - TMDB ID or IMDb ID (with tt prefix)
   * @param options - Additional options like subtitle language
   * @returns full embed URL string
   */
  static getMovieEmbedUrl(id: string | number, options?: SmashyStreamOptions): string {
    const idStr = (typeof id === 'string' || typeof id === 'number') ? String(id) : '';
    const validatedSubLang = options?.subLang ? validateSubtitleLanguage(options.subLang) : undefined;
    const baseUrl = `${this.BASE_URL}/movie/${idStr}`;

    if (validatedSubLang) {
      return `${baseUrl}?${buildSubLangQueryFragment(validatedSubLang)}`;
    }

    return baseUrl;
  }

  /**
   * Generate TV show embed URL
   * Legacy non-throwing: This function sanitizes inputs and will not throw for invalid id/season/episode or options.subLang.
   * Invalid id is coerced to an empty string path segment. Invalid season/episode are omitted from the query string.
   * @param id - TMDB ID or IMDb ID (with tt prefix)
   * @param season - Season number (non-negative integer)
   * @param episode - Episode number (non-negative integer)
   * @param options - Additional options like subtitle language
   * @returns full embed URL string
   */
  static getTVEmbedUrl(
    id: string | number,
    season: number,
    episode: number,
    options?: SmashyStreamOptions
  ): string {
    const idStr = (typeof id === 'string' || typeof id === 'number') ? String(id) : '';
    const validatedSubLang = options?.subLang ? validateSubtitleLanguage(options.subLang) : undefined;

    const queryParts: string[] = [];
    if (Number.isInteger(season) && season >= 0) {
      queryParts.push(`s=${season}`);
    }
    if (Number.isInteger(episode) && episode >= 0) {
      queryParts.push(`e=${episode}`);
    }

    let baseUrl = `${this.BASE_URL}/tv/${idStr}`;
    if (queryParts.length > 0) {
      baseUrl += `?${queryParts.join('&')}`;
    }

    if (validatedSubLang) {
      baseUrl += (queryParts.length > 0 ? '&' : '?') + buildSubLangQueryFragment(validatedSubLang);
    }

    return baseUrl;
  }

  /**
   * Generate anime embed URL using AniList ID
   * Legacy non-throwing: This function sanitizes numeric ids/episode and will not throw.
   * Invalid anilistId or episode values are omitted from the query string.
   * @param anilistId - AniList anime ID (positive integer)
   * @param episode - Episode number (non-negative integer)
   * @param options - Additional options like subtitle language
   * @returns full embed URL string
   */
  static getAnimeEmbedUrlAniList(
    anilistId: number,
    episode: number,
    options?: SmashyStreamOptions
  ): string {
    const validatedSubLang = options?.subLang ? validateSubtitleLanguage(options.subLang) : undefined;
    const queryParts: string[] = [];

    if (Number.isInteger(anilistId) && anilistId > 0) {
      queryParts.push(`anilist=${anilistId}`);
    }
    if (Number.isInteger(episode) && episode >= 0) {
      queryParts.push(`e=${episode}`);
    }

    let baseUrl = `${this.BASE_URL}/anime`;
    if (queryParts.length > 0) {
      baseUrl += `?${queryParts.join('&')}`;
    }

    if (validatedSubLang) {
      baseUrl += (queryParts.length > 0 ? '&' : '?') + buildSubLangQueryFragment(validatedSubLang);
    }

    return baseUrl;
  }

  /**
   * Generate anime embed URL using MyAnimeList ID
   * Legacy non-throwing: This function sanitizes numeric ids/episode and will not throw.
   * Invalid malId or episode values are omitted from the query string.
   * @param malId - MyAnimeList anime ID (positive integer)
   * @param episode - Episode number (non-negative integer)
   * @param options - Additional options like subtitle language
   * @returns full embed URL string
   */
  static getAnimeEmbedUrlMAL(
    malId: number,
    episode: number,
    options?: SmashyStreamOptions
  ): string {
    const validatedSubLang = options?.subLang ? validateSubtitleLanguage(options.subLang) : undefined;
    const queryParts: string[] = [];

    if (Number.isInteger(malId) && malId > 0) {
      queryParts.push(`mal=${malId}`);
    }
    if (Number.isInteger(episode) && episode >= 0) {
      queryParts.push(`e=${episode}`);
    }

    let baseUrl = `${this.BASE_URL}/anime`;
    if (queryParts.length > 0) {
      baseUrl += `?${queryParts.join('&')}`;
    }

    if (validatedSubLang) {
      baseUrl += (queryParts.length > 0 ? '&' : '?') + buildSubLangQueryFragment(validatedSubLang);
    }

    return baseUrl;
  }

  /**
   * Validate if ID is an IMDb ID (starts with 'tt')
   * @param id - value to check
   * @returns true when id is a string starting with 'tt'
   */
  static isImdbId(id: string): boolean {
    return isImdbIdPure(id);
  }

  /**
   * Generate single SmashyStream source for a movie (TMDB ID only)
   * @param tmdbId - TMDB numeric ID for the movie
   * @returns array containing one SmashyStreamSource
   */
  static generateMovieSources(tmdbId: number): SmashyStreamSource[] {
    return [{
      id: `smashystream_movie_${tmdbId}`,
      name: 'SmashyStream',
      url: this.getMovieEmbedUrl(tmdbId),
      type: 'hls' as const,
      quality: 'FHD' as const,
      reliability: 'Premium' as const,
      isAdFree: true,
      language: 'Multi',
      fileSize: 'Auto'
    }];
  }

  /**
   * Generate single SmashyStream source for a TV show episode (TMDB ID only)
   * @param tmdbId - TMDB numeric ID for the TV show
   * @param season - season number
   * @param episode - episode number
   * @returns array containing one SmashyStreamSource
   */
  static generateTVSource(
    tmdbId: number,
    season: number,
    episode: number
  ): SmashyStreamSource[] {
    return [{
      id: `smashystream_tv_${tmdbId}_s${season}e${episode}`,
      name: `SmashyStream S${season}E${episode}`,
      url: this.getTVEmbedUrl(tmdbId, season, episode),
      type: 'hls' as const,
      quality: 'FHD' as const,
      reliability: 'Premium' as const,
      isAdFree: true,
      language: 'Multi',
      fileSize: 'Auto'
    }];
  }

  /**
   * Get supported subtitle languages
   * @returns copy of supported subtitle languages list
   */
  static getSupportedSubtitleLanguages(): string[] {
    return [...SUPPORTED_SUBTITLE_LANGUAGES];
  }
}

export default SmashyStreamService;