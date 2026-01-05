import { WatchProgress, WatchingSession, ContentRating, BookmarkedScene, StreamSource, DownloadOption, TorrentSource } from '../types';

type HttpFetcher<T> = (payload: { contentId: number; contentType: 'movie' | 'tv' }) => Promise<T[]>;

/**
 * Safely parse JSON returning null on failure.
 * @param raw - raw JSON string
 */
function parseJSONSafe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('parseJSONSafe: failed to parse JSON', err);
    return null;
  }
}

/**
 * Helper to get localStorage item by key, safely parsed.
 * @param key - localStorage key
 */
function lsGetParsed<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return parseJSONSafe<T>(raw);
}

/**
 * Helper to set localStorage item with JSON stringification.
 * @param key - localStorage key
 * @param value - value to store
 */
function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('lsSet: failed to stringify or set localStorage', err);
  }
}

/**
 * Iterate over localStorage keys with a prefix and invoke callback with parsed data.
 * @param prefix - key prefix to filter
 * @param callback - fn invoked with key and parsed data (if parsed successfully)
 */
function iterateLocalStorageWithPrefix<T>(prefix: string, callback: (key: string, item: T) => void): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const parsed = lsGetParsed<T>(key);
      if (parsed) {
        callback(key, parsed);
      }
    }
  }
}

/**
 * Generate an ISO timestamp string for now.
 */
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Generate a simple unique id based on timestamp.
 */
function generateId(): string {
  return Date.now().toString();
}

/**
 * Validate that an object has the expected type for a primitive field.
 * Returns defaultValue if validation fails.
 */
function validateField<T>(obj: any, field: string, defaultValue: T): T {
  if (obj && Object.prototype.hasOwnProperty.call(obj, field)) {
    return obj[field] as T;
  }
  return defaultValue;
}

/**
 * Pure function: validate and transform raw payload into StreamSource[].
 * Exported for unit testing.
 * @param raw - raw payload array (untrusted)
 */
export function transformStreamSources(raw: any[], contentId: number, contentType: 'movie' | 'tv'): StreamSource[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => ({
    id: String(validateField(item, 'id', idx + 1)),
    name: validateField(item, 'name', `Server ${idx + 1}`),
    url: validateField(item, 'url', `https://stream.example.com/${contentType}/${contentId}/stream${idx + 1}`),
    type: validateField(item, 'type', 'hls') as 'direct' | 'hls' | 'mp4',
    quality: validateField(item, 'quality', 'HD') as 'SD' | 'HD' | 'FHD' | '4K',
    fileSize: validateField(item, 'fileSize', 'Unknown'),
    reliability: (validateField(item, 'reliability', 'Fast') || 'Fast') as 'Fast' | 'Stable' | 'Premium',
    isAdFree: validateField(item, 'isAdFree', false),
    language: validateField(item, 'language', 'Unknown'),
    subtitles: Array.isArray(item?.subtitles) ? item.subtitles : []
  }));
}

/**
 * Pure function: validate and transform raw payload into DownloadOption[].
 * Exported for unit testing.
 * @param raw - raw payload array (untrusted)
 */
export function transformDownloadOptions(raw: any[], contentId: number, contentType: 'movie' | 'tv'): DownloadOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => ({
    id: String(validateField(item, 'id', idx + 1)),
    quality: (validateField(item, 'quality', '480p') || '480p') as '480p' | '720p' | '1080p' | '4K',
    format: validateField(item, 'format', 'MP4') as 'MP4' | 'MKV',
    fileSize: validateField(item, 'fileSize', 'Unknown'),
    codec: validateField(item, 'codec', 'Unknown'),
    url: validateField(item, 'url', `https://download.example.com/${contentType}/${contentId}/${validateField(item, 'quality', 'sd').toString().toLowerCase()}.mp4`),
    estimatedDownloadTime: validateField(item, 'estimatedDownloadTime', 'Unknown')
  }));
}

/**
 * Pure function: validate and transform raw payload into TorrentSource[].
 * Exported for unit testing.
 * @param raw - raw payload array (untrusted)
 */
export function transformTorrentSources(raw: any[], contentId: number, contentType: 'movie' | 'tv'): TorrentSource[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => ({
    id: String(validateField(item, 'id', idx + 1)),
    name: validateField(item, 'name', `Torrent ${idx + 1}`),
    magnetLink: validateField(item, 'magnetLink', `magnet:?xt=urn:btih:${contentId}${contentType}example${idx + 1}`),
    quality: (validateField(item, 'quality', 'WEBRip') || 'WEBRip') as 'CAM' | 'TS' | 'HDRip' | 'BluRay' | 'WEBRip',
    fileSize: validateField(item, 'fileSize', 'Unknown'),
    seeders: validateField(item, 'seeders', 0),
    leechers: validateField(item, 'leechers', 0),
    health: (validateField(item, 'health', 'Good') || 'Good') as 'Excellent' | 'Good' | 'Fair' | 'Poor',
    releaseGroup: validateField(item, 'releaseGroup', 'Unknown'),
    uploadedBy: validateField(item, 'uploadedBy', 'Unknown'),
    isTrusted: validateField(item, 'isTrusted', false),
    uploadDate: validateField(item, 'uploadDate', nowISO())
  }));
}

