import { CollectionDetails, FranchiseProgress, MarathonSession } from '../types';

const COLLECTIONS_STORAGE_KEY = 'cineflix_collections_progress';
const MARATHON_STORAGE_KEY = 'cineflix_marathon_sessions';

/**
 * Safely parse JSON from a storage string.
 * Returns null on parse failure or when input is null.
 * Exported for testability.
 * @template T
 * @param {string | null} value
 * @returns {T | null}
 */
export function safeParse<T>(value: string | null): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    // Keep parsing failures predictable for callers
    // and allow tests to assert on null returns.
    // eslint-disable-next-line no-console
    console.error('safeParse: failed to parse value', error);
    return null;
  }
}

/**
 * Pure transform that augments a CollectionDetails object with user progress metadata.
 * Exported for testability.
 * @param {CollectionDetails} collection
 * @param {{ [collectionId: number]: FranchiseProgress }} allProgress
 * @returns {CollectionDetails}
 */
export function transformCollectionWithProgress(
  collection: CollectionDetails,
  allProgress: { [collectionId: number]: FranchiseProgress }
): CollectionDetails {
  const progress = allProgress[collection.id] || null;
  const completion = progress && typeof progress.completion_percentage === 'number'
    ? progress.completion_percentage
    : 0;

  return {
    ...collection,
    user_progress: progress,
    completion_progress: completion
  };
}

/**
 * Pure computation of aggregated collection statistics from stored progress.
 * Exported for testability.
 * @param {{ [collectionId: number]: FranchiseProgress }} allProgress
 * @returns {{
 *   totalCollections: number;
 *   completedCollections: number;
 *   inProgressCollections: number;
 *   totalWatchTime: number;
 *   averageCompletion: number;
 * }}
 */
export function computeCollectionStats(allProgress: { [collectionId: number]: FranchiseProgress }) {
  const progressValues = Object.values(allProgress || {});

  const completed = progressValues.filter(p => p && p.completion_percentage === 100).length;
  const inProgress = progressValues.filter(p => p && p.completion_percentage > 0 && p.completion_percentage < 100).length;

  const totalWatchTime = progressValues.reduce((total, p) => {
    if (!p) return total;
    const totalFilms = typeof p.total_films === 'number' && p.total_films > 0 ? p.total_films : 0;
    const completion = typeof p.completion_percentage === 'number' ? p.completion_percentage : 0;
    // Estimate 2h per film
    return total + (totalFilms * (completion / 100) * 120);
  }, 0);

  const averageCompletion = progressValues.length > 0
    ? progressValues.reduce((sum, p) => sum + (p?.completion_percentage || 0), 0) / progressValues.length
    : 0;

  return {
    totalCollections: progressValues.length,
    completedCollections: completed,
    inProgressCollections: inProgress,
    totalWatchTime: Math.round(totalWatchTime),
    averageCompletion: Math.round(averageCompletion)
  };
}

