import { Icons } from "@/components/Icon";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import {
  tryLockLandscape,
  tryUnlockOrientation,
  usePlayerViewport,
} from "@/hooks/usePlayerViewport";
import { usePlayerStore } from "@/stores/player/store";

export function Fullscreen() {
  const { isFullscreen } = usePlayerStore((s) => s.interface);
  const display = usePlayerStore((s) => s.display);
  const { isMobile } = usePlayerViewport();

  return (
    <VideoPlayerButton
      onClick={() => {
        const entering = !isFullscreen;
        display?.toggleFullscreen();
        if (entering && isMobile) {
          // Orientation lock only works after (or with) fullscreen on most mobile browsers.
          window.setTimeout(() => {
            void tryLockLandscape();
          }, 150);
        } else if (!entering) {
          tryUnlockOrientation();
        }
      }}
      icon={isFullscreen ? Icons.COMPRESS : Icons.EXPAND}
    />
  );
}
