import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { PlayerMeta } from "@/stores/player/slices/source";
import { useWatchHistoryStore } from "@/stores/watchHistory";
import {
  ProgressModificationOptions,
  ProgressModificationResult,
  modifyProgressItems,
} from "@/utils/progressModifications";

import { progressService } from "@/services/progressService";

export { getProgressPercentage } from "./utils";

export function getSavedProgress(
  items: Record<string, ProgressMediaItem>,
  meta: PlayerMeta | null
): number {
  if (!meta) return 0;
  const item = items[meta.tmdbId];
  if (!item) return 0;
  if (meta.type === "movie") {
    if (!item.progress) return 0;
    return item.progress.watched;
  }

  // It's a show.
  if (!meta.episode) return 0;

  // Let's try matching by episode tmdbId.
  let ep = item.episodes[meta.episode.tmdbId];
  if (ep) return ep.progress.watched;

  // Fallback to match by season and episode number (synthetic vs real ID matching)
  const targetEpisodeNumber = meta.episode.number;
  const targetSeasonNumber = meta.season?.number;

  if (targetEpisodeNumber !== undefined && targetSeasonNumber !== undefined) {
    const foundEp = Object.values(item.episodes).find((episode) => {
      const season = item.seasons[episode.seasonId];
      return episode.number === targetEpisodeNumber && (!season || season.number === targetSeasonNumber);
    });

    if (foundEp) {
      return foundEp.progress.watched;
    }
  }

  return 0;
}

export interface ProgressItem {
  watched: number;
  duration: number;
}

export interface ProgressSeasonItem {
  title: string;
  number: number;
  id: string;
}

export interface ProgressEpisodeItem {
  title: string;
  number: number;
  id: string;
  seasonId: string;
  updatedAt: number;
  progress: ProgressItem;
}

export interface ProgressMediaItem {
  title: string;
  year?: number;
  poster?: string;
  type: "show" | "movie";
  progress?: ProgressItem;
  updatedAt: number;
  seasons: Record<string, ProgressSeasonItem>;
  episodes: Record<string, ProgressEpisodeItem>;
}

export interface ProgressUpdateItem {
  title?: string;
  year?: number;
  poster?: string;
  type?: "show" | "movie";
  progress?: ProgressItem;
  tmdbId: string;
  id: string;
  episodeId?: string;
  seasonId?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  action: "upsert" | "delete";
}

export interface UpdateItemOptions {
  meta: PlayerMeta;
  progress: ProgressItem;
}

export interface ProgressStore {
  items: Record<string, ProgressMediaItem>;
  updateQueue: ProgressUpdateItem[];
  updateItem(ops: UpdateItemOptions): void;
  removeItem(id: string): void;
  replaceItems(items: Record<string, ProgressMediaItem>): void;
  modifyProgressItems(
    progressIds: string[],
    options: ProgressModificationOptions,
  ): ProgressModificationResult;
  clear(): void;
  clearUpdateQueue(): void;
  removeUpdateItem(id: string): void;
}

let updateId = 0;

