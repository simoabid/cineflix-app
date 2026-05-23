import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyListService, ApiError, ValidationError, calculateRuntimePure } from '../myListService';
import type { MyListItem } from '../../types/myList';

// Mock the api module
vi.mock('../api', () => ({
  myListApi: {
    getMyList: vi.fn(),
    addToList: vi.fn(),
    removeFromList: vi.fn(),
    updateItem: vi.fn(),
    toggleLike: vi.fn(),
    likeContent: vi.fn(),
    unlikeContent: vi.fn(),
    getStats: vi.fn(),
    searchItems: vi.fn(),
    bulkOperation: vi.fn(),
    isInList: vi.fn(),
    getLikedContent: vi.fn(),
    getContinueWatching: vi.fn(),
    getRecentlyAdded: vi.fn(),
    getAllTags: vi.fn(),
  },
  collectionsApi: {
    getCollections: vi.fn(),
    createCollection: vi.fn(),
  },
  preferencesApi: {
    getPreferences: vi.fn(),
    savePreferences: vi.fn(),
  },
}));

import { myListApi, collectionsApi, preferencesApi } from '../api';

const mockItem: MyListItem = {
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

// The service uses a module-level listCache singleton. Tests that call
// getMyList() first will populate the cache, affecting subsequent tests.
// We test the fresh-fetch path first, then test cache-dependent methods
// after the cache is populated.

describe('MyListService', () => {
  let service: MyListService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MyListService();
  });

  describe('getMyList', () => {
    it('should return items on success', async () => {
      vi.mocked(myListApi.getMyList).mockResolvedValueOnce({
        success: true,
        data: [mockItem],
      });

      const result = await service.getMyList();
      expect(result).toEqual([mockItem]);
    });

    it('should throw ApiError when API fails and cache is empty', async () => {
      // Use a fresh module to avoid cache from previous tests
      vi.resetModules();
      const { MyListService: FreshService, ApiError: FreshApiError } = await import('../myListService');
      const freshService = new FreshService();
      // Re-apply mock after resetModules
      const { myListApi: freshApi } = await import('../api');
      vi.mocked(freshApi.getMyList).mockResolvedValueOnce({
        success: false,
        error: 'Server error',
      });

      await expect(freshService.getMyList()).rejects.toThrow(FreshApiError);
    });
  });

  describe('addToList', () => {
    it('should add item and return it', async () => {
      vi.mocked(myListApi.addToList).mockResolvedValueOnce({
        success: true,
        data: mockItem,
      });

      const result = await service.addToList({ id: 550, title: 'Fight Club' } as any, 'movie');
      expect(result).toEqual(mockItem);
    });

    it('should throw ValidationError for null content', async () => {
      await expect(service.addToList(null as any, 'movie')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for content without id', async () => {
      await expect(service.addToList({} as any, 'movie')).rejects.toThrow(ValidationError);
    });

    it('should throw ApiError when API returns failure', async () => {
      vi.mocked(myListApi.addToList).mockResolvedValueOnce({
        success: false,
        error: 'Duplicate',
      });

      await expect(service.addToList({ id: 550 } as any, 'movie')).rejects.toThrow(ApiError);
    });
  });

  describe('removeFromList', () => {
    it('should remove item successfully', async () => {
      vi.mocked(myListApi.removeFromList).mockResolvedValueOnce({
        success: true,
      });

      await expect(service.removeFromList('item-1')).resolves.toBeUndefined();
    });

    it('should throw ValidationError for empty itemId', async () => {
      await expect(service.removeFromList('')).rejects.toThrow(ValidationError);
    });

    it('should throw ApiError on failure', async () => {
      vi.mocked(myListApi.removeFromList).mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      await expect(service.removeFromList('item-1')).rejects.toThrow(ApiError);
    });
  });

  describe('toggleLike', () => {
    it('should return true when item is now liked', async () => {
      vi.mocked(myListApi.toggleLike).mockResolvedValueOnce({
        success: true,
        data: { isLiked: true },
      });

      const result = await service.toggleLike(550, 'movie');
      expect(result).toBe(true);
    });

    it('should return false when item is now unliked', async () => {
      vi.mocked(myListApi.toggleLike).mockResolvedValueOnce({
        success: true,
        data: { isLiked: false },
      });

      const result = await service.toggleLike(550, 'movie');
      expect(result).toBe(false);
    });

    it('should throw ApiError on failure', async () => {
      vi.mocked(myListApi.toggleLike).mockResolvedValueOnce({
        success: false,
        error: 'Failed',
      });

      await expect(service.toggleLike(550, 'movie')).rejects.toThrow(ApiError);
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      vi.mocked(myListApi.updateItem).mockResolvedValueOnce({
        success: true,
      });

      await expect(service.updateItem('item-1', { progress: 50 })).resolves.toBeUndefined();
    });

    it('should throw ApiError on failure', async () => {
      vi.mocked(myListApi.updateItem).mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      await expect(service.updateItem('item-1', { progress: 50 })).rejects.toThrow(ApiError);
    });
  });

  describe('isInList', () => {
    it('should return true when item is in list', async () => {
      vi.mocked(myListApi.isInList).mockResolvedValueOnce({
        success: true,
        data: { inList: true, isLiked: false },
      });

      const result = await service.isInList(550, 'movie');
      expect(result).toBe(true);
    });

    it('should return false when item is not in list', async () => {
      vi.mocked(myListApi.isInList).mockResolvedValueOnce({
        success: true,
        data: { inList: false, isLiked: false },
      });

      const result = await service.isInList(550, 'movie');
      expect(result).toBe(false);
    });

    it('should return false on API failure', async () => {
      vi.mocked(myListApi.isInList).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.isInList(550, 'movie');
      expect(result).toBe(false);
    });
  });

  describe('getLikedContent', () => {
    it('should return liked items', async () => {
      const liked = [{ ...mockItem, isLiked: true }];
      vi.mocked(myListApi.getLikedContent).mockResolvedValueOnce({
        success: true,
        data: liked,
      });

      const result = await service.getLikedContent();
      expect(result).toEqual(liked);
    });

    it('should return empty array on failure', async () => {
      vi.mocked(myListApi.getLikedContent).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.getLikedContent();
      expect(result).toEqual([]);
    });
  });

  describe('getListStats', () => {
    it('should return stats on success', async () => {
      const stats = { totalItems: 5, totalMovies: 3, totalTVShows: 2 };
      vi.mocked(myListApi.getStats).mockResolvedValueOnce({
        success: true,
        data: stats,
      });

      const result = await service.getListStats();
      expect(result.totalItems).toBe(5);
    });

    it('should return default stats on failure', async () => {
      vi.mocked(myListApi.getStats).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.getListStats();
      expect(result.totalItems).toBe(0);
    });
  });

  describe('getContinueWatching', () => {
    it('should return continue watching items', async () => {
      vi.mocked(myListApi.getContinueWatching).mockResolvedValueOnce({
        success: true,
        data: [mockItem],
      });

      const result = await service.getContinueWatching();
      expect(result).toEqual([mockItem]);
    });

    it('should return empty array on failure', async () => {
      vi.mocked(myListApi.getContinueWatching).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.getContinueWatching();
      expect(result).toEqual([]);
    });
  });

  describe('getCollections', () => {
    it('should return collections', async () => {
      const collections = [{ id: 'c1', name: 'Favorites', items: [] }];
      vi.mocked(collectionsApi.getCollections).mockResolvedValueOnce({
        success: true,
        data: collections as any,
      });

      const result = await service.getCollections();
      expect(result).toEqual(collections);
    });

    it('should return empty array on failure', async () => {
      vi.mocked(collectionsApi.getCollections).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.getCollections();
      expect(result).toEqual([]);
    });
  });

  describe('getPreferences', () => {
    it('should return preferences on success', async () => {
      const prefs = { defaultViewMode: 'grid' };
      vi.mocked(preferencesApi.getPreferences).mockResolvedValueOnce({
        success: true,
        data: prefs as any,
      });

      const result = await service.getPreferences();
      expect(result).toEqual(prefs);
    });

    it('should return defaults on failure', async () => {
      vi.mocked(preferencesApi.getPreferences).mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      const result = await service.getPreferences();
      expect(result.defaultViewMode).toBe('grid');
    });
  });
});

describe('calculateRuntimePure', () => {
  it('should return movie runtime when available', () => {
    const movie = { runtime: 142 } as any;
    expect(calculateRuntimePure(movie, 'movie')).toBe(142);
  });

  it('should default to 120 for movies without runtime', () => {
    const movie = {} as any;
    expect(calculateRuntimePure(movie, 'movie')).toBe(120);
  });

  it('should calculate TV runtime from episode_run_time and number_of_episodes', () => {
    const tv = { episode_run_time: [45], number_of_episodes: 10 } as any;
    expect(calculateRuntimePure(tv, 'tv')).toBe(450);
  });

  it('should default to 45 min per episode and 20 episodes for TV', () => {
    const tv = {} as any;
    expect(calculateRuntimePure(tv, 'tv')).toBe(900);
  });
});
