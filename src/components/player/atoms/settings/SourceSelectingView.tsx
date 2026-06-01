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

  const handleFindNextSource = () => {
    if (!currentSourceId) return;
    setResumeFromSourceId(currentSourceId);
    router.close();
    setStatus(playerStatus.SCRAPING);
  };

  const noSourcesAvailable = sources.length === 0;

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
      <div className="overflow-y-auto overflow-x-hidden scrollbar-none pb-4">
        {/* Search/filter input */}
        {sources.length > 4 && (
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

        <Menu.Section>
          {noSourcesAvailable ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-video-context-type-main text-sm font-medium opacity-70">
                No sources available
              </p>
              <p className="text-video-context-type-main text-xs opacity-40">
                Sources will appear here once the player is ready
              </p>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <p className="text-video-context-type-main text-sm opacity-50">
                No sources match &ldquo;{searchQuery}&rdquo;
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
      </div>
    </>
  );
}
