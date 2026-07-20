import { useEffect, useState } from "react";

export type PlayerViewport = {
  /** Width under 768px (phone / small tablet portrait). */
  isMobile: boolean;
  /** Height under 500px (phone landscape chrome). */
  isShort: boolean;
  /** CSS portrait orientation (or tall narrow window). */
  isPortrait: boolean;
  /** Prefer landscape chrome (phone in landscape or landscape lock). */
  preferLandscapeChrome: boolean;
};

function readViewport(): PlayerViewport {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isShort: false,
      isPortrait: false,
      preferLandscapeChrome: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 768;
  const isShort = h < 500;
  const isPortrait =
    window.matchMedia("(orientation: portrait)").matches || h > w;
  return {
    isMobile,
    isShort,
    isPortrait,
    preferLandscapeChrome: isMobile && !isPortrait,
  };
}

/**
 * Viewport flags for player chrome (mobile/tablet/portrait).
 * Updates on resize and orientation change.
 */
export function usePlayerViewport(): PlayerViewport {
  const [vp, setVp] = useState<PlayerViewport>(() => readViewport());

  useEffect(() => {
    const update = () => setVp(readViewport());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const mql = window.matchMedia("(orientation: portrait)");
    mql.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      mql.removeEventListener?.("change", update);
    };
  }, []);

  return vp;
}

/** Best-effort landscape lock (requires fullscreen / user gesture on most browsers). */
export async function tryLockLandscape(): Promise<boolean> {
  try {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (typeof orient?.lock === "function") {
      await orient.lock("landscape");
      return true;
    }
  } catch {
    // iOS Safari and many browsers reject without fullscreen / permission
  }
  return false;
}

export function tryUnlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // ignore
  }
}
