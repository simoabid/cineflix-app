/**
 * Progressive list/grid rendering helpers.
 * Pure functions so unit tests exercise the real shipped modules.
 */

export const DEFAULT_ROW_ITEM_LIMIT = 16;
export const DEFAULT_GRID_INITIAL = 24;
export const DEFAULT_GRID_BATCH = 24;

/**
 * Cap a list for initial row/grid paint (network + DOM budget).
 */
export function limitForInitialPaint<T>(
  items: readonly T[],
  limit: number = DEFAULT_ROW_ITEM_LIMIT
): T[] {
  if (!items || items.length === 0) return [];
  if (limit <= 0) return [];
  return items.slice(0, Math.min(limit, items.length));
}

/**
 * Next progressive window size when the user approaches the end of a list.
 */
export function nextProgressiveCount(
  current: number,
  total: number,
  batch: number = DEFAULT_GRID_BATCH
): number {
  if (total <= 0) return 0;
  if (current >= total) return total;
  return Math.min(current + batch, total);
}

/**
 * Whether more items remain after the currently revealed window.
 */
export function hasMoreProgressive(current: number, total: number): boolean {
  return current < total;
}

/**
 * Slice items for a progressive window [0, count).
 */
export function progressiveSlice<T>(
  items: readonly T[],
  count: number
): T[] {
  return limitForInitialPaint(items, count);
}
