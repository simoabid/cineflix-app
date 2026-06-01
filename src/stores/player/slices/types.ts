import type { StateCreator } from 'zustand';

import type { CastingSlice } from '@/stores/player/slices/casting';
import type { DisplaySlice } from '@/stores/player/slices/display';
import type { InterfaceSlice } from '@/stores/player/slices/interface';
import type { PlayingSlice } from '@/stores/player/slices/playing';
import type { ProgressSlice } from '@/stores/player/slices/progress';
import type { SkipSegmentsSlice } from '@/stores/player/slices/skipSegments';
import type { SourceSlice } from '@/stores/player/slices/source';
import type { ThumbnailSlice } from '@/stores/player/slices/thumbnails';

export type AllSlices = InterfaceSlice &
  PlayingSlice &
  ProgressSlice &
  SourceSlice &
  DisplaySlice &
  CastingSlice &
  ThumbnailSlice &
  SkipSegmentsSlice;

export type MakeSlice<Slice> = StateCreator<
  AllSlices,
  [['zustand/immer', never]],
  [],
  Slice
>;