/**
 * Default mock fetcher used when no HTTP client is injected.
 * Returns raw arrays similar to original mock data after a short delay.
 */
function defaultStreamFetcher(payload: { contentId: number; contentType: 'movie' | 'tv' }): Promise<any[]> {
  const { contentId, contentType } = payload;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          name: 'Server 1',
          url: `https://stream.example.com/${contentType}/${contentId}/stream1`,
          type: 'hls',
          quality: 'FHD',
          fileSize: '2.1 GB',
          reliability: 'Fast',
          isAdFree: true,
          language: 'English',
          subtitles: ['English', 'Spanish', 'French']
        },
        {
          id: '2',
          name: 'Server 2',
          url: `https://stream.example.com/${contentType}/${contentId}/stream2`,
          type: 'direct',
          quality: '4K',
          fileSize: '4.5 GB',
          reliability: 'Premium',
          isAdFree: true,
          language: 'English',
          subtitles: ['English', 'Spanish', 'French', 'German']
        },
        {
          id: '3',
          name: 'Mirror 1',
          url: `https://mirror.example.com/${contentType}/${contentId}/mirror1`,
          type: 'mp4',
          quality: 'HD',
          fileSize: '1.4 GB',
          reliability: 'Stable',
          isAdFree: false,
          language: 'English',
          subtitles: ['English']
        }
      ]);
    }, 500);
  });
}

function defaultDownloadFetcher(payload: { contentId: number; contentType: 'movie' | 'tv' }): Promise<any[]> {
  const { contentId, contentType } = payload;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          quality: '480p',
          format: 'MP4',
          fileSize: '800 MB',
          codec: 'H.264',
          url: `https://download.example.com/${contentType}/${contentId}/480p.mp4`,
          estimatedDownloadTime: '15 min'
        },
        {
          id: '2',
          quality: '720p',
          format: 'MP4',
          fileSize: '1.4 GB',
          codec: 'H.264',
          url: `https://download.example.com/${contentType}/${contentId}/720p.mp4`,
          estimatedDownloadTime: '25 min'
        },
        {
          id: '3',
          quality: '1080p',
          format: 'MKV',
          fileSize: '2.8 GB',
          codec: 'H.265',
          url: `https://download.example.com/${contentType}/${contentId}/1080p.mkv`,
          estimatedDownloadTime: '45 min'
        },
        {
          id: '4',
          quality: '4K',
          format: 'MKV',
          fileSize: '8.2 GB',
          codec: 'H.265',
          url: `https://download.example.com/${contentType}/${contentId}/4k.mkv`,
          estimatedDownloadTime: '2 hours'
        }
      ]);
    }, 500);
  });
}

function defaultTorrentFetcher(payload: { contentId: number; contentType: 'movie' | 'tv' }): Promise<any[]> {
  const { contentId, contentType } = payload;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          name: 'BluRay 1080p',
          magnetLink: `magnet:?xt=urn:btih:${contentId}${contentType}example1`,
          quality: 'BluRay',
          fileSize: '12.5 GB',
          seeders: 1250,
          leechers: 45,
          health: 'Excellent',
          releaseGroup: 'YIFY',
          uploadedBy: 'TrustedUploader',
          isTrusted: true,
          uploadDate: '2024-01-15'
        },
        {
          id: '2',
          name: 'WEBRip 720p',
          magnetLink: `magnet:?xt=urn:btih:${contentId}${contentType}example2`,
          quality: 'WEBRip',
          fileSize: '4.2 GB',
          seeders: 890,
          leechers: 23,
          health: 'Good',
          releaseGroup: 'RARBG',
          uploadedBy: 'Uploader2',
          isTrusted: true,
          uploadDate: '2024-01-10'
        },
        {
          id: '3',
          name: 'HDRip 720p',
          magnetLink: `magnet:?xt=urn:btih:${contentId}${contentType}example3`,
          quality: 'HDRip',
          fileSize: '2.1 GB',
          seeders: 456,
          leechers: 78,
          health: 'Fair',
          releaseGroup: 'FGT',
          uploadedBy: 'Uploader3',
          isTrusted: false,
          uploadDate: '2024-01-08'
        }
      ]);
    }, 500);
  });
}

