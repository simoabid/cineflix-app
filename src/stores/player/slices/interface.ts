import type { DisplayError } from '@/components/player/display/displayInterface';
import type { MakeSlice } from '@/stores/player/slices/types';

export const VideoPlayerTimeFormat = {
  REGULAR: 0,
  REMAINING: 1,
} as const;
export type VideoPlayerTimeFormat = (typeof VideoPlayerTimeFormat)[keyof typeof VideoPlayerTimeFormat];

export const PlayerHoverState = {
  NOT_HOVERING: 'not_hovering',
  MOUSE_HOVER: 'mouse_hover',
  MOBILE_TAPPED: 'mobile_tapped',
} as const;
export type PlayerHoverState = (typeof PlayerHoverState)[keyof typeof PlayerHoverState];

export interface InterfaceSlice {
  interface: {
    isFullscreen: boolean;
    isSeeking: boolean;
    lastVolume: number;
    hasOpenOverlay: boolean;
    hovering: PlayerHoverState;
    lastHoveringState: PlayerHoverState;
    canAirplay: boolean;
    isCasting: boolean;
    hideNextEpisodeBtn: boolean;
    shouldStartFromBeginning: boolean;
    error?: DisplayError;
    volumeChangedWithKeybind: boolean;
    volumeChangedWithKeybindDebounce: ReturnType<typeof setTimeout> | null;
    leftControlHovering: boolean;
    isHoveringControls: boolean;
    timeFormat: VideoPlayerTimeFormat;
    isSpeedBoosted: boolean;
    showSpeedIndicator: boolean;
  };
  updateInterfaceHovering(newState: PlayerHoverState): void;
  setSeeking(seeking: boolean): void;
  setTimeFormat(format: VideoPlayerTimeFormat): void;
  setHoveringLeftControls(state: boolean): void;
  setHoveringAnyControls(state: boolean): void;
  setHasOpenOverlay(state: boolean): void;
  setLastVolume(state: number): void;
  hideNextEpisodeButton(): void;
  setShouldStartFromBeginning(val: boolean): void;
  setSpeedBoosted(state: boolean): void;
  setShowSpeedIndicator(state: boolean): void;
}

export const createInterfaceSlice: MakeSlice<InterfaceSlice> = (set, get) => ({
  interface: {
    isCasting: false,
    hasOpenOverlay: false,
    isFullscreen: false,
    isSeeking: false,
    lastVolume: 0,
    leftControlHovering: false,
    isHoveringControls: false,
    hovering: PlayerHoverState.NOT_HOVERING,
    lastHoveringState: PlayerHoverState.NOT_HOVERING,
    volumeChangedWithKeybind: false,
    volumeChangedWithKeybindDebounce: null,
    timeFormat: VideoPlayerTimeFormat.REGULAR,
    canAirplay: false,
    hideNextEpisodeBtn: false,
    shouldStartFromBeginning: false,
    isSpeedBoosted: false,
    showSpeedIndicator: false,
  },
  setShouldStartFromBeginning(val) {
    set((s) => {
      s.interface.shouldStartFromBeginning = val;
    });
  },
  setLastVolume(state) {
    set((s) => {
      s.interface.lastVolume = state;
    });
  },
  setHasOpenOverlay(state) {
    set((s) => {
      s.interface.hasOpenOverlay = state;
    });
  },
  setTimeFormat(format) {
    set((s) => {
      s.interface.timeFormat = format;
    });
  },
  updateInterfaceHovering(newState: PlayerHoverState) {
    set((s) => {
      if (newState !== PlayerHoverState.NOT_HOVERING)
        s.interface.lastHoveringState = newState;
      s.interface.hovering = newState;
    });
  },
  setSeeking(seeking) {
    const display = get().display;
    display?.setSeeking(seeking);
    set((s) => {
      s.interface.isSeeking = seeking;
    });
  },
  setHoveringLeftControls(state) {
    set((s) => {
      s.interface.leftControlHovering = state;
    });
  },
  setHoveringAnyControls(state) {
    set((s) => {
      s.interface.isHoveringControls = state;
    });
  },
  hideNextEpisodeButton() {
    set((s) => {
      s.interface.hideNextEpisodeBtn = true;
    });
  },
  setSpeedBoosted(state) {
    set((s) => {
      s.interface.isSpeedBoosted = state;
    });
  },
  setShowSpeedIndicator(state) {
    set((s) => {
      s.interface.showSpeedIndicator = state;
    });
  },
});
