import { describe, it, expect } from 'vitest';
import { resolveNewPopularSectionMount } from '../NewPopularPage';

describe('resolveNewPopularSectionMount (shipped New & Popular policy)', () => {
  it('skips empty or missing items so no LazySection shell is reserved', () => {
    expect(resolveNewPopularSectionMount('newReleases', [])).toBe('skip');
    expect(resolveNewPopularSectionMount('newReleases', null)).toBe('skip');
    expect(resolveNewPopularSectionMount('newReleases', undefined)).toBe('skip');
    expect(resolveNewPopularSectionMount('trendingNow', [])).toBe('skip');
  });

  it('mounts trendingNow eagerly when it has items (not by object index)', () => {
    expect(resolveNewPopularSectionMount('trendingNow', [{ id: 1 }])).toBe('eager');
  });

  it('lazy-gates non-trending sections that have items', () => {
    expect(resolveNewPopularSectionMount('newReleases', [{ id: 1 }])).toBe('lazy');
    expect(resolveNewPopularSectionMount('comingSoon', [{ id: 2 }])).toBe('lazy');
    expect(resolveNewPopularSectionMount('top10Movies', [{ id: 3 }])).toBe('lazy');
  });

  it('does not treat the first object-key as eager (newReleases is not special)', () => {
    // Object.entries order has newReleases first in state — policy must key on name
    const sectionOrder = [
      'newReleases',
      'trendingNow',
      'comingSoon',
      'top10Movies',
      'top10TV',
      'recentlyAddedMovies',
      'recentlyAddedTV',
    ] as const;

    const withItems = sectionOrder.map((key) => ({
      key,
      mount: resolveNewPopularSectionMount(key, [{ id: 1 }]),
    }));

    expect(withItems.find((s) => s.key === 'newReleases')?.mount).toBe('lazy');
    expect(withItems.find((s) => s.key === 'trendingNow')?.mount).toBe('eager');
    expect(withItems.filter((s) => s.mount === 'eager')).toHaveLength(1);
  });
});
