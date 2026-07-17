/**
 * Shared progressive waterfall: try ids best→worst, stop on first success.
 * Used by useScrape (CinePro phase) so TTFP does not fan out all providers.
 */

export type WaterfallResult<T> = {
  id: string;
  value: T;
  /** How many tryOne calls were made (includes the successful one). */
  attempts: number;
};

/**
 * Sequentially invoke `tryOne` for each id. Returns on the first non-null
 * result without calling later ids.
 */
export async function waterfallFirstSuccess<T>(
  ids: readonly string[],
  tryOne: (id: string) => Promise<T | null | undefined>,
): Promise<WaterfallResult<T> | null> {
  let attempts = 0;
  for (const id of ids) {
    attempts += 1;
    const value = await tryOne(id);
    if (value != null) {
      return { id, value, attempts };
    }
  }
  return null;
}
