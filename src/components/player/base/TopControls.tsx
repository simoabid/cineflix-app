import { useEffect } from "react";

import { Transition } from "@/components/utils/Transition";
import { useBannerSize } from "@/stores/banner";
import { BannerLocation } from "@/stores/banner/BannerLocation";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";

export function TopControls(props: {
  show?: boolean;
  children: React.ReactNode;
}) {
  const bannerSize = useBannerSize("player");
  const setHoveringAnyControls = usePlayerStore(
    (s) => s.setHoveringAnyControls,
  );
  const backgroundBlurEnabled = useSubtitleStore(
    (s) => s.styling.backgroundBlurEnabled,
  );

  useEffect(() => {
    return () => {
      setHoveringAnyControls(false);
    };
  }, [setHoveringAnyControls]);

  return (
    <div className="w-full text-white">
      {backgroundBlurEnabled && (
        <Transition
          animation="fade"
          show={props.show}
          style={{
            top: `${bannerSize}px`,
          }}
          className="pointer-events-none flex justify-end pb-32 bg-gradient-to-b from-black to-transparent [margin-bottom:env(safe-area-inset-bottom)] transition-opacity duration-200 absolute top-0 w-full"
        />
      )}
      <div className="relative z-10">
        <BannerLocation location="player" />
      </div>
      <div
        onMouseOver={() => setHoveringAnyControls(true)}
        onMouseOut={() => setHoveringAnyControls(false)}
        className="pointer-events-auto absolute top-0 w-full pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] ssm:pl-[calc(1rem+env(safe-area-inset-left))] ssm:pr-[calc(1rem+env(safe-area-inset-right))] ssm:pt-4 md:pl-[calc(2rem+env(safe-area-inset-left))] md:pr-[calc(2rem+env(safe-area-inset-right))] md:pt-6"
        style={{
          top: `${bannerSize}px`,
        }}
      >
        <Transition
          animation="slide-down"
          show={props.show}
          className="top-content text-white"
        >
          {props.children}
        </Transition>
      </div>
    </div>
  );
}
