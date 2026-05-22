interface LogoCacheEntry {
  logoPath: string | null;
  timestamp: number;
  failed?: boolean;
}

const STORAGE_KEY = 'cineflix_logo_cache_v1';

class LogoCacheService {
  private cache = new Map<string, LogoCacheEntry>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.loadFromStorage();
  }

  /** Hydrate memory cache from localStorage on startup */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: Record<string, LogoCacheEntry> = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        if (now - entry.timestamp < this.CACHE_DURATION) {
          this.cache.set(key, entry);
        }
      }
    } catch {
      // Corrupt or unavailable — start fresh
      this.cache.clear();
    }
  }

  /** Flush memory cache to localStorage */
  private saveToStorage(): void {
    try {
      const serializable = Object.fromEntries(this.cache.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Storage quota exceeded or unavailable — silently continue with memory-only
    }
  }

  /** Generate cache key for movie/tv show */
  private getCacheKey(id: number, type: 'movie' | 'tv'): string {
    return `${type}_${id}`;
  }

  /** Check if cache entry is valid */
  private isValidEntry(entry: LogoCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  /** Get logo from cache */
  getLogo(id: number, type: 'movie' | 'tv'): LogoCacheEntry | null {
    const key = this.getCacheKey(id, type);
    const entry = this.cache.get(key);
    if (entry && this.isValidEntry(entry)) {
      return entry;
    }
    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /** Set logo in cache and persist */
  setLogo(id: number, type: 'movie' | 'tv', logoPath: string | null, failed = false): void {
    const key = this.getCacheKey(id, type);
    // Manage cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    this.cache.set(key, {
      logoPath,
      timestamp: Date.now(),
      failed
    });
    this.saveToStorage();
  }

  /** Clean up expired and oldest entries */
  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => this.cache.delete(key));
    // If still too large, remove oldest 20%
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
    this.saveToStorage();
  }

  /** Clear all cache */
  clearCache(): void {
    this.cache.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }

  /** Get cache stats */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /** Preload logos for a batch of content */
  async preloadLogos(items: Array<{ id: number; type: 'movie' | 'tv' }>): Promise<void> {
    const uncachedItems = items.filter(item => !this.getLogo(item.id, item.type));
    if (uncachedItems.length === 0) return;
    // Import tmdb service dynamically to avoid circular dependencies
    const { getMovieDetails, getTVShowDetails } = await import('./tmdb');
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < uncachedItems.length; i += batchSize) {
      const batch = uncachedItems.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const details = item.type === 'movie'
              ? await getMovieDetails(item.id)
              : await getTVShowDetails(item.id);
            this.setLogo(item.id, item.type, details.logo_path || null);
          } catch {
            this.setLogo(item.id, item.type, null, true);
          }
        })
      );
      // Small delay between batches
      if (i + batchSize < uncachedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /** Check if logo loading failed previously */
  hasLogofailed(id: number, type: 'movie' | 'tv'): boolean {
    const entry = this.getLogo(id, type);
    return entry?.failed === true;
  }
}

// Export singleton instance
export const logoCache = new LogoCacheService();
export default logoCache;
 