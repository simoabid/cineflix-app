import { create } from 'zustand';

import type { PlayerMeta } from '@/stores/player/slices/source';
import type { ProgressItem } from '@/stores/progress';

interface WatchHistoryStore {
  addItem(meta: PlayerMeta, progress: ProgressItem, completed?: boolean): void;
}

export const useWatchHistoryStore = create<WatchHistoryStore>(() => ({
  addItem() {
    // Cineflix stores watch history separately; this shim keeps the P-Stream
    // player progress hook isolated from that app-level feature.
  },
}));