export const useProgressStore = create(
  persist(
    immer<ProgressStore>((set) => ({
      items: {},
      updateQueue: [],
      removeItem(id) {
        set((s) => {
          updateId += 1;
          s.updateQueue.push({
            id: updateId.toString(),
            action: "delete",
            tmdbId: id,
          });

          delete s.items[id];
        });
      },
      replaceItems(items: Record<string, ProgressMediaItem>) {
        set((s) => {
          s.items = items;
        });
      },
      updateItem({ meta, progress }) {
        set((s) => {
          // add to updateQueue
          updateId += 1;
          s.updateQueue.push({
            tmdbId: meta.tmdbId,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
            type: meta.type,
            progress: { ...progress },
            id: updateId.toString(),
            episodeId: meta.episode?.tmdbId,
            seasonId: meta.season?.tmdbId,
            seasonNumber: meta.season?.number,
            episodeNumber: meta.episode?.number,
            action: "upsert",
          });

          // add to progress store
          if (!s.items[meta.tmdbId])
            s.items[meta.tmdbId] = {
              type: meta.type,
              episodes: {},
              seasons: {},
              updatedAt: 0,
              title: meta.title,
              year: meta.releaseYear,
              poster: meta.poster,
            };
          const item = s.items[meta.tmdbId];
          item.updatedAt = Date.now();

          if (meta.type === "movie") {
            if (!item.progress)
              item.progress = {
                duration: 0,
                watched: 0,
              };

            const wasCompleted =
              item.progress.duration > 0 &&
              item.progress.watched / item.progress.duration > 0.9;
            item.progress = { ...progress };

            // Update watch history only if becoming completed
            const isCompleted =
              progress.duration > 0 &&
              progress.watched / progress.duration > 0.9;
            if (isCompleted && !wasCompleted) {
              useWatchHistoryStore.getState().addItem(meta, progress, true);
            }
            return;
          }

          if (!meta.episode || !meta.season) return;

          if (!item.seasons[meta.season.tmdbId])
            item.seasons[meta.season.tmdbId] = {
              id: meta.season.tmdbId,
              number: meta.season.number,
              title: meta.season.title,
            };

          if (!item.episodes[meta.episode.tmdbId])
            item.episodes[meta.episode.tmdbId] = {
              id: meta.episode.tmdbId,
              number: meta.episode.number,
              title: meta.episode.title,
              seasonId: meta.season.tmdbId,
              updatedAt: Date.now(),
              progress: {
                duration: 0,
                watched: 0,
              },
            };

          const episodeItem = item.episodes[meta.episode.tmdbId];
          const wasCompleted =
            episodeItem.progress.duration > 0 &&
            episodeItem.progress.watched / episodeItem.progress.duration > 0.9;
          episodeItem.progress = { ...progress };

          // Update watch history only if becoming completed
          const isCompleted =
            progress.duration > 0 && progress.watched / progress.duration > 0.9;
          if (isCompleted && !wasCompleted) {
            useWatchHistoryStore.getState().addItem(meta, progress, true);
          }
        });

        try {
          const contentId = parseInt(meta.tmdbId, 10);
          const contentType: "movie" | "tv" = meta.type === "movie" ? "movie" : "tv";
          const progressPercent = progress.duration > 0 ? Math.min(100, Math.round((progress.watched / progress.duration) * 100)) : 0;
          const content = {
            id: contentId,
            title: meta.title,
            name: meta.title,
            poster_path: meta.poster,
            overview: meta.overview,
            ...(meta.type === "movie"
              ? { runtime: Math.round(progress.duration / 60) }
              : { episode_run_time: [Math.round(progress.duration / 60)], number_of_episodes: 20 }
            )
          };

          const progressData = {
            contentId,
            contentType,
            progress: progressPercent,
            playbackPosition: progress.watched,
            duration: progress.duration,
            content,
            seasonNumber: meta.season?.number,
            episodeNumber: meta.episode?.number
          };

          // With httpOnly cookies, we can't directly check auth state from JS.
          // Always attempt API sync — the server will ignore unauthenticated requests gracefully.
          const isAuth = true;


          progressService.saveProgress(progressData, isAuth);
        } catch (err) {
          console.error("Failed to sync progress with progressService", err);
        }
      },
      clear() {
        set((s) => {
          s.items = {};
        });
      },
      clearUpdateQueue() {
        set((s) => {
          s.updateQueue = [];
        });
      },
      removeUpdateItem(id: string) {
        set((s) => {
          s.updateQueue = [...s.updateQueue.filter((v) => v.id !== id)];
        });
      },
      modifyProgressItems(
        progressIds: string[],
        options: ProgressModificationOptions,
      ): ProgressModificationResult {
        let result: ProgressModificationResult = {
          modifiedIds: [],
          hasChanges: false,
        };

        set((s) => {
          const { modifiedProgressItems, result: modificationResult } =
            modifyProgressItems(s.items, progressIds, options);
          s.items = modifiedProgressItems;
          result = modificationResult;

          // Add to update queue for modified progress items
          if (result.hasChanges) {
            result.modifiedIds.forEach((progressId) => {
              const progressItem = s.items[progressId];
              if (progressItem) {
                updateId += 1;
                s.updateQueue.push({
                  id: updateId.toString(),
                  action: "upsert",
                  tmdbId: progressId,
                  title: progressItem.title,
                  year: progressItem.year,
                  poster: progressItem.poster,
                  type: progressItem.type,
                  progress: progressItem.progress,
                });
              }
            });
          }
        });

        return result;
      },
    })),
    {
      name: "__MW::progress",
    },
  ),
);
