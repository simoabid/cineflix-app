import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FALLBACK_POSTER,
  FALLBACK_BACKDROP,
  getImageUrlWithFallback,
  isValidImageUrl,
  isImageCached,
  cacheImage,
  preloadImage,
  createLazyLoader,
} from '../imageLoader';

describe('Constants', () => {
  it('should define FALLBACK_POSTER', () => {
    expect(FALLBACK_POSTER).toBe('/fallback-poster.jpg');
  });

  it('should define FALLBACK_BACKDROP', () => {
    expect(FALLBACK_BACKDROP).toBe('/fallback-backdrop.jpg');
  });
});

describe('getImageUrlWithFallback', () => {
  it('should return TMDB URL for valid poster path', () => {
    const url = getImageUrlWithFallback('/poster.jpg');
    expect(url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
  });

  it('should use custom size', () => {
    const url = getImageUrlWithFallback('/img.jpg', 'w780');
    expect(url).toBe('https://image.tmdb.org/t/p/w780/img.jpg');
  });

  it('should return fallback poster for null path', () => {
    expect(getImageUrlWithFallback(null)).toBe(FALLBACK_POSTER);
  });

  it('should return fallback backdrop for null path with type backdrop', () => {
    expect(getImageUrlWithFallback(null, 'w500', 'backdrop')).toBe(FALLBACK_BACKDROP);
  });

  it('should return fallback poster for null path with type poster', () => {
    expect(getImageUrlWithFallback(null, 'w500', 'poster')).toBe(FALLBACK_POSTER);
  });

  it('should default to poster type', () => {
    expect(getImageUrlWithFallback(null)).toBe(FALLBACK_POSTER);
  });
});

describe('isValidImageUrl', () => {
  it('should accept http URLs', () => {
    expect(isValidImageUrl('http://example.com/img.jpg')).toBe(true);
  });

  it('should accept https URLs', () => {
    expect(isValidImageUrl('https://example.com/img.jpg')).toBe(true);
  });

  it('should reject URLs without http prefix', () => {
    expect(isValidImageUrl('/local/path.jpg')).toBe(false);
  });

  it('should reject URLs containing "null"', () => {
    expect(isValidImageUrl('https://example.com/null.jpg')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidImageUrl('')).toBe(false);
  });
});

describe('Image cache', () => {
  beforeEach(() => {
    // Clear the cache between tests
    // The cache is a module-level Set, so we test its behavior as-is
  });

  it('should track cached images', () => {
    const uniqueUrl = `https://test-${Date.now()}.jpg`;
    expect(isImageCached(uniqueUrl)).toBe(false);
    cacheImage(uniqueUrl);
    expect(isImageCached(uniqueUrl)).toBe(true);
  });

  it('should not report uncached images as cached', () => {
    expect(isImageCached('https://definitely-not-cached.jpg')).toBe(false);
  });
});

describe('preloadImage', () => {
  it('should resolve when image loads', async () => {
    let capturedOnload: (() => void) | null = null;
    class MockImage {
      src = '';
      set onload(fn: (() => void) | null) { capturedOnload = fn; }
      get onload() { return capturedOnload; }
      set onerror(_fn: any) {}
    }
    vi.stubGlobal('Image', MockImage);

    const promise = preloadImage('https://example.com/img.jpg');
    capturedOnload!();

    const result = await promise;
    expect(result).toBe('https://example.com/img.jpg');

    vi.unstubAllGlobals();
  });

  it('should reject when image fails to load', async () => {
    let capturedOnerror: (() => void) | null = null;
    class MockImage {
      src = '';
      set onload(_fn: any) {}
      set onerror(fn: (() => void) | null) { capturedOnerror = fn; }
    }
    vi.stubGlobal('Image', MockImage);

    const promise = preloadImage('https://example.com/broken.jpg');
    capturedOnerror!();

    await expect(promise).rejects.toThrow('Failed to load image');

    vi.unstubAllGlobals();
  });
});

describe('createLazyLoader', () => {
  it('should return null when IntersectionObserver is not available', () => {
    const original = (globalThis as any).IntersectionObserver;
    delete (globalThis as any).IntersectionObserver;

    const loader = createLazyLoader();
    expect(loader).toBeNull();

    (globalThis as any).IntersectionObserver = original;
  });

  it('should return an IntersectionObserver when available', () => {
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(_callback: any) {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const loader = createLazyLoader();
    expect(loader).not.toBeNull();

    vi.unstubAllGlobals();
  });
});
