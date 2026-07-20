import { useEffect } from "react";

import { Transition } from "@/components/utils/Transition";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";

export function BottomControls(props: {
  show?: boolean;
  children: React.ReactNode;
}) {
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
          className="pointer-events-none flex justify-end pt-32 bg-gradient-to-t from-black to-transparent transition-opacity duration-200 absolute bottom-0 w-full"
        />
      )}
      <div
        onMouseOver={() => setHoveringAnyControls(true)}
        onMouseOut={() => setHoveringAnyControls(false)}
        className="pointer-events-auto z-10 absolute bottom-0 w-full pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] ssm:pl-[calc(1rem+env(safe-area-inset-left))] ssm:pr-[calc(1rem+env(safe-area-inset-right))] ssm:pb-2 md:pl-[calc(2rem+env(safe-area-inset-left))] md:pr-[calc(2rem+env(safe-area-inset-right))] md:pb-3 md:mb-[env(safe-area-inset-bottom)]"
      >
        <Transition animation="slide-up" show={props.show}>
          {props.children}
        </Transition>
      </div>
    </div>
  );
}
