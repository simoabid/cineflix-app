import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { PlayerMeta } from '@/stores/player/slices/source';

export interface BookmarkMediaItem {
  title: string;
  year?: number;
  poster?: string;
  type: 'show' | 'movie';
  updatedAt: number;
  favoriteEpisodes?: string[];
}

interface BookmarkStore {
  bookmarks: Record<string, BookmarkMediaItem>;
  addBookmark(meta: PlayerMeta): void;
  removeBookmark(id: string): void;
  toggleFavoriteEpisode(
    showId: string,
    episodeId: string,
    meta?: Partial<BookmarkMediaItem>,
  ): void;
  isEpisodeFavorited(showId: string, episodeId: string): boolean;
  getFavoriteEpisodes(showId: string): string[];
}

export const useBookmarkStore = create(
  persist(
    immer<BookmarkStore>((set, get) => ({
      bookmarks: {},
      addBookmark(meta) {
        set((s) => {
          s.bookmarks[meta.tmdbId] = {
            type: meta.type,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
            updatedAt: Date.now(),
          };
        });
      },
      removeBookmark(id) {
        set((s) => {
          delete s.bookmarks[id];
        });
      },
      toggleFavoriteEpisode(showId, episodeId, meta) {
        set((s) => {
          const item =
            s.bookmarks[showId] ??
            (s.bookmarks[showId] = {
              title: meta?.title ?? 'Unknown Show',
              type: 'show',
              year: meta?.year,
              poster: meta?.poster,
              updatedAt: Date.now(),
              favoriteEpisodes: [],
            });
          item.favoriteEpisodes ??= [];
          if (item.favoriteEpisodes.includes(episodeId)) {
            item.favoriteEpisodes = item.favoriteEpisodes.filter(
              (id) => id !== episodeId,
            );
          } else {
            item.favoriteEpisodes.push(episodeId);
          }
          item.updatedAt = Date.now();
        });
      },
      isEpisodeFavorited(showId, episodeId) {
        return get().bookmarks[showId]?.favoriteEpisodes?.includes(episodeId) ?? false;
      },
      getFavoriteEpisodes(showId) {
        return get().bookmarks[showId]?.favoriteEpisodes ?? [];
      },
    })),
    { name: '__CINEFLIX::bookmarks' },
  ),
);
