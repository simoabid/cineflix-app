import type { PlayerMeta } from '@/stores/player/slices/source';

export function scrapeSourceOutputToProviderMetric(
  meta: PlayerMeta,
  sourceId: string | null,
  embedId: string | null,
  status: 'success' | 'failed' | 'notfound',
  error: unknown,
) {
  return {
    media: meta,
    sourceId,
    embedId,
    status,
    error: error instanceof Error ? error.message : null,
  };
}

export function useReportProviders() {
  return {
    report(..._metrics: unknown[]) {
      // Provider metrics are backend-specific in P-Stream. Cineflix keeps this
      // hook as a no-op so manual source selection can share the original UI.
    },
  };
}
