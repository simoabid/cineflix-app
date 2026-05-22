import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// The logoCache module creates a singleton on import, so we must control time
// and localStorage before it initializes
describe('LogoCacheService', () => {
  let logoCache: typeof import('../../services/logoCache').logoCache;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    // Re-import to get a fresh singleton each test
    vi.resetModules();
    const module = await import('../../services/logoCache');
    logoCache = module.logoCache;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setLogo and getLogo', () => {
    it('should store and retrieve a movie logo', () => {
      logoCache.setLogo(550, 'movie', '/fight-club-logo.png');
      const result = logoCache.getLogo(550, 'movie');
      expect(result).not.toBeNull();
      expect(result?.logoPath).toBe('/fight-club-logo.png');
      expect(result?.failed).toBeFalsy();
    });

    it('should store and retrieve a TV show logo', () => {
      logoCache.setLogo(1396, 'tv', '/breaking-bad-logo.png');
      const result = logoCache.getLogo(1396, 'tv');
      expect(result).not.toBeNull();
      expect(result?.logoPath).toBe('/breaking-bad-logo.png');
    });

    it('should store null logos for items without logos', () => {
      logoCache.setLogo(999, 'movie', null);
      const result = logoCache.getLogo(999, 'movie');
      expect(result).not.toBeNull();
      expect(result?.logoPath).toBeNull();
    });

    it('should store failed fetch entries', () => {
      logoCache.setLogo(999, 'movie', null, true);
      const result = logoCache.getLogo(999, 'movie');
      expect(result).not.toBeNull();
      expect(result?.failed).toBe(true);
    });

    it('should differentiate between movie and TV logos with the same id', () => {
      logoCache.setLogo(100, 'movie', '/movie-logo.png');
      logoCache.setLogo(100, 'tv', '/tv-logo.png');
      expect(logoCache.getLogo(100, 'movie')?.logoPath).toBe('/movie-logo.png');
      expect(logoCache.getLogo(100, 'tv')?.logoPath).toBe('/tv-logo.png');
    });
  });

  describe('cache expiration', () => {
    it('should return null for expired entries', () => {
      logoCache.setLogo(550, 'movie', '/logo.png');
      // Advance past 24 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      const result = logoCache.getLogo(550, 'movie');
      expect(result).toBeNull();
    });

    it('should return valid entries within TTL', () => {
      logoCache.setLogo(550, 'movie', '/logo.png');
      // Advance 12 hours (within 24h TTL)
      vi.advanceTimersByTime(12 * 60 * 60 * 1000);
      const result = logoCache.getLogo(550, 'movie');
      expect(result).not.toBeNull();
      expect(result?.logoPath).toBe('/logo.png');
    });
  });

  describe('clearCache', () => {
    it('should clear all entries', () => {
      logoCache.setLogo(1, 'movie', '/a.png');
      logoCache.setLogo(2, 'tv', '/b.png');
      logoCache.clearCache();
      expect(logoCache.getLogo(1, 'movie')).toBeNull();
      expect(logoCache.getLogo(2, 'tv')).toBeNull();
    });

    it('should clear localStorage', () => {
      logoCache.setLogo(1, 'movie', '/a.png');
      logoCache.clearCache();
      expect(localStorage.getItem('cineflix_logo_cache_v1')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return correct size', () => {
      expect(logoCache.getCacheStats().size).toBe(0);
      logoCache.setLogo(1, 'movie', '/a.png');
      logoCache.setLogo(2, 'tv', '/b.png');
      expect(logoCache.getCacheStats().size).toBe(2);
      expect(logoCache.getCacheStats().maxSize).toBe(1000);
    });
  });

  describe('hasLogofailed', () => {
    it('should return true for failed entries', () => {
      logoCache.setLogo(999, 'movie', null, true);
      expect(logoCache.hasLogofailed(999, 'movie')).toBe(true);
    });

    it('should return false for successful entries', () => {
      logoCache.setLogo(550, 'movie', '/logo.png');
      expect(logoCache.hasLogofailed(550, 'movie')).toBe(false);
    });

    it('should return false for non-existent entries', () => {
      expect(logoCache.hasLogofailed(12345, 'movie')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist entries to localStorage', () => {
      logoCache.setLogo(550, 'movie', '/logo.png');
      const stored = localStorage.getItem('cineflix_logo_cache_v1');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed['movie_550']).toBeDefined();
      expect(parsed['movie_550'].logoPath).toBe('/logo.png');
    });
  });
});
