import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import {
  tryLockLandscape,
  usePlayerViewport,
} from "@/hooks/usePlayerViewport";
import { usePlayerStore } from "@/stores/player/store";
import { playerStatus } from "@/stores/player/slices/source";

/**
 * On phones in portrait, nudge the user toward landscape and try to enter
 * fullscreen + lock orientation for a better watch experience.
 */
export function RotateHint(props: { show?: boolean }) {
  const { isMobile, isPortrait } = usePlayerViewport();
  const status = usePlayerStore((s) => s.status);
  const isFullscreen = usePlayerStore((s) => s.interface.isFullscreen);
  const display = usePlayerStore((s) => s.display);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss when leaving portrait so it can show again later if needed
  useEffect(() => {
    if (!isPortrait) setDismissed(false);
  }, [isPortrait]);

  const visible =
    !!props.show &&
    isMobile &&
    isPortrait &&
    !isFullscreen &&
    !dismissed &&
    (status === playerStatus.PLAYING || status === playerStatus.SCRAPING);

  const handleRotate = useCallback(async () => {
    // Fullscreen first (required for orientation.lock on most engines)
    if (!isFullscreen) {
      display?.toggleFullscreen();
    }
    // Give the browser a tick to enter FS before locking
    window.setTimeout(() => {
      void tryLockLandscape();
    }, 120);
    setDismissed(true);
  }, [display, isFullscreen]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-[45] flex justify-center px-4 sm:hidden">
      <button
        type="button"
        onClick={() => void handleRotate()}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md active:scale-95 transition-transform"
        aria-label="Rotate to landscape for a better view"
      >
        <RotateCw className="h-4 w-4 shrink-0 text-purple-300" />
        <span>Rotate for best view</span>
      </button>
    </div>
  );
}
