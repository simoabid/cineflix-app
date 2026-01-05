import { StreamSource, DownloadOption, TorrentSource } from '../types';

export interface RivestreamEndpoint {
  type: 'standard' | 'aggregator' | 'torrent' | 'download';
  baseUrl: string;
  name: string;
  description: string;
}

export interface RivestreamOptions {
  contentType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

/**
 * Pure helper to format content title for torrent entries.
 * Exported for testability.
 * @param options RivestreamOptions
 * @returns formatted title string like "TV Show S01E02" or "Movie"
 */
export function formatContentTitle(options: RivestreamOptions): string {
  if (options.contentType === 'tv') {
    const season = options.season !== undefined ? options.season.toString().padStart(2, '0') : '00';
    const episode = options.episode !== undefined ? options.episode.toString().padStart(2, '0') : '00';
    return `TV Show S${season}E${episode}`;
  }
  return 'Movie';
}

class RivestreamService {
  private readonly endpoints: RivestreamEndpoint[] = [
    {
      type: 'standard',
      baseUrl: 'https://rivestream.org/embed',
      name: 'Rivestream Standard',
      description: 'Standard streaming with multiple quality options'
    },
    {
      type: 'aggregator',
      baseUrl: 'https://rivestream.org/embed/agg',
      name: 'Rivestream Aggregator',
      description: 'Multiple aggregator servers for better reliability'
    },
    {
      type: 'torrent',
      baseUrl: 'https://rivestream.org/embed/torrent',
      name: 'Rivestream Torrent',
      description: 'High-quality torrent-backed streaming'
    },
    {
      type: 'download',
      baseUrl: 'https://rivestream.org/download',
      name: 'Rivestream Download',
      description: 'Direct download functionality'
    }
  ];

  private readonly httpClient?: { head?: (url: string, opts?: any) => Promise<any> };

  /**
   * Construct a RivestreamService.
   * @param httpClient Optional HTTP client with a `head` method to check availability.
   */
  constructor(httpClient?: { head?: (url: string, opts?: any) => Promise<any> }) {
    this.httpClient = httpClient;
  }

  /**
   * Build URL for Rivestream embed based on content type and parameters
   */
  private buildUrl(endpoint: RivestreamEndpoint, options: RivestreamOptions): string {
    const { contentType, tmdbId, season, episode } = options;
    let url = `${endpoint.baseUrl}?type=${contentType}&id=${tmdbId}`;
    
    if (contentType === 'tv' && season && episode) {
      url += `&season=${season}&episode=${episode}`;
    }
    
    return url;
  }

