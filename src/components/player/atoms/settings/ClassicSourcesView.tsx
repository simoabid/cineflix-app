import React, { useCallback } from "react";
import { Globe, AlertTriangle, ShieldCheck } from "lucide-react";

import { Menu } from "@/components/player/internals/ContextMenu";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useSmartPlayer } from "@/hooks/useSmartPlayer";
import { usePlayerStore } from "@/stores/player/store";
import type { StreamSource } from "@/types";

interface ClassicSourcesViewProps {
  id: string;
}

/**
 * ClassicSourcesView displays the list of classic stream sources (embeds/iframes)
 * within the settings overlay router.
 */
export const ClassicSourcesView: React.FC<ClassicSourcesViewProps> = ({ id }) => {
  const router = useOverlayRouter(id);
  const {
    streamSources,
    sourcesLoading,
    sourcesError,
    setSelectedSource
  } = useSmartPlayer();

  const activeIframeSource = usePlayerStore((s) => s.iframeSource);
  const displayMode = usePlayerStore((s) => s.displayMode);
  const switchToClassic = usePlayerStore((s) => s.switchToClassic);

  const handleSelectSource = useCallback(
    (source: StreamSource) => {
      setSelectedSource(source);
      switchToClassic(source);
      router.close();
    },
    [router, setSelectedSource, switchToClassic]
  );

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        Classic Sources
      </Menu.BackLink>

      <Menu.Section className="flex flex-col pb-4">
        {sourcesLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-type-secondary">
            <div className="w-6 h-6 rounded-full border-2 border-type-secondary border-t-transparent animate-spin mb-2" />
            <span className="text-sm">Fetching sources...</span>
          </div>
        ) : sourcesError ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center text-red-400">
            <AlertTriangle className="h-6 w-6 mb-2" />
            <span className="text-sm font-semibold">{sourcesError}</span>
          </div>
        ) : streamSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-type-secondary text-sm">
            No classic sources found for this content.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto px-1 pr-2 scrollbar-thin">
            {streamSources.map((source) => {
              const isSelected = displayMode === "iframe" && activeIframeSource?.id === source.id;

              return (
                <SelectableLink
                  key={source.id}
                  selected={isSelected}
                  onClick={() => handleSelectSource(source)}
                >
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center space-x-2.5">
                      <Globe className={`h-4 w-4 ${isSelected ? "text-purple-400" : "text-type-secondary"}`} />
                      <span className="font-medium text-sm text-white">{source.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {source.isAdFree && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-500/20 text-green-400 border border-green-500/10">
                          <ShieldCheck className="h-3 w-3" />
                          Ad-Free
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-800 text-gray-400">
                        {source.quality}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        source.reliability === "Premium"
                          ? "bg-purple-500/20 text-purple-400"
                          : source.reliability === "Fast"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {source.reliability}
                      </span>
                    </div>
                  </div>
                </SelectableLink>
              );
            })}
          </div>
        )}

        <Menu.Divider />
        <div className="px-4 py-2 text-xs text-type-secondary leading-relaxed bg-white/5 rounded-lg border border-white/5 mx-2 mt-2">
          💡 <span className="font-semibold text-white">Ad-Block Recommended:</span> Classic sources are third-party external iframe embeds. We strongly suggest using an Ad-Blocker (like uBlock Origin) for the best popup-free experience.
        </div>
      </Menu.Section>
    </>
  );
};