class WatchService {
  /**
   * Save watch progress for a piece of content.
   * @param progress - watch progress object
   */
  saveWatchProgress(progress: WatchProgress): void {
    const key = `watch_progress_${progress.contentType}_${progress.contentId}`;
    lsSet(key, progress);
  }

  /**
   * Get saved watch progress for a content item.
   * @param contentId - numeric content id
   * @param contentType - 'movie' or 'tv'
   */
  getWatchProgress(contentId: number, contentType: 'movie' | 'tv'): WatchProgress | null {
    const key = `watch_progress_${contentType}_${contentId}`;
    return lsGetParsed<WatchProgress>(key);
  }

  /**
   * Retrieve all saved watch progress entries sorted by last watched desc.
   */
  getAllWatchProgress(): WatchProgress[] {
    const progress: WatchProgress[] = [];
    iterateLocalStorageWithPrefix<WatchProgress>('watch_progress_', (_key, item) => {
      progress.push(item);
    });
    return progress.sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
  }

  /**
   * Start a watching session and persist it.
   * @param contentId - id of content
   * @param contentType - 'movie' or 'tv'
   */
  startWatchingSession(contentId: number, contentType: 'movie' | 'tv'): WatchingSession {
    const session: WatchingSession = {
      id: generateId(),
      contentId,
      contentType,
      startedAt: nowISO(),
      watchTime: 0,
      progress: {
        contentId,
        contentType,
        currentTime: 0,
        duration: 0,
        percentage: 0,
        lastWatched: nowISO()
      },
      quality: '1080p',
      device: navigator.userAgent,
      ipAddress: 'Unknown'
    };

    const sessions = this.getWatchingSessions();
    sessions.push(session);
    lsSet('watching_sessions', sessions);

    return session;
  }

  /**
   * End a watching session by setting endedAt timestamp.
   * @param sessionId - session id string
   */
  endWatchingSession(sessionId: string): void {
    const sessions = this.getWatchingSessions();
    const updatedSessions = sessions.map(session =>
      session.id === sessionId ? { ...session, endedAt: nowISO() } : session
    );
    lsSet('watching_sessions', updatedSessions);
  }

  /**
   * Get all watching sessions.
   */
  getWatchingSessions(): WatchingSession[] {
    const saved = lsGetParsed<WatchingSession[]>('watching_sessions');
    return saved ? saved : [];
  }

  /**
   * Rate a content item and persist the rating.
   * @param contentId - numeric content id
   * @param contentType - 'movie' or 'tv'
   * @param rating - numeric rating
   * @param review - optional review text
   */
  rateContent(contentId: number, contentType: 'movie' | 'tv', rating: number, review?: string): void {
    const contentRating: ContentRating = {
      userId: 'current_user',
      contentId,
      contentType,
      rating,
      review,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };

    const key = `rating_${contentType}_${contentId}`;
    lsSet(key, contentRating);
  }

  /**
   * Get rating for a content item.
   * @param contentId - numeric id
   * @param contentType - 'movie' or 'tv'
   */
  getContentRating(contentId: number, contentType: 'movie' | 'tv'): ContentRating | null {
    const key = `rating_${contentType}_${contentId}`;
    return lsGetParsed<ContentRating>(key);
  }

  /**
   * Retrieve all ratings sorted by creation date desc.
   */
  getAllRatings(): ContentRating[] {
    const ratings: ContentRating[] = [];
    iterateLocalStorageWithPrefix<ContentRating>('rating_', (_key, item) => {
      ratings.push(item);
    });
    return ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Add a new bookmark for content.
   * @param bookmark - bookmark object without id/createdAt
   */
  addBookmark(bookmark: Omit<BookmarkedScene, 'id' | 'createdAt'>): BookmarkedScene {
    const newBookmark: BookmarkedScene = {
      ...bookmark,
      id: generateId(),
      createdAt: nowISO()
    };

    const bookmarks = this.getBookmarks(bookmark.contentId, bookmark.contentType);
    bookmarks.push(newBookmark);

    const key = `bookmarks_${bookmark.contentType}_${bookmark.contentId}`;
    lsSet(key, bookmarks);

    return newBookmark;
  }

  /**
   * Update an existing bookmark by id with partial updates.
   * @param bookmarkId - id of bookmark to update
   * @param updates - partial fields to update
   */
  updateBookmark(bookmarkId: string, updates: Partial<BookmarkedScene>): void {
    iterateLocalStorageWithPrefix<BookmarkedScene[]>('bookmarks_', (key, bookmarks) => {
      const bookmarkIndex = bookmarks.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex !== -1) {
        bookmarks[bookmarkIndex] = { ...bookmarks[bookmarkIndex], ...updates };
        lsSet(key, bookmarks);
      }
    });
  }

