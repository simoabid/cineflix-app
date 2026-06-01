import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { createCastingSlice } from '@/stores/player/slices/casting';
import { createDisplaySlice } from '@/stores/player/slices/display';
import { createInterfaceSlice } from '@/stores/player/slices/interface';
import { createPlayingSlice } from '@/stores/player/slices/playing';
import { createProgressSlice } from '@/stores/player/slices/progress';
import { createSkipSegmentsSlice } from '@/stores/player/slices/skipSegments';
import { createSourceSlice } from '@/stores/player/slices/source';
import { createThumbnailSlice } from '@/stores/player/slices/thumbnails';
import type { AllSlices } from '@/stores/player/slices/types';

/**
 * The unified player store combining all 8 slices.
 * Uses Zustand with Immer middleware for immutable state updates.
 *
 * Slices:
 * - InterfaceSlice — UI state (fullscreen, hovering, overlays)
 * - ProgressSlice — Playback time/duration/buffered tracking
 * - PlayingSlice — Play/pause/loading/volume state
 * - SourceSlice — Stream source, metadata, captions, quality, failed tracking
 * - DisplaySlice — DisplayInterface lifecycle and event wiring
 * - CastingSlice — Chromecast state
 * - ThumbnailSlice — Preview thumbnails for scrubber
 * - SkipSegmentsSlice — SponsorBlock-style segment skipping
 */
export const usePlayerStore = create(
  immer<AllSlices>((...a) => ({
    ...createInterfaceSlice(...a),
    ...createProgressSlice(...a),
    ...createPlayingSlice(...a),
    ...createSourceSlice(...a),
    ...createDisplaySlice(...a),
    ...createCastingSlice(...a),
    ...createThumbnailSlice(...a),
    ...createSkipSegmentsSlice(...a),
  })),
);
