import { useState, useCallback } from 'react';

import type {
  ScrapeMedia,
  RunOutput,
  FullScraperEvents,
  MetaOutput,
} from '@/lib/providers';
import { usePlayerStore } from '@/stores/player/store';
import { useCineProStore, CineProCachedStream } from '@/stores/cinepro';
import { fetchCineProStreams, mapScrapeMediaToRequest, mapCineProResultToStreamsWithMeta, mapQuality } from '@/services/cinepro-adapter';
import { Stream } from '@/lib/providers/engine';

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
 * Extracts the underlying URL from a CinePro proxy-wrapped URL.
 * CinePro routes all streams through its proxy, so the URL format is:
 *   http://localhost:3005/proxy?url=https%3A%2F%2Foriginal.com%2Fstream.m3u8
 * This helper returns the original URL for accurate dedup comparison.
 */
function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const proxiedUrl = parsed.searchParams.get('url');
    return proxiedUrl ? decodeURIComponent(proxiedUrl) : url;
  } catch {
    return url;
  }
}

/**
 * Checks if two streams point to the same underlying source.
 * Handles CinePro proxy URLs by extracting the original URL before comparing.
 */
function isDuplicateStream(s1: Stream, s2: Stream): boolean {
  if (s1.type === 'hls' && s2.type === 'hls') {
    return extractBaseUrl(s1.playlist) === extractBaseUrl(s2.playlist);
  }
  if (s1.type === 'file' && s2.type === 'file') {
    const urls1 = Object.values(s1.qualities).map((f) => f?.url ? extractBaseUrl(f.url) : '').filter(Boolean);
    const urls2 = Object.values(s2.qualities).map((f) => f?.url ? extractBaseUrl(f.url) : '').filter(Boolean);
    return urls1.some((u) => urls2.includes(u));
  }
  return false;
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
        const isCineProEnabled = useCineProStore.getState().isEnabled;
        const initialSources = evt.sourceIds.reduce<Record<string, ScrapingSegment>>((acc, id) => {
          const meta = sourceMetas.find((s) => s.id === id);
          acc[id] = {
            name: meta?.name ?? id,
            id,
            status: 'waiting',
            percentage: 0,
          };
          return acc;
        }, {});

        if (isCineProEnabled) {
          initialSources['cinepro'] = {
            name: 'CinePro Core (Server)',
            id: 'cinepro',
            status: 'waiting',
            percentage: 0,
          };
        }

        setSources(initialSources);

        const initialOrder = evt.sourceIds.map((id) => ({ id, children: [] }));
        if (isCineProEnabled) {
          initialOrder.push({ id: 'cinepro', children: [] });
        }
        setSourceOrder(initialOrder);
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

        const isCineProEnabled = useCineProStore.getState().isEnabled;
        const disabledProviderIds = useCineProStore.getState().disabledProviderIds;

        const cineproPromise = isCineProEnabled
          ? (async () => {
              setSources((prev) => {
                const updated = { ...prev };
                if (updated['cinepro']) {
                  updated['cinepro'] = {
                    ...updated['cinepro'],
                    status: 'pending',
                    percentage: 10,
                  };
                }
                return updated;
              });

              try {
                const req = mapScrapeMediaToRequest(media);
                const serverUrl = useCineProStore.getState().serverUrl;
                const res = await fetchCineProStreams(req, serverUrl);
                
                // Filter out disabled providers
                const activeSources = res.sources.filter(
                  (src) => !disabledProviderIds.includes(src.provider.id)
                );

                setSources((prev) => {
                  const updated = { ...prev };
                  if (updated['cinepro']) {
                    updated['cinepro'] = {
                      ...updated['cinepro'],
                      status: activeSources.length > 0 ? 'success' : 'notfound',
                      percentage: 100,
                    };
                  }
                  return updated;
                });

                return mapCineProResultToStreamsWithMeta(activeSources, res.subtitles);
              } catch (err) {
                if (import.meta.env.DEV) {
                  console.error('[useScrape] CinePro scraping failed:', err);
                }
                setSources((prev) => {
                  const updated = { ...prev };
                  if (updated['cinepro']) {
                    updated['cinepro'] = {
                      ...updated['cinepro'],
                      status: 'failure',
                      percentage: 100,
                      reason: err instanceof Error ? err.message : 'Failed',
                    };
                  }
                  return updated;
                });
                return null;
              }
            })()
          : Promise.resolve(null);

        const [pstreamResult, cineproResult] = await Promise.all([
          providers.runAll({
            media,
            sourceOrder,
            embedOrder,
            events,
          }).catch((err) => {
            if (import.meta.env.DEV) {
              console.error('P-Stream scraping failed:', err);
            }
            return null;
          }),
          cineproPromise
        ]);

        // Build CinePro cached streams from the enriched metadata (C-4 fix)
        let cachedStreams: CineProCachedStream[] = [];
        if (cineproResult && cineproResult.length > 0) {
          cachedStreams = cineproResult.map((mapped) => ({
            sourceId: `cinepro-${mapped.providerId}`,
            providerName: mapped.providerName,
            stream: mapped.stream,
            quality: mapped.quality,
          }));
        }

        // Deduplicate CinePro streams against P-Stream result (H-3 fix)
        if (pstreamResult?.stream && cachedStreams.length > 0) {
          cachedStreams = cachedStreams.filter(
            (c) => !isDuplicateStream(pstreamResult.stream, c.stream)
          );
        }

        // Persist the deduplicated CinePro streams
        if (cachedStreams.length > 0) {
          useCineProStore.getState().setScrapedStreams(cachedStreams);
        } else {
          useCineProStore.getState().clearScrapedStreams();
        }

        // Determine which stream to return
        const preferCinePro = useCineProStore.getState().preferCinePro;

        // Quality weights for sorting (M-5: sort AFTER dedup)
        const qualityWeight: Record<string, number> = {
          '4k': 5,
          '1080': 4,
          '720': 3,
          '480': 2,
          '360': 1,
          'unknown': 0,
        };

        const sortedCinePro = [...cachedStreams].sort((a, b) => {
          const qA = mapQuality(a.quality);
          const qB = mapQuality(b.quality);
          return (qualityWeight[qB] ?? 0) - (qualityWeight[qA] ?? 0);
        });

        // 1. If preferCinePro is true, and we have CinePro streams, play CinePro first
        if (preferCinePro && sortedCinePro.length > 0) {
          const bestCinePro = sortedCinePro[0];
          return {
            sourceId: bestCinePro.sourceId,
            stream: bestCinePro.stream,
          };
        }

        // 2. Otherwise play P-Stream if it found something
        if (pstreamResult) {
          return pstreamResult;
        }

        // 3. Fallback to CinePro if P-Stream failed
        if (sortedCinePro.length > 0) {
          const bestCinePro = sortedCinePro[0];
          return {
            sourceId: bestCinePro.sourceId,
            stream: bestCinePro.stream,
          };
        }

        return null;
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