  /**
   * Delete a bookmark by id from all bookmark lists.
   * @param bookmarkId - id to delete
   */
  deleteBookmark(bookmarkId: string): void {
    iterateLocalStorageWithPrefix<BookmarkedScene[]>('bookmarks_', (key, bookmarks) => {
      const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      if (filteredBookmarks.length !== bookmarks.length) {
        lsSet(key, filteredBookmarks);
      }
    });
  }

  /**
   * Get bookmarks for a specific content item.
   * @param contentId - content id
   * @param contentType - 'movie' | 'tv'
   */
  getBookmarks(contentId: number, contentType: 'movie' | 'tv'): BookmarkedScene[] {
    const key = `bookmarks_${contentType}_${contentId}`;
    const saved = lsGetParsed<BookmarkedScene[]>(key);
    return saved ? saved : [];
  }

  /**
   * Retrieve all bookmarks across content sorted by createdAt desc.
   */
  getAllBookmarks(): BookmarkedScene[] {
    const bookmarks: BookmarkedScene[] = [];
    iterateLocalStorageWithPrefix<BookmarkedScene[]>('bookmarks_', (_key, items) => {
      bookmarks.push(...items);
    });
    return bookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get stream sources for content.
   * Accepts an optional http client (fetcher) injected for tests or remote calls.
   * @param contentId - id of content
   * @param contentType - 'movie' | 'tv'
   * @param httpFetcher - optional fetcher to retrieve raw stream source payloads
   */
  async getStreamSources(contentId: number, contentType: 'movie' | 'tv', httpFetcher?: HttpFetcher<any>): Promise<StreamSource[]> {
    const fetcher = httpFetcher ?? defaultStreamFetcher;
    try {
      const raw = await fetcher({ contentId, contentType });
      const validated = transformStreamSources(raw, contentId, contentType);
      return validated;
    } catch (err) {
      console.error('getStreamSources: failed to fetch or transform stream sources', err);
      return [];
    }
  }

  /**
   * Get download options for content.
   * @param contentId - id of content
   * @param contentType - 'movie' | 'tv'
   * @param httpFetcher - optional fetcher
   */
  async getDownloadOptions(contentId: number, contentType: 'movie' | 'tv', httpFetcher?: HttpFetcher<any>): Promise<DownloadOption[]> {
    const fetcher = httpFetcher ?? defaultDownloadFetcher;
    try {
      const raw = await fetcher({ contentId, contentType });
      const validated = transformDownloadOptions(raw, contentId, contentType);
      return validated;
    } catch (err) {
      console.error('getDownloadOptions: failed to fetch or transform download options', err);
      return [];
    }
  }

  /**
   * Get torrent sources for content.
   * @param contentId - id of content
   * @param contentType - 'movie' | 'tv'
   * @param httpFetcher - optional fetcher
   */
  async getTorrentSources(contentId: number, contentType: 'movie' | 'tv', httpFetcher?: HttpFetcher<any>): Promise<TorrentSource[]> {
    const fetcher = httpFetcher ?? defaultTorrentFetcher;
    try {
      const raw = await fetcher({ contentId, contentType });
      const validated = transformTorrentSources(raw, contentId, contentType);
      return validated;
    } catch (err) {
      console.error('getTorrentSources: failed to fetch or transform torrent sources', err);
      return [];
    }
  }

  /**
   * Compute watching statistics from sessions.
   */
  getWatchingStats(): {
    totalWatchTime: number;
    averageSession: number;
    mostWatchedType: 'movie' | 'tv';
    favoriteGenres: string[];
  } {
    const sessions = this.getWatchingSessions();
    const totalWatchTime = sessions.reduce((total, session) => total + (session.watchTime || 0), 0);
    const averageSession = sessions.length > 0 ? totalWatchTime / sessions.length : 0;

    const movieSessions = sessions.filter(s => s.contentType === 'movie').length;
    const tvSessions = sessions.filter(s => s.contentType === 'tv').length;
    const mostWatchedType = movieSessions > tvSessions ? 'movie' : 'tv';

    return {
      totalWatchTime,
      averageSession,
      mostWatchedType,
      favoriteGenres: []
    };
  }

  /**
   * Remove old data older than daysOld (default 30 days).
   * @param daysOld - number of days; items older than this will be removed
   */
  cleanupOldData(daysOld: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const sessions = this.getWatchingSessions();
    const recentSessions = sessions.filter(session => new Date(session.startedAt) > cutoffDate);
    lsSet('watching_sessions', recentSessions);

    console.log(`Cleaned up ${sessions.length - recentSessions.length} old watching sessions`);
  }
}

export const watchService = new WatchService();