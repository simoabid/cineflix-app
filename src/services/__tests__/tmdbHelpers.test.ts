import { describe, it, expect } from 'vitest';
import { getImageUrl, getPosterUrl, getBackdropUrl, getLogoUrl } from '../../services/tmdb';

describe('TMDB Image URL Helpers', () => {
  describe('getImageUrl', () => {
    it('should return a valid image URL with default size', () => {
      const url = getImageUrl('/abc123.jpg');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
    });

    it('should return a valid image URL with custom size', () => {
      const url = getImageUrl('/abc123.jpg', 'original');
      expect(url).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
    });

    it('should return empty string for null path', () => {
      expect(getImageUrl(null)).toBe('');
    });

    it('should return empty string for empty path', () => {
      expect(getImageUrl('')).toBe('');
    });
  });

  describe('getPosterUrl', () => {
    it('should return a poster URL for valid path', () => {
      const url = getPosterUrl('/poster.jpg');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    });

    it('should return SVG data URI fallback for null path', () => {
      const url = getPosterUrl(null);
      expect(url).toContain('data:image/svg+xml;base64,');
    });

    it('should accept custom size', () => {
      const url = getPosterUrl('/poster.jpg', 'w780');
      expect(url).toBe('https://image.tmdb.org/t/p/w780/poster.jpg');
    });
  });

  describe('getBackdropUrl', () => {
    it('should return a backdrop URL with default w1280', () => {
      const url = getBackdropUrl('/backdrop.jpg');
      expect(url).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    });

    it('should return SVG data URI fallback for null path', () => {
      const url = getBackdropUrl(null);
      expect(url).toContain('data:image/svg+xml;base64,');
    });
  });

  describe('getLogoUrl', () => {
    it('should return a logo URL with default w300', () => {
      const url = getLogoUrl('/logo.png');
      expect(url).toBe('https://image.tmdb.org/t/p/w300/logo.png');
    });

    it('should return empty string for null path', () => {
      expect(getLogoUrl(null)).toBe('');
    });
  });
});
