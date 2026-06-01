import { useState, useCallback } from 'react';

import type {
  ScrapeMedia,
  RunOutput,
  FullScraperEvents,
  MetaOutput,
} from '@/lib/providers';
import { usePlayerStore } from '@/stores/player/store';

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status: 'failure' | 'pending' | 'notfound' | 'success' | 'waiting';
  reason?: string;
  error?: unknown;
  percentage: number;
}

export interface ScrapingItems {
  id: string;
  children: string[];
}

export interface UseScrapeReturn {
  startScraping: (
    media: ScrapeMedia,
    options?: {
      sourceOrder?: string[];
      embedOrder?: string[];
      startFromSourceId?: string;
    },
  ) => Promise<RunOutput | null>;
  sources: Record<string, ScrapingSegment>;
  sourceOrder: ScrapingItems[];
  currentSource: string | undefined;
  isScraping: boolean;
}

export interface BuildScrapeOrderOptions {
  mediaKey: string;
  availableSourceIds: string[];
  failedSourcesPerMedia: Record<string, string[]>;
  preferredSourceOrder?: string[];
  startFromSourceId?: string;
}

export interface FilterEmbedOrderOptions {
  mediaKey: string;
  preferredEmbedOrder?: string[];
  failedEmbedsPerMedia: Record<string, Record<string, string[]>>;
}

export function getScrapeMediaKey(media: ScrapeMedia): string {
  if (media.type === 'movie') return `movie-${media.tmdbId}`;
  return `show-${media.tmdbId}-${media.season.tmdbId}-${media.episode.tmdbId}`;
}

export function buildScrapeOrder({
  mediaKey,
  availableSourceIds,
  failedSourcesPerMedia,
  preferredSourceOrder,
  startFromSourceId,
}: BuildScrapeOrderOptions): string[] {
  const failedSources = failedSourcesPerMedia[mediaKey] ?? [];
  const ordered = preferredSourceOrder?.length
    ? [
        ...preferredSourceOrder.filter((id) => availableSourceIds.includes(id)),
        ...availableSourceIds.filter((id) => !preferredSourceOrder.includes(id)),
      ]
    : availableSourceIds;

  let filtered = ordered.filter((id) => !failedSources.includes(id));

  if (startFromSourceId) {
    const startIndex = filtered.indexOf(startFromSourceId);
    if (startIndex !== -1) filtered = filtered.slice(startIndex + 1);
  }

  return filtered;
}

export function filterEmbedOrder({
  mediaKey,
  preferredEmbedOrder,
  failedEmbedsPerMedia,
}: FilterEmbedOrderOptions): string[] | undefined {
  if (!preferredEmbedOrder?.length) return undefined;
  const failedEmbedIds = Object.values(failedEmbedsPerMedia[mediaKey] ?? {}).flat();
  return preferredEmbedOrder.filter((id) => !failedEmbedIds.includes(id));
}

/**
 * Hook that orchestrates the provider scraping pipeline.
 * Manages scraping state (progress, sources, embeds) and provides
 * a startScraping() function to kick off the provider engine.
 *
 * The hook tracks:
 * - Which sources are being tried and their status
 * - Discovered embeds per source
 * - Current active source
 * - Overall scraping progress
 */
export function useScrape(): UseScrapeReturn {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const [isScraping, setIsScraping] = useState(false);

  const buildEvents = useCallback(
    (sourceMetas: MetaOutput[]): FullScraperEvents => ({
      init: (evt) => {
        setSources(
          evt.sourceIds.reduce<Record<string, ScrapingSegment>>((acc, id) => {
            const meta = sourceMetas.find((s) => s.id === id);
            acc[id] = {
              name: meta?.name ?? id,
              id,
              status: 'waiting',
              percentage: 0,
            };
            return acc;
          }, {}),
        );
        setSourceOrder(evt.sourceIds.map((id) => ({ id, children: [] })));
      },
      start: (id) => {
        setCurrentSource(id);
        setSources((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            if (updated[key].status === 'pending') {
              updated[key] = { ...updated[key], status: 'success' };
            }
          });
          if (updated[id]) updated[id] = { ...updated[id], status: 'pending' };
          return updated;
        });
      },
      update: (evt) => {
        setSources((prev) => {
          if (!prev[evt.id]) return prev;
          return {
            ...prev,
            [evt.id]: {
              ...prev[evt.id],
              status: evt.status as ScrapingSegment['status'],
              percentage: evt.percentage,
              reason: evt.reason as string | undefined,
              error: evt.error,
            },
          };
        });
      },
      discoverEmbeds: (evt) => {
        setSources((prev) => {
          const updated = { ...prev };
          evt.embeds.forEach((embed, i) => {
            updated[embed.id] = {
              name: `${evt.sourceId} embed ${i + 1}`,
              id: embed.id,
              embedId: embed.embedScraperId,
              status: 'waiting',
              percentage: 0,
            };
          });
          return updated;
        });
        setSourceOrder((prev) =>
          prev.map((s) =>
            s.id === evt.sourceId
              ? { ...s, children: evt.embeds.map((e) => e.id) }
              : s
          )
        );
      },
    }),
    [],
  );

  const startScraping = useCallback(
    async (
      media: ScrapeMedia,
      options?: {
        sourceOrder?: string[];
        embedOrder?: string[];
        startFromSourceId?: string;
      },
    ): Promise<RunOutput | null> => {
      setIsScraping(true);
      setCurrentSource(undefined);
      setSources({});
      setSourceOrder([]);

      try {
        const { getProviders } = await import('@/lib/providers/factory');
        const providers = getProviders();
        const allSources = providers.listSources();
        const playerState = usePlayerStore.getState();
        const mediaKey = getScrapeMediaKey(media);
        const sourceOrder = buildScrapeOrder({
          mediaKey,
          availableSourceIds: allSources.map((source) => source.id),
          failedSourcesPerMedia: playerState.failedSourcesPerMedia,
          preferredSourceOrder: options?.sourceOrder,
          startFromSourceId:
            options?.startFromSourceId ?? playerState.resumeFromSourceId ?? undefined,
        });
        const embedOrder = filterEmbedOrder({
          mediaKey,
          preferredEmbedOrder: options?.embedOrder,
          failedEmbedsPerMedia: playerState.failedEmbedsPerMedia,
        });
        const events = buildEvents(allSources);

        const output = await providers.runAll({
          media,
          sourceOrder,
          embedOrder,
          events,
        });

        return output;
      } finally {
        setIsScraping(false);
      }
    },
    [buildEvents],
  );

  return {
    startScraping,
    sources,
    sourceOrder,
    currentSource,
    isScraping,
  };
}
