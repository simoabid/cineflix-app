import { useCallback } from 'react';

import {
  playerStatus,
  type Caption,
  type CaptionListItem,
  type PlayerMeta,
  type PlayerStatus,
} from '@/stores/player/slices/source';
import { usePlayerStore } from '@/stores/player/store';
import type { SourceSliceSource } from '@/stores/player/utils/qualities';

export interface UsePlayerReturn {
  meta: PlayerMeta | null;
  reset: () => void;
  status: PlayerStatus;
  setStatus: (status: PlayerStatus) => void;
  setMeta: (meta: PlayerMeta, status?: PlayerStatus) => void;
  setEmbedId: (embedId: string | null) => void;
  setCaption: (caption: Caption | null) => void;
  playMedia: (
    source: SourceSliceSource,
    captions: CaptionListItem[],
    sourceId: string | null,
    startAt?: number,
    sourceOrigin?: 'pstream' | 'cinepro',
    cineproProviderName?: string | null,
  ) => void;
  setScrapeNotFound: () => void;
  setScrapeStatus: () => void;
  setPlaybackError: () => void;
}

/**
 * High-level player control hook.
 * Provides a clean API for the player page to:
 * - Set metadata and transition status
 * - Start playback with source/captions
 * - Handle error states
 * - Reset the player
 * - Track source origins
 */
export function usePlayer(): UsePlayerReturn {
  const setStatus = usePlayerStore((s) => s.setStatus);
  const setMeta = usePlayerStore((s) => s.setMeta);
  const setSource = usePlayerStore((s) => s.setSource);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const setEmbedId = usePlayerStore((s) => s.setEmbedId);
  const status = usePlayerStore((s) => s.status);
  const meta = usePlayerStore((s) => s.meta);
  const reset = usePlayerStore((s) => s.reset);
  const setCaption = usePlayerStore((s) => s.setCaption);

  const playMedia = useCallback(
    (
      source: SourceSliceSource,
      captions: CaptionListItem[],
      sourceId: string | null,
      startAt?: number,
      sourceOrigin?: 'pstream' | 'cinepro',
      cineproProviderName?: string | null,
    ) => {
      setSource(source, captions, startAt ?? 0, sourceOrigin, cineproProviderName);
      setSourceId(sourceId);
    },
    [setSource, setSourceId],
  );

  const setScrapeNotFound = useCallback(() => {
    setStatus(playerStatus.SCRAPE_NOT_FOUND);
  }, [setStatus]);

  const setScrapeStatus = useCallback(() => {
    setStatus(playerStatus.SCRAPING);
  }, [setStatus]);

  const setPlaybackError = useCallback(() => {
    setStatus(playerStatus.PLAYBACK_ERROR);
  }, [setStatus]);

  return {
    meta,
    reset,
    status,
    setStatus,
    setMeta,
    setEmbedId,
    setCaption,
    playMedia,
    setScrapeNotFound,
    setScrapeStatus,
    setPlaybackError,
  };
}
