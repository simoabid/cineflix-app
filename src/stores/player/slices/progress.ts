import { MakeSlice } from '@/stores/player/slices/types';

export interface ProgressSlice {
  progress: {
    time: number;
    duration: number;
    buffered: number;
    draggingTime: number;
  };
  setDraggingTime(draggingTime: number): void;
}

export const createProgressSlice: MakeSlice<ProgressSlice> = (set) => ({
  progress: {
    time: 0,
    duration: 0,
    buffered: 0,
    draggingTime: 0,
  },
  setDraggingTime(draggingTime: number) {
    set((s) => {
      s.progress.draggingTime = draggingTime;
    });
  },
});
