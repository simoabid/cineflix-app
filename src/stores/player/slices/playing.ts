import type { MakeSlice } from '@/stores/player/slices/types';

export interface PlayingSlice {
  mediaPlaying: {
    isPlaying: boolean;
    isPaused: boolean;
    isSeeking: boolean;
    isDragSeeking: boolean;
    isLoading: boolean;
    hasPlayedOnce: boolean;
    volume: number;
    playbackRate: number;
  };
  play(): void;
  pause(): void;
}

export const createPlayingSlice: MakeSlice<PlayingSlice> = (set) => ({
  mediaPlaying: {
    isPlaying: false,
    isPaused: true,
    isLoading: false,
    isSeeking: false,
    isDragSeeking: false,
    hasPlayedOnce: false,
    volume: 1,
    playbackRate: 1,
  },
  play() {
    set((state) => {
      state.mediaPlaying.isPlaying = true;
      state.mediaPlaying.isPaused = false;
    });
  },
  pause() {
    set((state) => {
      state.mediaPlaying.isPlaying = false;
      state.mediaPlaying.isPaused = true;
    });
  },
});
