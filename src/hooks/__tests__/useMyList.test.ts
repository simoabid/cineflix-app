import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMyList } from '../useMyList';
import type { MyListItem } from '../../types/myList';

// Create a mock storage client that satisfies the myListService interface
const createMockStorageClient = () => ({
  getMyList: vi.fn().mockResolvedValue([]),
  getLikedContent: vi.fn().mockResolvedValue([]),
  addToList: vi.fn(),
  removeFromList: vi.fn().mockResolvedValue(undefined),
  updateItem: vi.fn().mockResolvedValue(undefined),
  toggleLike: vi.fn(),
  isLiked: vi.fn().mockResolvedValue(false),
  isInList: vi.fn().mockResolvedValue(false),
  getContinueWatching: vi.fn().mockResolvedValue([]),
  getRecentlyAdded: vi.fn().mockResolvedValue([]),
  getListStats: vi.fn().mockResolvedValue({ totalItems: 0 }),
  getFilteredItems: vi.fn().mockResolvedValue([]),
  searchItems: vi.fn().mockResolvedValue([]),
  likeContent: vi.fn(),
  unlikeContent: vi.fn(),
  getMyListSync: vi.fn().mockReturnValue([]),
  getPreferences: vi.fn().mockResolvedValue({}),
  savePreferences: vi.fn().mockResolvedValue(undefined),
  getCollections: vi.fn().mockResolvedValue([]),
  createCollection: vi.fn(),
  performBulkOperation: vi.fn(),
  getAllTags: vi.fn().mockResolvedValue([]),
});

const mockMovieItem: MyListItem = {
  id: 'item-1',
  contentId: 550,
  contentType: 'movie',
  content: { id: 550, title: 'Fight Club', vote_average: 8.4 } as any,
  dateAdded: '2024-01-01T00:00:00Z',
  status: 'notStarted',
  progress: 0,
  priority: 'medium',
  customTags: [],
  estimatedRuntime: 120,
  isInContinueWatching: false,
  isLiked: false,
};

const mockTVItem: MyListItem = {
  id: 'item-2',
  contentId: 1396,
  contentType: 'tv',
  content: { id: 1396, name: 'Breaking Bad', vote_average: 9.5 } as any,
  dateAdded: '2024-01-02T00:00:00Z',
  status: 'inProgress',
  progress: 45,
  priority: 'high',
  customTags: [],
  estimatedRuntime: 900,
  isInContinueWatching: true,
  isLiked: true,
};

describe('useMyList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial loading', () => {
    it('should start in loading state', () => {
      const mock = createMockStorageClient();
      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      expect(result.current.isLoading).toBe(true);
    });

    it('should load items on mount', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([{ contentId: 550, contentType: 'movie' }]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.myListItems).toEqual([mockMovieItem]);
      expect(mock.getMyList).toHaveBeenCalledTimes(1);
      expect(mock.getLikedContent).toHaveBeenCalledTimes(1);
    });

    it('should handle load errors gracefully', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockRejectedValue(new Error('Network error'));
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useMyList({ storageClient: mock as any, onPersistenceError: onError })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.myListItems).toEqual([]);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('isInList', () => {
    it('should return true for items in the list', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isInList(550, 'movie')).toBe(true);
    });

    it('should return false for items not in the list', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isInList(999, 'movie')).toBe(false);
    });

    it('should differentiate by contentType', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isInList(550, 'movie')).toBe(true);
      expect(result.current.isInList(550, 'tv')).toBe(false);
    });
  });

  describe('isLiked', () => {
    it('should return true for liked items', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([{ contentId: 550, contentType: 'movie' }]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLiked(550, 'movie')).toBe(true);
    });

    it('should return false for non-liked items', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLiked(550, 'movie')).toBe(false);
    });
  });

  describe('addToList', () => {
    it('should add item and update state', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([]);
      mock.addToList.mockResolvedValue(mockMovieItem);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let addedItem: any;
      await act(async () => {
        addedItem = await result.current.addToList({ id: 550, title: 'Fight Club' } as any, 'movie');
      });

      expect(addedItem).toEqual(mockMovieItem);
      expect(result.current.myListItems).toContainEqual(mockMovieItem);
      expect(result.current.isInList(550, 'movie')).toBe(true);
    });

    it('should call onPersistenceError on failure', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([]);
      mock.addToList.mockRejectedValue(new Error('Add failed'));
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useMyList({ storageClient: mock as any, onPersistenceError: onError })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.addToList({ id: 550 } as any, 'movie');
        } catch {
          // expected
        }
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('removeFromList', () => {
    it('should remove item and update state', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.myListItems).toHaveLength(1);

      await act(async () => {
        await result.current.removeFromList('item-1');
      });

      expect(result.current.myListItems).toHaveLength(0);
    });
  });

  describe('toggleLike', () => {
    it('should toggle like status', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([]);
      mock.toggleLike.mockResolvedValue(true);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let liked: boolean;
      await act(async () => {
        liked = await result.current.toggleLike({ id: 550 } as any, 'movie');
      });

      expect(liked!).toBe(true);
      expect(result.current.isLiked(550, 'movie')).toBe(true);
    });

    it('should unlike when toggled again', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([{ contentId: 550, contentType: 'movie' }]);
      mock.toggleLike.mockResolvedValue(false);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isLiked(550, 'movie')).toBe(true);

      await act(async () => {
        await result.current.toggleLike({ id: 550 } as any, 'movie');
      });

      expect(result.current.isLiked(550, 'movie')).toBe(false);
    });
  });

  describe('updateItem', () => {
    it('should update item in state', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateItem('item-1', { progress: 75 });
      });

      const updated = result.current.myListItems.find(i => i.id === 'item-1');
      expect(updated?.progress).toBe(75);
    });
  });

  describe('toggleInList', () => {
    it('should add item if not in list', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([]);
      mock.getLikedContent.mockResolvedValue([]);
      mock.addToList.mockResolvedValue(mockMovieItem);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let added: boolean;
      await act(async () => {
        added = await result.current.toggleInList({ id: 550 } as any, 'movie');
      });

      expect(added!).toBe(true);
    });

    it('should remove item if already in list', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValue([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let removed: boolean;
      await act(async () => {
        removed = await result.current.toggleInList({ id: 550 } as any, 'movie');
      });

      expect(removed!).toBe(false);
      expect(result.current.myListItems).toHaveLength(0);
    });
  });

  describe('loadMyList', () => {
    it('should reload data when called', async () => {
      const mock = createMockStorageClient();
      mock.getMyList.mockResolvedValueOnce([mockMovieItem]);
      mock.getLikedContent.mockResolvedValue([]);

      const { result } = renderHook(() => useMyList({ storageClient: mock as any }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.myListItems).toHaveLength(1);

      // Update mock for next call
      mock.getMyList.mockResolvedValueOnce([mockMovieItem, mockTVItem]);

      await act(async () => {
        await result.current.loadMyList();
      });

      expect(result.current.myListItems).toHaveLength(2);
    });
  });
});
