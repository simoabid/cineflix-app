/**
 * Scrape priority — best providers first, worst last.
 *
 * Keep CinePro ids in sync with `cineflix-core/src/providerPriority.ts`.
 * Used by progressive waterfall (useScrape) so TTFP prefers fast/reliable hosts.
 *
 * Source: EC2 diagnostic test-all (reliability + latency), 2026-07.
 */

export type ScrapeTier = "S" | "A" | "B" | "C";

export type PriorityEntry = {
  id: string;
  tier: ScrapeTier;
  /** Soft timeout hint for UI / future hard cancel (ms). */
  timeoutMs: number;
};

/**
 * CinePro Core provider ids (server scrapers), best → worst.
 * Ids must match BaseProvider.id in cineflix-core.
 */
export const CINEPRO_PROVIDER_PRIORITY: readonly PriorityEntry[] = [
  // Preferred product order (UI + progressive waterfall)
  { id: "vidsrc", tier: "S", timeoutMs: 12_000 },
  { id: "hexa", tier: "S", timeoutMs: 15_000 },
  { id: "vidlink", tier: "S", timeoutMs: 10_000 },
  { id: "fsharetv", tier: "A", timeoutMs: 12_000 },
  { id: "lookmovie", tier: "A", timeoutMs: 15_000 },
  { id: "Icefy", tier: "A", timeoutMs: 12_000 },
  { id: "Peachify", tier: "B", timeoutMs: 15_000 },
  { id: "m111movies", tier: "A", timeoutMs: 22_000 },
  { id: "vixsrc", tier: "C", timeoutMs: 15_000 },
  // Remaining providers (previous relative order)
  { id: "vidup", tier: "S", timeoutMs: 8_000 },
  { id: "vidrock", tier: "A", timeoutMs: 12_000 },
  { id: "vidcore", tier: "A", timeoutMs: 15_000 },
  { id: "vidnest", tier: "B", timeoutMs: 25_000 },
  { id: "vidking", tier: "B", timeoutMs: 18_000 },
  { id: "Videasy", tier: "B", timeoutMs: 35_000 },
] as const;

/**
 * Client P-Stream source ids (browser engine), best → worst when used as fallback.
 * Only ids that exist in the factory registry matter; others are ignored.
 */
export const PSTREAM_SOURCE_PRIORITY: readonly PriorityEntry[] = [
  { id: "vidsrc", tier: "S", timeoutMs: 12_000 },
  { id: "vidsrcsc", tier: "S", timeoutMs: 12_000 },
  { id: "vidsrcvip", tier: "A", timeoutMs: 12_000 },
  { id: "autoembed", tier: "A", timeoutMs: 12_000 },
  { id: "multiembed", tier: "A", timeoutMs: 12_000 },
  { id: "embedsu", tier: "A", timeoutMs: 12_000 },
  { id: "fsharetv", tier: "A", timeoutMs: 12_000 },
  { id: "lookmovie", tier: "A", timeoutMs: 15_000 },
  { id: "dopebox", tier: "B", timeoutMs: 15_000 },
  { id: "soapertv", tier: "B", timeoutMs: 15_000 },
  { id: "primewire", tier: "B", timeoutMs: 15_000 },
  { id: "mp4hydra", tier: "B", timeoutMs: 15_000 },
  { id: "streambox", tier: "C", timeoutMs: 15_000 },
  { id: "zoechip", tier: "C", timeoutMs: 15_000 },
] as const;

function indexMap(entries: readonly PriorityEntry[]): Map<string, number> {
  return new Map(entries.map((e, i) => [e.id, i]));
}

const cineproIndex = indexMap(CINEPRO_PROVIDER_PRIORITY);
const pstreamIndex = indexMap(PSTREAM_SOURCE_PRIORITY);

export function sortIdsByPriority(
  ids: string[],
  kind: "cinepro" | "pstream",
  preferredOrder?: string[],
): string[] {
  const map = kind === "cinepro" ? cineproIndex : pstreamIndex;
  const preferred = preferredOrder?.length
    ? preferredOrder.filter((id) => ids.includes(id))
    : [];
  const rest = ids.filter((id) => !preferred.includes(id));
  rest.sort((a, b) => {
    const ia = map.get(a) ?? 10_000;
    const ib = map.get(b) ?? 10_000;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
  return [...preferred, ...rest];
}

export function cineproPriorityOrder(
  availableIds: string[],
  disabledIds: string[] = [],
  preferredOrder?: string[],
): string[] {
  const disabled = new Set(disabledIds);
  const available = availableIds.filter((id) => !disabled.has(id));
  return sortIdsByPriority(available, "cinepro", preferredOrder);
}

export function pstreamPriorityOrder(
  availableIds: string[],
  preferredOrder?: string[],
): string[] {
  return sortIdsByPriority(availableIds, "pstream", preferredOrder);
}