export class CollectionsService {
  /**
   * Retrieve stored franchise progress from localStorage with error handling.
   * Returns an object mapping collection IDs to FranchiseProgress or an empty object on failure.
   */
  private static getStoredProgress(): { [collectionId: number]: FranchiseProgress } {
    try {
      const stored = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      const parsed = safeParse<{ [collectionId: number]: FranchiseProgress }>(stored);
      return parsed || {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('getStoredProgress: error reading progress from storage', error);
      return {};
    }
  }

  /**
   * Persist franchise progress into localStorage with error handling.
   */
  private static saveProgress(progress: { [collectionId: number]: FranchiseProgress }): void {
    try {
      localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('saveProgress: failed to save progress to storage', error);
    }
  }

  /**
   * Retrieve stored marathon sessions from localStorage with error handling.
   * Returns an object mapping collection IDs to MarathonSession or an empty object on failure.
   */
  private static getStoredSessions(): { [collectionId: number]: MarathonSession } {
    try {
      const stored = localStorage.getItem(MARATHON_STORAGE_KEY);
      const parsed = safeParse<{ [collectionId: number]: MarathonSession }>(stored);
      return parsed || {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('getStoredSessions: error reading sessions from storage', error);
      return {};
    }
  }

  /**
   * Persist marathon sessions into localStorage with error handling.
   */
  private static saveSessions(sessions: { [collectionId: number]: MarathonSession }): void {
    try {
      localStorage.setItem(MARATHON_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('saveSessions: failed to save sessions to storage', error);
    }
  }

  // Progress tracking methods
  static markFilmWatched(collectionId: number, filmId: number): void {
    const allProgress = this.getStoredProgress();
    const progress: FranchiseProgress = allProgress[collectionId] || {
      watched_films: [],
      total_films: 0,
      completion_percentage: 0,
      viewing_order: 'release' as const
    };

    if (!Array.isArray(progress.watched_films)) {
      progress.watched_films = [];
    }

    if (!progress.watched_films.includes(filmId)) {
      progress.watched_films.push(filmId);
      const totalFilms = typeof progress.total_films === 'number' && progress.total_films > 0 ? progress.total_films : 0;
      progress.completion_percentage = totalFilms > 0 ? (progress.watched_films.length / totalFilms) * 100 : 0;
      progress.last_watched = new Date().toISOString();
    }

    allProgress[collectionId] = progress;
    this.saveProgress(allProgress);
  }

  static markFilmUnwatched(collectionId: number, filmId: number): void {
    const allProgress = this.getStoredProgress();
    const progress = allProgress[collectionId];

    if (progress && Array.isArray(progress.watched_films)) {
      progress.watched_films = progress.watched_films.filter(id => id !== filmId);
      const totalFilms = typeof progress.total_films === 'number' && progress.total_films > 0 ? progress.total_films : 0;
      progress.completion_percentage = totalFilms > 0 ? (progress.watched_films.length / totalFilms) * 100 : 0;
      allProgress[collectionId] = progress;
      this.saveProgress(allProgress);
    }
  }

  static getFranchiseProgress(collectionId: number): FranchiseProgress | null {
    const allProgress = this.getStoredProgress();
    return allProgress[collectionId] || null;
  }

  static initializeFranchiseProgress(collection: CollectionDetails): FranchiseProgress {
    const allProgress = this.getStoredProgress();

    if (!allProgress[collection.id]) {
      const progress: FranchiseProgress = {
        watched_films: [],
        total_films: collection.film_count,
        completion_percentage: 0,
        viewing_order: 'release',
        current_film: collection.parts[0],
        next_film: collection.parts[1]
      };

      allProgress[collection.id] = progress;
      this.saveProgress(allProgress);
      return progress;
    }

    return allProgress[collection.id];
  }

  static updateViewingOrder(collectionId: number, order: 'release' | 'chronological'): void {
    const allProgress = this.getStoredProgress();
    const progress = allProgress[collectionId];

    if (progress) {
      progress.viewing_order = order;
      allProgress[collectionId] = progress;
      this.saveProgress(allProgress);
    }
  }

  // Marathon session methods
  static startMarathonSession(collection: CollectionDetails, viewingOrder: 'release' | 'chronological' = 'release'): MarathonSession {
    const sessions = this.getStoredSessions();

    const session: MarathonSession = {
      collection_id: collection.id,
      current_film_index: 0,
      viewing_order: viewingOrder,
      started_at: new Date().toISOString(),
      completed_films: [],
      total_runtime_watched: 0,
      breaks_taken: 0
    };

    sessions[collection.id] = session;
    this.saveSessions(sessions);

    // Initialize progress if not exists
    this.initializeFranchiseProgress(collection);

    return session;
  }

  static getMarathonSession(collectionId: number): MarathonSession | null {
    const sessions = this.getStoredSessions();
    return sessions[collectionId] || null;
  }

  static updateMarathonProgress(collectionId: number, filmIndex: number, runtime: number): void {
    const sessions = this.getStoredSessions();
    const session = sessions[collectionId];

    if (session) {
      session.current_film_index = filmIndex;
      session.total_runtime_watched = (typeof session.total_runtime_watched === 'number' ? session.total_runtime_watched : 0) + (typeof runtime === 'number' ? runtime : 0);
      sessions[collectionId] = session;
      this.saveSessions(sessions);
    }
  }

  static pauseMarathonSession(collectionId: number): void {
    const sessions = this.getStoredSessions();
    const session = sessions[collectionId];

    if (session) {
      session.paused_at = new Date().toISOString();
      sessions[collectionId] = session;
      this.saveSessions(sessions);
    }
  }

  static resumeMarathonSession(collectionId: number): void {
    const sessions = this.getStoredSessions();
    const session = sessions[collectionId];

    if (session) {
      delete session.paused_at;
      sessions[collectionId] = session;
      this.saveSessions(sessions);
    }
  }

  static completeMarathonSession(collectionId: number): void {
    const sessions = this.getStoredSessions();
    delete sessions[collectionId];
    this.saveSessions(sessions);
  }

  // Statistics and analytics
  static getCollectionStats(): {
    totalCollections: number;
    completedCollections: number;
    inProgressCollections: number;
    totalWatchTime: number;
    averageCompletion: number;
  } {
    const allProgress = this.getStoredProgress();
    return computeCollectionStats(allProgress);
  }

  static getRecommendedCollections(collections: CollectionDetails[]): CollectionDetails[] {
    const allProgress = this.getStoredProgress();

    // Get user's preferred genres from completed collections
    const completedCollections = Object.entries(allProgress)
      .filter(([_, progress]) => progress && progress.completion_percentage === 100)
      .map(([id]) => parseInt(id, 10));

    const preferredGenres = new Set<string>();
    collections.forEach(collection => {
      if (completedCollections.includes(collection.id)) {
        (collection.genre_categories || []).forEach(genre => preferredGenres.add(genre));
      }
    });

    // Recommend collections with similar genres that aren't completed
    return collections
      .filter(collection => {
        const progress = allProgress[collection.id];
        return !progress || progress.completion_percentage < 100;
      })
      .filter(collection => {
        return (collection.genre_categories || []).some(genre => preferredGenres.has(genre));
      })
      .slice(0, 6);
  }

  static getContinueWatching(collections: CollectionDetails[]): CollectionDetails[] {
    const allProgress = this.getStoredProgress();

    return collections
      .filter(collection => {
        const progress = allProgress[collection.id];
        return progress && progress.completion_percentage > 0 && progress.completion_percentage < 100;
      })
      .sort((a, b) => {
        const progressA = allProgress[a.id];
        const progressB = allProgress[b.id];
        const dateA = new Date(progressA?.last_watched || '').getTime();
        const dateB = new Date(progressB?.last_watched || '').getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, 6);
  }

  // Utility methods
  static enhanceCollectionsWithProgress(collections: CollectionDetails[]): CollectionDetails[] {
    const allProgress = this.getStoredProgress();

    return collections.map(collection => transformCollectionWithProgress(collection, allProgress));
  }

  static exportProgressData(): string {
    try {
      const progress = this.getStoredProgress();
      const sessions = this.getStoredSessions();

      return JSON.stringify({
        progress,
        sessions,
        exportedAt: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('exportProgressData: failed to export data', error);
      return JSON.stringify({ progress: {}, sessions: {}, exportedAt: new Date().toISOString() }, null, 2);
    }
  }

  static importProgressData(data: string): boolean {
    try {
      const parsed = safeParse<any>(data);
      if (!parsed || typeof parsed !== 'object') return false;

      if (parsed.progress && typeof parsed.progress === 'object') {
        this.saveProgress(parsed.progress);
      }
      if (parsed.sessions && typeof parsed.sessions === 'object') {
        this.saveSessions(parsed.sessions);
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('importProgressData: Error importing progress data:', error);
      return false;
    }
  }
}

export default CollectionsService;