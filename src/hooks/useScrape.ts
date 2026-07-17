import { useState, useCallback } from "react";

import type {
  ScrapeMedia,
  RunOutput,
  FullScraperEvents,
  MetaOutput,
} from "@/lib/providers";
import { usePlayerStore } from "@/stores/player/store";
import { useCineProStore, CineProCachedStream } from "@/stores/cinepro";
import {
  fetchCineProProviderStreams,
  fetchCineProProviders,
} from "@/services/cinepro-adapter/client";
import {
  mapScrapeMediaToRequest,
  mapCineProResultToStreamsWithMeta,
  mapQuality,
} from "@/services/cinepro-adapter/mapper";
import { Stream } from "@/lib/providers/engine";
import {
  cineproPriorityOrder,
  pstreamPriorityOrder,
} from "@/config/scrapePriority";
import { waterfallFirstSuccess } from "@/config/progressiveWaterfall";
import { isFailedCineProProvider } from "@/services/cinepro-adapter/playable";

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status: "failure" | "pending" | "notfound" | "success" | "waiting";
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
      /** When set, only scrape this CinePro provider id (on-demand switch). */
      onlyCineProProviderId?: string;
      /** When set, only scrape this P-Stream source id (on-demand switch). */
      onlyPstreamSourceId?: string;
      /** Resume CinePro waterfall after this provider id (skip through it). */
      startFromCineProProviderId?: string;
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
  if (media.type === "movie") return `movie-${media.tmdbId}`;
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
  // Preferred order first, then reliability priority for the rest.
  const prioritized = pstreamPriorityOrder(
    availableSourceIds,
    preferredSourceOrder,
  );

  let filtered = prioritized.filter((id) => !failedSources.includes(id));

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
  const failedEmbedIds = Object.values(
    failedEmbedsPerMedia[mediaKey] ?? {},
  ).flat();
  return preferredEmbedOrder.filter((id) => !failedEmbedIds.includes(id));
}

/**
 * Extracts the underlying URL from a CinePro proxy-wrapped URL.
 */
function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const proxiedUrl = parsed.searchParams.get("url");
    return proxiedUrl ? decodeURIComponent(proxiedUrl) : url;
  } catch {
    return url;
  }
}

/**
 * Checks if two streams point to the same underlying source.
 */
export function isDuplicateStream(s1: Stream, s2: Stream): boolean {
  if (s1.type === "hls" && s2.type === "hls") {
    return extractBaseUrl(s1.playlist) === extractBaseUrl(s2.playlist);
  }
  if (s1.type === "file" && s2.type === "file") {
    const urls1 = Object.values(s1.qualities)
      .map((f) => (f?.url ? extractBaseUrl(f.url) : ""))
      .filter(Boolean);
    const urls2 = Object.values(s2.qualities)
      .map((f) => (f?.url ? extractBaseUrl(f.url) : ""))
      .filter(Boolean);
    return urls1.some((u) => urls2.includes(u));
  }
  return false;
}

const qualityWeight: Record<string, number> = {
  "4k": 5,
  "1080": 4,
  "720": 3,
  "480": 2,
  "360": 1,
  unknown: 0,
};

/**
 * Progressive scrape orchestration.
 *
 * Waterfall best → worst. Returns as soon as the first playable source is found.
 * Remaining providers are NOT scraped until the user switches or playback fails.
 */
