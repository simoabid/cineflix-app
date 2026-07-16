import { describe, it, expect } from 'vitest';
import {
  limitForInitialPaint,
  nextProgressiveCount,
  hasMoreProgressive,
  progressiveSlice,
  DEFAULT_ROW_ITEM_LIMIT,
  DEFAULT_GRID_BATCH,
} from '../progressiveRender';

describe('progressiveRender (shipped helpers)', () => {
  it('limitForInitialPaint caps arrays without mutating source', () => {
    const source = Array.from({ length: 40 }, (_, i) => i);
    const limited = limitForInitialPaint(source, 16);
    expect(limited).toHaveLength(16);
    expect(limited[0]).toBe(0);
    expect(limited[15]).toBe(15);
    expect(source).toHaveLength(40);
  });

  it('limitForInitialPaint uses DEFAULT_ROW_ITEM_LIMIT', () => {
    const source = Array.from({ length: 50 }, (_, i) => i);
    expect(limitForInitialPaint(source)).toHaveLength(DEFAULT_ROW_ITEM_LIMIT);
  });

  it('limitForInitialPaint handles empty and zero limit', () => {
    expect(limitForInitialPaint([])).toEqual([]);
    expect(limitForInitialPaint([1, 2, 3], 0)).toEqual([]);
  });

  it('nextProgressiveCount grows by batch until total', () => {
    expect(nextProgressiveCount(24, 100, DEFAULT_GRID_BATCH)).toBe(48);
    expect(nextProgressiveCount(90, 100, 24)).toBe(100);
    expect(nextProgressiveCount(100, 100, 24)).toBe(100);
    expect(nextProgressiveCount(0, 0, 24)).toBe(0);
  });

  it('hasMoreProgressive reflects remaining items', () => {
    expect(hasMoreProgressive(24, 50)).toBe(true);
    expect(hasMoreProgressive(50, 50)).toBe(false);
  });

  it('progressiveSlice delegates to limit window', () => {
    expect(progressiveSlice(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
  });
});
