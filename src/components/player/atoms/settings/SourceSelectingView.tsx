import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCachedMetadata } from "@/backend/helpers/providerApi";
import { Loading } from "@/components/layout/Loading";
import {
  useEmbedScraping,
  useSourceScraping,
} from "@/components/player/hooks/useSourceSelection";
import { Menu } from "@/components/player/internals/ContextMenu";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useCineProStore, CineProCachedStream } from "@/stores/cinepro";
import { usePlayer } from "@/hooks/usePlayer";
import {
  convertCaptions,
  convertStreamToSource,
} from "@/lib/providers/stream-utils";
import {
  fetchCineProProviderStreams,
  mapQuality,
  mapCineProResultToStreamsWithMeta,
  mapScrapeMediaToRequest,
} from "@/services/cinepro-adapter";
import { cineproPriorityOrder } from "@/config/scrapePriority";
import { metaToScrapeMedia } from "@/stores/player/slices/source";

export interface SourceSelectionViewProps {
  id: string;
  onChoose?: (id: string) => void;
}

export interface EmbedSelectionViewProps {
  id: string;
  sourceId: string | null;
}

export function EmbedOption(props: {
  embedId: string;
  url: string;
  sourceId: string;
  routerId: string;
}) {
  const { t } = useTranslation();
  const currentEmbedId = usePlayerStore((s) => s.embedId);
  const unknownEmbedName = t("player.menus.sources.unknownOption");

  const embedName = useMemo(() => {
    if (!props.embedId) return unknownEmbedName;
    const sourceMeta = getCachedMetadata().find((s) => s.id === props.embedId);
    return sourceMeta?.name ?? unknownEmbedName;
  }, [props.embedId, unknownEmbedName]);

  const { run, errored, loading, notFound } = useEmbedScraping(
    props.routerId,
    props.sourceId,
    props.url,
    props.embedId,
  );

  let rightSide;
  if (loading) {
    rightSide = undefined; // Let SelectableLink handle loading
  } else if (notFound) {
    rightSide = (
      <div className="flex items-center text-video-scraping-noresult">
        <div className="w-4 h-4 rounded-full border-2 border-current bg-current flex items-center justify-center">
          <div className="w-2 h-0.5 bg-background-main rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <SelectableLink
      loading={loading}
      error={errored && !notFound}
      onClick={run}
      selected={props.embedId === currentEmbedId}
      rightSide={rightSide}
    >
      <span className="flex flex-col">
        <span>{embedName}</span>
      </span>
    </SelectableLink>
  );
}

export function EmbedSelectionView({ sourceId, id }: EmbedSelectionViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const { run, watching, notfound, loading, items, errored } =
    useSourceScraping(sourceId, id);

  const sourceName = useMemo(() => {
    if (!sourceId) return "...";
    const sourceMeta = getCachedMetadata().find((s) => s.id === sourceId);
    return sourceMeta?.name ?? "...";
  }, [sourceId]);

  const lastSourceId = useRef<string | null>(null);
  useEffect(() => {
    if (lastSourceId.current === sourceId) return;
    lastSourceId.current = sourceId;
    if (!sourceId) return;
    run();
  }, [run, sourceId]);

  let content: ReactNode = null;
  if (loading)
    content = (
      <Menu.TextDisplay noIcon>
        <Loading />
      </Menu.TextDisplay>
    );
  else if (notfound)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.noStream.title") ?? undefined}
      >
        {t("player.menus.sources.noStream.text")}
      </Menu.TextDisplay>
    );
  else if (items?.length === 0)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.noEmbeds.title") ?? undefined}
      >
        {t("player.menus.sources.noEmbeds.text")}
      </Menu.TextDisplay>
    );
  else if (errored)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.failed.title") ?? undefined}
      >
        {t("player.menus.sources.failed.text")}
      </Menu.TextDisplay>
    );
  else if (watching)
    content = null; // when it starts watching, empty the display
  else if (items && sourceId)
    content = items.map((v) => (
      <EmbedOption
        key={`${v.embedId}-${v.url}`}
        embedId={v.embedId}
        url={v.url}
        routerId={id}
        sourceId={sourceId}
      />
    ));

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/source")}>
        {sourceName}
      </Menu.BackLink>
      <Menu.Section>{content}</Menu.Section>
    </>
  );
}

/** Quality badge pill shown next to each source */
function QualityBadge({ quality }: { quality: string }) {
  const colorMap: Record<string, string> = {
    "4K": "text-yellow-300 bg-yellow-300/10 border-yellow-300/30",
    "1080p": "text-blue-300 bg-blue-300/10 border-blue-300/30",
    "720p": "text-green-300 bg-green-300/10 border-green-300/30",
    "480p": "text-orange-300 bg-orange-300/10 border-orange-300/30",
    HD: "text-blue-300 bg-blue-300/10 border-blue-300/30",
    SD: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  };
  const cls =
    colorMap[quality] ?? "text-gray-400 bg-gray-400/10 border-gray-400/30";
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}
    >
      {quality}
    </span>
  );
}