  /**
   * Build URL for CinemaOS embed based on content type and parameters
   */
  private buildCinemaOSUrl(options: RivestreamOptions): string {
    const { contentType, tmdbId, season, episode } = options;
    
    let baseUrl = '';
    if (contentType === 'movie') {
      baseUrl = `https://cinemaos.tech/player/${tmdbId}`;
    } else {
      // For TV shows: https://cinemaos.tech/player/{tmdb_id}/{season_number}/{episode_number}
      baseUrl = `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}`;
    }
    
    // Add parameters to minimize ads and improve experience
    const params = new URLSearchParams({
      'autoplay': '1',
      'muted': '0',
      'controls': '1',
      'rel': '0',
      'modestbranding': '1',
      'fs': '1',
      'cc_load_policy': '0',
      'iv_load_policy': '3',
      'autohide': '2'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Build URL for Beech embed based on content type and parameters
   */
  private buildBeechUrl(options: RivestreamOptions): string {
    const { contentType, tmdbId, season, episode } = options;
    
    if (contentType === 'movie') {
      // For movies: https://beech-api.vercel.app/?id={id}
      return `https://beech-api.vercel.app/?id=${tmdbId}`;
    } else {
      // For TV shows: https://beech-api.vercel.app/?id={id}&type=tv&season={season}&episode={episode}
      return `https://beech-api.vercel.app/?id=${tmdbId}&type=tv&season=${season}&episode=${episode}`;
    }
  }

  /**
   * Build URL for Vidjoy embed based on content type and parameters
   */
  private buildVidjoyUrl(options: RivestreamOptions): string {
    const { contentType, tmdbId, season, episode } = options;
    
    if (contentType === 'movie') {
      // For movies: https://vidjoy.pro/embed/movie/{tmdb_id}
      return `https://vidjoy.pro/embed/movie/${tmdbId}`;
    } else {
      // For TV shows: https://vidjoy.pro/embed/tv/{tmdb_id}/{season}/{episode}
      return `https://vidjoy.pro/embed/tv/${tmdbId}/${season}/${episode}`;
    }
  }

  /**
   * Build URL for VidSrc embed based on content type, parameters and API variant
   */
  private buildVidSrcUrl(options: RivestreamOptions, apiVersion: number): string {
    const { contentType, tmdbId, season, episode } = options;
    
    if (contentType === 'movie') {
      // For movies: https://vidsrc.wtf/api/{version}/movie/?id={tmdb_id}&color={hexcolor}
      const baseUrl = `https://vidsrc.wtf/api/${apiVersion}/movie/?id=${tmdbId}`;
      // Add color parameter for API 1 and 2 (optional for others)
      if (apiVersion === 1 || apiVersion === 2) {
        return `${baseUrl}&color=ff0000`; // Red theme color
      }
      return baseUrl;
    } else {
      // For TV shows: https://vidsrc.wtf/api/{version}/tv/?id={tmdb_id}&s={season}&e={episode}
      return `https://vidsrc.wtf/api/${apiVersion}/tv/?id=${tmdbId}&s=${season}&e=${episode}`;
    }
  }

  /**
   * Build URL for VidFast embed based on content type and parameters
   */
  private buildVidFastUrl(options: RivestreamOptions): string {
    const { contentType, tmdbId, season, episode } = options;
    
    if (contentType === 'movie') {
      // For movies: https://vidfast.pro/movie/{id}?autoPlay=true
      return `https://vidfast.pro/movie/${tmdbId}?autoPlay=true`;
    } else {
      // For TV shows: https://vidfast.pro/tv/{id}/{season}/{episode}?autoPlay=true
      return `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?autoPlay=true`;
    }
  }

  /**
   * Helper to perform retries with exponential backoff.
   * Keeps observable behavior the same by bubbling errors to callers.
   * @param operation async function to run
   * @param maxAttempts number of attempts (default 3)
   * @param baseDelayMs base delay in ms (default 200)
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>, maxAttempts = 3, baseDelayMs = 200): Promise<T> {
    let attempt = 0;
    let lastError: any = null;
    while (attempt < maxAttempts) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (attempt >= maxAttempts) break;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw lastError;
  }

  /**
   * Get stream sources for a movie or TV show
   * @param options RivestreamOptions
   * @returns Promise<StreamSource[]>
   */
  async getStreamSources(options: RivestreamOptions): Promise<StreamSource[]> {
    const sources: StreamSource[] = [];
    
    // Rivestream Server 1 (Standard)
    const standardEndpoint = this.endpoints.find(e => e.type === 'standard');
    if (standardEndpoint) {
      sources.push({
        id: 'rivestream_server_1',
        name: 'Rivestream Server 1',
        url: this.buildUrl(standardEndpoint, options),
        type: 'hls',
        quality: 'FHD',
        fileSize: 'Auto',
        reliability: 'Fast',
        isAdFree: true,
        language: 'English',
        subtitles: ['English', 'Spanish', 'French']
      });
    }

    // Rivestream Server 2 (Aggregator) - Default/Recommended
    const aggregatorEndpoint = this.endpoints.find(e => e.type === 'aggregator');
    if (aggregatorEndpoint) {
      sources.push({
        id: 'rivestream_server_2',
        name: 'Rivestream Server 2',
        url: this.buildUrl(aggregatorEndpoint, options),
        type: 'hls',
        quality: '4K',
        fileSize: 'Auto',
        reliability: 'Premium',
        isAdFree: true,
        language: 'English',
        subtitles: ['English', 'Spanish', 'French', 'German', 'Italian']
      });
    }

    // Rivestream Server 3 (Torrent)
    const torrentEndpoint = this.endpoints.find(e => e.type === 'torrent');
    if (torrentEndpoint) {
      sources.push({
        id: 'rivestream_server_3',
        name: 'Rivestream Server 3',
        url: this.buildUrl(torrentEndpoint, options),
        type: 'direct',
        quality: 'HD',
        fileSize: 'Variable',
        reliability: 'Stable',
        isAdFree: true,
        language: 'English',
        subtitles: ['English']
      });
    }

    // RiveStream S2 (Dedicated Server 2 Variant)
    if (aggregatorEndpoint) {
      sources.push({
        id: 'rivestream_s2_main',
        name: 'RiveStream S2',
        url: this.buildUrl(aggregatorEndpoint, options),
        type: 'hls',
        quality: '4K',
        fileSize: 'Auto',
        reliability: 'Premium',
        isAdFree: true,
        language: 'English',
        subtitles: ['English', 'Spanish', 'French', 'German', 'Italian']
      });
    }

    // Add CinemaOS streaming service
    sources.push({
      id: 'cinemaos_player',
      name: 'CinemaOS',
      url: this.buildCinemaOSUrl(options),
      type: 'hls',
      quality: 'FHD',
      fileSize: 'Auto',
      reliability: 'Premium',
      isAdFree: true,
      language: 'English',
      subtitles: ['English', 'Spanish', 'French']
    });

    // Add Beech streaming service
    sources.push({
      id: 'beech_player',
      name: 'Beech',
      url: this.buildBeechUrl(options),
      type: 'hls',
      quality: 'HD',
      fileSize: 'Auto',
      reliability: 'Fast',
      isAdFree: false, // Documentation mentions "a teeny bit of Ads"
      language: 'English',
      subtitles: ['English']
    });

    // Add Vidjoy streaming service
    sources.push({
      id: 'vidjoy_player',
      name: 'Vidjoy',
      url: this.buildVidjoyUrl(options),
      type: 'hls',
      quality: 'FHD',
      fileSize: 'Auto',
      reliability: 'Premium',
      isAdFree: true,
      language: 'English',
      subtitles: ['English', 'Spanish', 'French']
    });

    // Add VidSrc Premium (separate from regular VidSrc APIs)
    sources.push({
      id: 'vidsrc_premium_main',
      name: 'VidSrc Premium',
      url: this.buildVidSrcUrl(options, 4),
      type: 'hls',
      quality: '4K',
      fileSize: 'Auto',
      reliability: 'Premium',
      isAdFree: true,
      language: 'English',
      subtitles: ['English', 'Spanish', 'French']
    });

    // Add VidSrc API variants
    sources.push(
      {
        id: 'vidsrc_api_1',
        name: 'VidSrc Multi Server',
        url: this.buildVidSrcUrl(options, 1),
        type: 'hls',
        quality: 'HD',
        fileSize: 'Auto',
        reliability: 'Fast',
        isAdFree: false,
        language: 'English',
        subtitles: ['English']
      },
      {
        id: 'vidsrc_api_2',
        name: 'VidSrc Multi Language',
        url: this.buildVidSrcUrl(options, 2),
        type: 'hls',
        quality: 'FHD',
        fileSize: 'Auto',
        reliability: 'Fast',
        isAdFree: false,
        language: 'Multi-Language',
        subtitles: ['English', 'Spanish', 'French', 'German']
      },
      {
        id: 'vidsrc_api_3',
        name: 'VidSrc Multi Embeds',
        url: this.buildVidSrcUrl(options, 3),
        type: 'hls',
        quality: 'FHD',
        fileSize: 'Auto',
        reliability: 'Premium',
        isAdFree: true,
        language: 'English',
        subtitles: ['English', 'Spanish']
      },
      {
        id: 'vidsrc_api_4',
        name: 'VidSrc Premium',
        url: this.buildVidSrcUrl(options, 4),
        type: 'hls',
        quality: '4K',
        fileSize: 'Auto',
        reliability: 'Premium',
        isAdFree: true,
        language: 'English',
        subtitles: ['English', 'Spanish', 'French']
      }
    );

    // Add VidFast
    sources.push({
      id: 'vidfast_player',
      name: 'VidFast',
      url: this.buildVidFastUrl(options),
      type: 'hls',
      quality: 'FHD',
      fileSize: 'Auto',
      reliability: 'Fast',
      isAdFree: true,
      language: 'English',
      subtitles: ['English', 'Spanish', 'French']
    });

    // Add other placeholder sources for future streaming services
    sources.push({
      id: 'placeholder_embedsu',
      name: 'EmbedSu',
      url: '',
      type: 'mp4',
      quality: 'FHD',
      fileSize: 'Auto',
      reliability: 'Stable',
      isAdFree: true,
      language: 'English',
      subtitles: ['English', 'Spanish']
    });

    return sources;
  }

  /**
   * Get download options for a movie or TV show
   * @param options RivestreamOptions
   * @returns Promise<DownloadOption[]>
   */
  async getDownloadOptions(options: RivestreamOptions): Promise<DownloadOption[]> {
    const downloadEndpoint = this.endpoints.find(e => e.type === 'download');
    if (!downloadEndpoint) return [];

    const baseUrl = this.buildUrl(downloadEndpoint, options);

    return [
      {
        id: 'rivestream_download_480p',
        quality: '480p',
        format: 'MP4',
        fileSize: '800 MB',
        codec: 'H.264',
        url: `${baseUrl}&quality=480p`,
        estimatedDownloadTime: '15 min'
      },
      {
        id: 'rivestream_download_720p',
        quality: '720p',
        format: 'MP4',
        fileSize: '1.4 GB',
        codec: 'H.264',
        url: `${baseUrl}&quality=720p`,
        estimatedDownloadTime: '25 min'
      },
      {
        id: 'rivestream_download_1080p',
        quality: '1080p',
        format: 'MKV',
        fileSize: '2.8 GB',
        codec: 'H.265',
        url: `${baseUrl}&quality=1080p`,
        estimatedDownloadTime: '45 min'
      },
      {
        id: 'rivestream_download_4k',
        quality: '4K',
        format: 'MKV',
        fileSize: '8.2 GB',
        codec: 'H.265',
        url: `${baseUrl}&quality=4k`,
        estimatedDownloadTime: '2 hours'
      }
    ];
  }

  /**
   * Get torrent sources for a movie or TV show
   * @param options RivestreamOptions
   * @returns Promise<TorrentSource[]>
   */
  async getTorrentSources(options: RivestreamOptions): Promise<TorrentSource[]> {
    // Note: Rivestream doesn't directly provide torrent magnet links,
    // but we can provide torrent streaming through their torrent endpoint
    const torrentEndpoint = this.endpoints.find(e => e.type === 'torrent');
    if (!torrentEndpoint) return [];

    const contentTitle = formatContentTitle(options);

    return [
      {
        id: 'rivestream_torrent_1080p',
        name: `${contentTitle} BluRay 1080p`,
        magnetLink: `magnet:?xt=urn:btih:rivestream_${options.tmdbId}_1080p&dn=${encodeURIComponent(contentTitle)}`,
        quality: 'BluRay',
        fileSize: '12.5 GB',
        seeders: 1250,
        leechers: 45,
        health: 'Excellent',
        releaseGroup: 'Rivestream',
        uploadedBy: 'RivestreamBot',
        isTrusted: true,
        uploadDate: new Date().toISOString().split('T')[0]
      },
      {
        id: 'rivestream_torrent_720p',
        name: `${contentTitle} WEBRip 720p`,
        magnetLink: `magnet:?xt=urn:btih:rivestream_${options.tmdbId}_720p&dn=${encodeURIComponent(contentTitle)}`,
        quality: 'WEBRip',
        fileSize: '4.2 GB',
        seeders: 890,
        leechers: 23,
        health: 'Good',
        releaseGroup: 'Rivestream',
        uploadedBy: 'RivestreamBot',
        isTrusted: true,
        uploadDate: new Date().toISOString().split('T')[0]
      }
    ];
  }

  /**
   * Check if a source is available (basic connectivity test)
   * If an injected httpClient is available, perform a HEAD request with retries.
   * Otherwise, fallback to optimistic true (preserve original behavior).
   * @param url string
   * @returns Promise<boolean>
   */
  async checkSourceAvailability(_url: string): Promise<boolean> {
    try {
      if (this.httpClient && typeof this.httpClient.head === 'function') {
        await this.retryWithBackoff(() => this.httpClient!.head!(_url, { timeout: 2000 }), 3, 200);
        return true;
      }
      // In a real implementation, you might want to make a HEAD request
      // For now, we'll assume Rivestream sources are generally available
      return true;
    } catch (error) {
      // log and return false to indicate unavailability
      // preserve minimal observable behavior by returning false on actual failures
      // but do not throw to keep callers' expectations stable
      // eslint-disable-next-line no-console
      console.error('Source availability check failed:', error);
      return false;
    }
  }

  /**
   * Get all available content data for a movie or TV show
   * @param options RivestreamOptions
   * @returns Promise<{ streamSources: StreamSource[]; downloadOptions: DownloadOption[]; torrentSources: TorrentSource[] }>
   */
  async getAllContentData(options: RivestreamOptions) {
    try {
      const [streamSources, downloadOptions, torrentSources] = await Promise.all([
        this.getStreamSources(options),
        this.getDownloadOptions(options),
        this.getTorrentSources(options)
      ]);

      return {
        streamSources,
        downloadOptions,
        torrentSources
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching Rivestream content data:', error);
      return {
        streamSources: [],
        downloadOptions: [],
        torrentSources: []
      };
    }
  }

  /**
   * Get available seasons and episodes for a TV show
   * @param tmdbId number
   * @returns Promise<Array<{ season: number; episodes: number[] }>>
   */
  async getTVShowSeasons(_tmdbId: number): Promise<{ season: number; episodes: number[] }[]> {
    // This would typically come from TMDB API or Rivestream's metadata
    // For now, return a basic structure that can be expanded
    return [
      { season: 1, episodes: Array.from({ length: 10 }, (_, i) => i + 1) }
    ];
  }
}

export const rivestreamService = new RivestreamService();
export default rivestreamService;