export function useScrape(): UseScrapeReturn {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const [isScraping, setIsScraping] = useState(false);

  const buildEvents = useCallback(
    (sourceMetas: MetaOutput[]): FullScraperEvents => ({
      init: (evt) => {
        setSources((prev) => {
          const updated = { ...prev };
          evt.sourceIds.forEach((id) => {
            const meta = sourceMetas.find((s) => s.id === id);
            if (!updated[id]) {
              updated[id] = {
                name: meta?.name ?? id,
                id,
                status: "waiting",
                percentage: 0,
              };
            }
          });
          return updated;
        });
        setSourceOrder((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newEntries = evt.sourceIds
            .filter((id) => !existingIds.has(id))
            .map((id) => ({ id, children: [] as string[] }));
          return [...prev, ...newEntries];
        });
      },
      start: (id) => {
        setCurrentSource(id);
        setSources((prev) => {
          const updated = { ...prev };
          if (updated[id]) updated[id] = { ...updated[id], status: "pending" };
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
              status: evt.status as ScrapingSegment["status"],
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
              status: "waiting",
              percentage: 0,
            };
          });
          return updated;
        });
        setSourceOrder((prev) =>
          prev.map((s) =>
            s.id === evt.sourceId
              ? { ...s, children: evt.embeds.map((e) => e.id) }
              : s,
          ),
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
        onlyCineProProviderId?: string;
        onlyPstreamSourceId?: string;
        startFromCineProProviderId?: string;
      },
    ): Promise<RunOutput | null> => {
      setIsScraping(true);
      setCurrentSource(undefined);
      // On full start, reset UI; on-demand single provider keeps prior successes.
      const onDemand =
        Boolean(options?.onlyCineProProviderId) ||
        Boolean(options?.onlyPstreamSourceId);
      if (!onDemand) {
        setSources({});
        setSourceOrder([]);
        useCineProStore.getState().clearScrapedStreams();
      }

      try {
        const { getProviders } = await import("@/lib/providers/factory");
        const providers = getProviders();
        const allSources = providers.listSources();
        const playerState = usePlayerStore.getState();
        const mediaKey = getScrapeMediaKey(media);
        const pstreamOrder = buildScrapeOrder({
          mediaKey,
          availableSourceIds: allSources.map((source) => source.id),
          failedSourcesPerMedia: playerState.failedSourcesPerMedia,
          preferredSourceOrder: options?.sourceOrder,
          startFromSourceId:
            options?.startFromSourceId ??
            playerState.resumeFromSourceId ??
            undefined,
        });
        const embedOrder = filterEmbedOrder({
          mediaKey,
          preferredEmbedOrder: options?.embedOrder,
          failedEmbedsPerMedia: playerState.failedEmbedsPerMedia,
        });
        const events = buildEvents(allSources);

        const isCineProEnabled = useCineProStore.getState().isEnabled;
        const disabledProviderIds =
          useCineProStore.getState().disabledProviderIds;
        const serverUrl = useCineProStore.getState().serverUrl;
        const req = mapScrapeMediaToRequest(media);

        // ── Resolve CinePro provider order (best → worst) ──
        let cineproIds: string[] = [];
        let cineproMeta: Array<{ id: string; name: string }> = [];
        if (isCineProEnabled && !options?.onlyPstreamSourceId) {
          const listed = await fetchCineProProviders(serverUrl);
          const enabledListed = listed.filter((p) => p.enabled);
          cineproMeta = enabledListed.map((p) => ({
            id: p.id,
            name: p.name,
          }));
          const availableIds = enabledListed.map((p) => p.id);
          if (options?.onlyCineProProviderId) {
            cineproIds = [options.onlyCineProProviderId];
          } else {
            cineproIds = cineproPriorityOrder(
              availableIds,
              disabledProviderIds,
            );
            // Skip providers that failed scrape OR playback (resolve ≠ playback)
            const failedList =
              playerState.failedSourcesPerMedia[mediaKey] ?? [];
            if (failedList.length > 0) {
              cineproIds = cineproIds.filter(
                (id) => !isFailedCineProProvider(id, failedList),
              );
            }
            if (options?.startFromCineProProviderId) {
              const idx = cineproIds.indexOf(
                options.startFromCineProProviderId,
              );
              if (idx !== -1) {
                cineproIds = cineproIds.slice(idx + 1);
              }
            }
          }
        }

        // ── UI: show ordered catalog (CinePro then client) ──
        if (!onDemand) {
          const upfront: Record<string, ScrapingSegment> = {};
          const orderItems: ScrapingItems[] = [];
          for (const id of cineproIds) {
            const name = cineproMeta.find((m) => m.id === id)?.name ?? id;
            upfront[`cinepro-${id}`] = {
              name: `CinePro · ${name}`,
              id: `cinepro-${id}`,
              status: "waiting",
              percentage: 0,
            };
            orderItems.push({ id: `cinepro-${id}`, children: [] });
          }
          for (const source of allSources) {
            if (
              !pstreamOrder.includes(source.id) &&
              !options?.onlyPstreamSourceId
            )
              continue;
            upfront[source.id] = {
              name: source.name ?? source.id,
              id: source.id,
              status: "waiting",
              percentage: 0,
            };
            orderItems.push({ id: source.id, children: [] });
          }
          // Also show remaining pstream sources as waiting (not in first-pass queue if filtered)
          for (const source of allSources) {
            if (upfront[source.id]) continue;
            upfront[source.id] = {
              name: source.name ?? source.id,
              id: source.id,
              status: "waiting",
              percentage: 0,
            };
            orderItems.push({ id: source.id, children: [] });
          }
          setSources(upfront);
          setSourceOrder(orderItems);
        }

        // ── Phase 1: CinePro waterfall (one provider at a time, first success wins) ──
        if (cineproIds.length > 0) {
          const hit = await waterfallFirstSuccess(cineproIds, async (providerId) => {
            const segmentId = `cinepro-${providerId}`;
            const displayName =
              cineproMeta.find((m) => m.id === providerId)?.name ?? providerId;

            setCurrentSource(segmentId);
            setSources((prev) => ({
              ...prev,
              [segmentId]: {
                name: prev[segmentId]?.name ?? `CinePro · ${displayName}`,
                id: segmentId,
                status: "pending",
                percentage: 15,
              },
            }));

            const res = await fetchCineProProviderStreams(
              req,
              providerId,
              serverUrl,
            );
            const activeSources = res.sources.filter(
              (src) => !disabledProviderIds.includes(src.provider.id),
            );

            if (activeSources.length === 0) {
              setSources((prev) => ({
                ...prev,
                [segmentId]: {
                  ...prev[segmentId],
                  name: prev[segmentId]?.name ?? `CinePro · ${displayName}`,
                  id: segmentId,
                  status: "notfound",
                  percentage: 100,
                  reason: "No sources",
                },
              }));
              return null;
            }

            const mapped = mapCineProResultToStreamsWithMeta(
              activeSources,
              res.subtitles,
            );
            if (mapped.length === 0) {
              setSources((prev) => ({
                ...prev,
                [segmentId]: {
                  ...prev[segmentId],
                  name: prev[segmentId]?.name ?? `CinePro · ${displayName}`,
                  id: segmentId,
                  status: "notfound",
                  percentage: 100,
                  reason: "Map empty",
                },
              }));
              return null;
            }

            const sorted = [...mapped].sort((a, b) => {
              const qA = mapQuality(a.quality);
              const qB = mapQuality(b.quality);
              return (qualityWeight[qB] ?? 0) - (qualityWeight[qA] ?? 0);
            });

            const cached: CineProCachedStream[] = sorted.map((m) => ({
              sourceId: `cinepro-${m.providerId}`,
              providerName: m.providerName,
              stream: m.stream,
              quality: m.quality,
            }));

            // Merge into store (keep prior on-demand results)
            const prevCached = useCineProStore.getState().scrapedStreams ?? [];
            const merged = [
              ...cached,
              ...prevCached.filter(
                (p) => !cached.some((c) => c.sourceId === p.sourceId),
              ),
            ];
            useCineProStore.getState().setScrapedStreams(merged);

            setSources((prev) => {
              const updated = { ...prev };
              updated[segmentId] = {
                name: prev[segmentId]?.name ?? `CinePro · ${displayName}`,
                id: segmentId,
                status: "success",
                percentage: 100,
              };
              // Mark remaining waiting slots as skipped (not scraped)
              if (!onDemand) {
                Object.keys(updated).forEach((key) => {
                  if (
                    key.startsWith("cinepro-") &&
                    key !== segmentId &&
                    updated[key].status === "waiting"
                  ) {
                    updated[key] = {
                      ...updated[key],
                      status: "notfound",
                      reason: "Skipped (earlier provider succeeded)",
                    };
                  }
                  if (
                    !key.startsWith("cinepro-") &&
                    updated[key].status === "waiting"
                  ) {
                    updated[key] = {
                      ...updated[key],
                      status: "notfound",
                      reason: "Skipped (CinePro found sources)",
                    };
                  }
                });
              }
              return updated;
            });

            return {
              sourceId: cached[0].sourceId,
              stream: cached[0].stream,
            } satisfies RunOutput;
          });

          if (hit) {
            return hit.value;
          }
        }

        // On-demand CinePro-only path exhausted
        if (options?.onlyCineProProviderId) {
          return null;
        }

        // ── Phase 2: Client P-Stream sequential first-success ──
        if (options?.onlyPstreamSourceId) {
          // Single source: use runAll with one-id order
          const pstreamResult = await providers
            .runAll({
              media,
              sourceOrder: [options.onlyPstreamSourceId],
              embedOrder,
              events,
            })
            .catch((err) => {
              if (import.meta.env.DEV) {
                console.error("P-Stream single scrape failed:", err);
              }
              return null;
            });
          return pstreamResult;
        }

        if (pstreamOrder.length === 0) {
          return null;
        }

        const pstreamResult = await providers
          .runAll({
            media,
            sourceOrder: pstreamOrder,
            embedOrder,
            events,
          })
          .catch((err) => {
            if (import.meta.env.DEV) {
              console.error("P-Stream scraping failed:", err);
            }
            return null;
          });

        return pstreamResult;
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