/** Derive a human-readable quality from source flags or rank */
function getSourceQuality(flags?: string[], rank?: number): string {
  if (flags?.includes("4k") || flags?.includes("4K")) return "4K";
  if (flags?.includes("1080p")) return "1080p";
  if (flags?.includes("720p")) return "720p";
  if (flags?.includes("480p")) return "480p";
  if (flags?.includes("hd") || flags?.includes("HD")) return "HD";
  if (rank && rank >= 200) return "HD";
  if (rank && rank >= 100) return "720p";
  return "";
}

export function SourceSelectionView({
  id,
  onChoose,
}: SourceSelectionViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const metaType = usePlayerStore((s) => s.meta?.type);
  const currentSourceId = usePlayerStore((s) => s.sourceId);
  const setResumeFromSourceId = usePlayerStore((s) => s.setResumeFromSourceId);
  const setStatus = usePlayerStore((s) => s.setStatus);
  const preferredSourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );

  const [searchQuery, setSearchQuery] = useState("");

  const cineproStreams = useCineProStore((s) => s.scrapedStreams);
  const isCineProEnabled = useCineProStore((s) => s.isEnabled);
  const cineproProviders = useCineProStore((s) => s.availableProviders);
  const disabledCineProIds = useCineProStore((s) => s.disabledProviderIds);
  const cineproServerUrl = useCineProStore((s) => s.serverUrl);
  const setCineProStreams = useCineProStore((s) => s.setScrapedStreams);
  const loadCineProProviders = useCineProStore((s) => s.loadProviders);
  const meta = usePlayerStore((s) => s.meta);
  const { playMedia } = usePlayer();
  const currentTime = usePlayerStore((s) => s.progress.time);
  const [cineproLoadingId, setCineproLoadingId] = useState<string | null>(null);

  // Ensure provider catalog is loaded for on-demand progressive switch.
  useEffect(() => {
    if (isCineProEnabled && cineproProviders.length === 0) {
      void loadCineProProviders();
    }
  }, [isCineProEnabled, cineproProviders.length, loadCineProProviders]);

  const sources = useMemo(() => {
    if (!metaType) return [];
    const allSources = getCachedMetadata()
      .filter((v) => v.type === "source")
      .filter((v) => v.mediaTypes?.includes(metaType));

    if (!enableSourceOrder || preferredSourceOrder.length === 0) {
      if (enableLastSuccessfulSource && lastSuccessfulSource) {
        const lastSourceIndex = allSources.findIndex(
          (s) => s.id === lastSuccessfulSource,
        );
        if (lastSourceIndex !== -1) {
          const lastSource = allSources.splice(lastSourceIndex, 1)[0];
          return [lastSource, ...allSources];
        }
      }
      return allSources;
    }

    const orderedSources = [];
    const remainingSources = [...allSources];

    if (enableLastSuccessfulSource && lastSuccessfulSource) {
      const lastSourceIndex = remainingSources.findIndex(
        (s) => s.id === lastSuccessfulSource,
      );
      if (lastSourceIndex !== -1) {
        orderedSources.push(remainingSources[lastSourceIndex]);
        remainingSources.splice(lastSourceIndex, 1);
      }
    }

    for (const sourceId of preferredSourceOrder) {
      const sourceIndex = remainingSources.findIndex((s) => s.id === sourceId);
      if (sourceIndex !== -1) {
        orderedSources.push(remainingSources[sourceIndex]);
        remainingSources.splice(sourceIndex, 1);
      }
    }

    orderedSources.push(...remainingSources);
    return orderedSources;
  }, [
    metaType,
    preferredSourceOrder,
    enableSourceOrder,
    lastSuccessfulSource,
    enableLastSuccessfulSource,
  ]);

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const q = searchQuery.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(q));
  }, [sources, searchQuery]);

  /** Which multi-server providers are expanded in the menu */
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({});

  /** Catalog of CinePro providers (priority order) for on-demand scrape. */
  const cineproCatalog = useMemo(() => {
    if (!isCineProEnabled) return [];
    const enabled = cineproProviders.filter((p) => p.enabled);
    const ids = cineproPriorityOrder(
      enabled.map((p) => p.id),
      disabledCineProIds,
    );
    return ids.map((id) => {
      const info = enabled.find((p) => p.id === id);
      const children = cineproStreams.filter((s) => s.providerId === id);
      // Fallback for legacy cache entries that only had sourceId
      const legacy = cineproStreams.filter(
        (s) =>
          !s.providerId &&
          (s.sourceId === `cinepro-${id}` ||
            s.sourceId.startsWith(`cinepro-${id}-`)),
      );
      const streams = children.length > 0 ? children : legacy;
      return {
        id,
        name: info?.name ?? streams[0]?.providerName?.replace(/\s*\(.*\)$/, "") ?? id,
        streams,
      };
    });
  }, [isCineProEnabled, cineproProviders, disabledCineProIds, cineproStreams]);

  const filteredCineProCatalog = useMemo(() => {
    if (!searchQuery.trim()) return cineproCatalog;
    const q = searchQuery.toLowerCase();
    return cineproCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.streams.some((st) => st.providerName.toLowerCase().includes(q)),
    );
  }, [cineproCatalog, searchQuery]);

  const showCinePro = isCineProEnabled && cineproCatalog.length > 0;
  const noSourcesAvailable = sources.length === 0 && !showCinePro;

  const handleSelectCineProStream = (cached: CineProCachedStream) => {
    const sourceData = convertStreamToSource({ stream: cached.stream });
    const captions = convertCaptions(cached.stream.captions ?? []);
    playMedia(
      sourceData,
      captions,
      cached.sourceId,
      currentTime,
      "cinepro",
      cached.providerName,
    );
    router.close();
  };

  /** Short label for a sub-server: "VidSrc (Alpha)" → "Alpha"; else quality. */
  const subServerLabel = (cached: CineProCachedStream, index: number) => {
    const m = cached.providerName.match(/\(([^)]+)\)\s*$/);
    if (m?.[1]) return m[1];
    if (cached.quality && cached.quality.toLowerCase() !== "auto") {
      return cached.quality;
    }
    return `Server ${index + 1}`;
  };

  /**
   * On-demand: scrape one CinePro provider → cache ALL sub-servers → play first.
   * If already scraped, toggle expand (multi) or re-select first stream (single).
   */
  const handleSelectCineProProvider = async (
    providerId: string,
    name: string,
  ) => {
    const existing = cineproStreams.filter((s) => s.providerId === providerId);
    if (existing.length > 0) {
      if (existing.length > 1) {
        setExpandedProviders((prev) => ({
          ...prev,
          [providerId]: !prev[providerId],
        }));
        return;
      }
      handleSelectCineProStream(existing[0]!);
      return;
    }
    if (!meta) return;
    setCineproLoadingId(providerId);
    try {
      const media = metaToScrapeMedia(meta);
      const req = mapScrapeMediaToRequest(media);
      const res = await fetchCineProProviderStreams(
        req,
        providerId,
        cineproServerUrl,
      );
      if (!res.sources.length) {
        return;
      }
      const mapped = mapCineProResultToStreamsWithMeta(
        res.sources,
        res.subtitles,
      );
      if (!mapped.length) return;
      const cachedAll: CineProCachedStream[] = mapped.map((m) => ({
        sourceId: m.stream.id,
        providerId: m.providerId,
        providerName: m.providerName || name,
        stream: m.stream,
        quality: m.quality,
      }));
      setCineProStreams([
        ...cachedAll,
        ...cineproStreams.filter((s) => s.providerId !== providerId),
      ]);
      if (cachedAll.length > 1) {
        setExpandedProviders((prev) => ({ ...prev, [providerId]: true }));
      }
      handleSelectCineProStream(cachedAll[0]!);
    } finally {
      setCineproLoadingId(null);
    }
  };

  const handleFindNextSource = () => {
    if (!currentSourceId) return;
    setResumeFromSourceId(currentSourceId);
    router.close();
    setStatus(playerStatus.SCRAPING);
  };

  return (
    <>
      <Menu.BackLink
        onClick={() => router.navigate("/")}
        rightSide={
          <div className="flex items-center gap-2">
            {currentSourceId && !manualSourceSelection && (
              <button
                type="button"
                onClick={handleFindNextSource}
                className="-mr-2 -my-1 px-2 p-[0.4em] rounded tabbable hover:bg-video-context-light hover:bg-opacity-10"
              >
                {t("player.menus.sources.findNextSource")}
              </button>
            )}
          </div>
        }
      >
        {t("player.menus.sources.title")}
      </Menu.BackLink>

      {/* Scrollable body — must be exactly the 2nd direct child of CardWithScrollable */}
      <div className="overflow-y-auto overflow-x-hidden scrollbar-hide pb-4">
        {/* Search/filter input */}
        {sources.length + (showCinePro ? cineproCatalog.length : 0) > 4 && (
          <div className="px-1 pt-3 pb-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sources…"
              className="w-full bg-video-context-light/10 text-video-context-type-main placeholder-video-context-type-main/40 text-sm rounded-lg px-3 py-1.5 outline-none border border-video-context-border focus:border-video-context-type-accent/50 transition-colors"
            />
          </div>
        )}

        {noSourcesAvailable ? (
          <Menu.Section>
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-video-context-type-main text-sm font-medium opacity-70">
                {t("player.menus.sources.noSources.title") ??
                  "No sources available"}
              </p>
              <p className="text-video-context-type-main text-xs opacity-40">
                {t("player.menus.sources.noSources.text") ??
                  "Sources will appear here once the player is ready"}
              </p>
            </div>
          </Menu.Section>
        ) : filteredSources.length === 0 &&
          filteredCineProCatalog.length === 0 ? (
          <Menu.Section>
            <div className="flex items-center justify-center py-6">
              <p className="text-video-context-type-main text-sm opacity-50">
                No sources match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          </Menu.Section>
        ) : (
          <>
            {showCinePro && (
              <>
                <Menu.SectionTitle>
                  {t("player.menus.sources.cineproSectionTitle") ??
                    "Server Streams (CinePro)"}
                </Menu.SectionTitle>
                <Menu.Section>
                  {filteredCineProCatalog.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <p className="text-video-context-type-main text-xs opacity-50">
                        No server streams match &ldquo;{searchQuery}&rdquo;
                      </p>
                    </div>
                  ) : (
                    filteredCineProCatalog.map((entry) => {
                      const streams = entry.streams;
                      const hasStreams = streams.length > 0;
                      const multi = streams.length > 1;
                      const expanded =
                        multi &&
                        (expandedProviders[entry.id] ||
                          streams.some((s) => s.sourceId === currentSourceId));
                      const bestQ = hasStreams
                        ? mapQuality(streams[0]!.quality)
                        : "unknown";
                      const qualityLabel =
                        bestQ === "4k"
                          ? "4K"
                          : bestQ !== "unknown"
                            ? bestQ + "p"
                            : "";
                      const loading = cineproLoadingId === entry.id;
                      const selected =
                        hasStreams &&
                        streams.some((s) => s.sourceId === currentSourceId);
                      return (
                        <div key={entry.id} className="flex flex-col">
                          <SelectableLink
                            loading={loading}
                            onClick={() =>
                              void handleSelectCineProProvider(
                                entry.id,
                                entry.name,
                              )
                            }
                            selected={selected && !multi}
                            rightSide={
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-purple-300 bg-purple-300/10 border-purple-300/30">
                                  {!hasStreams
                                    ? "tap to load"
                                    : multi
                                      ? `${streams.length} servers`
                                      : "ready"}
                                </span>
                                {qualityLabel && (
                                  <QualityBadge quality={qualityLabel} />
                                )}
                              </div>
                            }
                          >
                            {entry.name}
                          </SelectableLink>
                          {expanded &&
                            streams.map((st, idx) => {
                              const sq = mapQuality(st.quality);
                              const sqLabel =
                                sq === "4k"
                                  ? "4K"
                                  : sq !== "unknown"
                                    ? sq + "p"
                                    : "";
                              return (
                                <SelectableLink
                                  key={st.sourceId}
                                  onClick={() => handleSelectCineProStream(st)}
                                  selected={st.sourceId === currentSourceId}
                                  rightSide={
                                    sqLabel ? (
                                      <QualityBadge quality={sqLabel} />
                                    ) : undefined
                                  }
                                >
                                  <span className="pl-3 text-sm opacity-90">
                                    {subServerLabel(st, idx)}
                                  </span>
                                </SelectableLink>
                              );
                            })}
                        </div>
                      );
                    })
                  )}
                </Menu.Section>
              </>
            )}

            {showCinePro && (
              <Menu.SectionTitle>
                {t("player.menus.sources.localSectionTitle") ??
                  "Client-side Scrapers"}
              </Menu.SectionTitle>
            )}

            <Menu.Section>
              {filteredSources.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-video-context-type-main text-xs opacity-50">
                    No client-side scrapers match &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                filteredSources.map((v) => {
                  const quality = getSourceQuality(v.flags, v.rank);
                  const isLastSuccessful =
                    enableLastSuccessfulSource && v.id === lastSuccessfulSource;
                  return (
                    <SelectableLink
                      key={v.id}
                      onClick={() => {
                        onChoose?.(v.id);
                        router.navigate("/source/embeds");
                      }}
                      selected={v.id === currentSourceId}
                      rightSide={
                        <div className="flex items-center gap-1.5">
                          {isLastSuccessful && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-green-300 bg-green-300/10 border-green-300/30">
                              last used
                            </span>
                          )}
                          {quality && <QualityBadge quality={quality} />}
                        </div>
                      }
                    >
                      {v.name}
                    </SelectableLink>
                  );
                })
              )}
            </Menu.Section>
          </>
        )}
      </div>
    </>
  );
}
