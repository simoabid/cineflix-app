import { useState, useEffect, useCallback } from 'react';
import { myListService } from '../services/myListService';
import { MyListItem } from '../types/myList';
import { Movie, TVShow } from '../types';

type ContentType = 'movie' | 'tv';

type UseMyListOptions = {
  storageClient?: typeof myListService;
  onPersistenceError?: (error: unknown) => void;
  onRetry?: () => void;
};

type UseMyListReturn = {
  myListItems: MyListItem[];
  isLoading: boolean;
  isInList: (contentId: number, contentType: ContentType) => boolean;
  isLiked: (contentId: number, contentType: ContentType) => boolean;
  addToList: (content: Movie | TVShow, contentType: ContentType) => Promise<MyListItem | undefined>;
  removeFromList: (itemId: string) => Promise<void>;
  removeByContentId: (contentId: number, contentType: ContentType) => Promise<void>;
  toggleLike: (content: Movie | TVShow, contentType: ContentType) => Promise<boolean>;
  updateItem: (itemId: string, updates: Partial<MyListItem>) => Promise<void>;
  updateProgress: (contentId: number, contentType: ContentType, progress: number) => Promise<void>;
  toggleInList: (content: Movie | TVShow, contentType: ContentType) => Promise<boolean>;
  getStats: () => Promise<any>;
  getContinueWatching: () => Promise<MyListItem[]>;
  getRecentlyAdded: (limit?: number) => Promise<MyListItem[]>;
  loadMyList: () => Promise<void>;
};

const determineStatusFromProgress = (progress: number): MyListItem['status'] => {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'inProgress';
  return 'notStarted';
};

const findItemByContent = (
  items: MyListItem[],
  contentId: number,
  contentType: ContentType
): MyListItem | undefined => {
  return items.find(item => item.contentId === contentId && item.contentType === contentType);
};

export const useMyList = (options?: UseMyListOptions): UseMyListReturn => {
  const storageClient = options?.storageClient ?? myListService;
  const onPersistenceError = options?.onPersistenceError;
  const onRetry = options?.onRetry;

  const [myListItems, setMyListItems] = useState<MyListItem[]>([]);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const handlePersistenceError = useCallback((error: unknown, contextMessage?: string) => {
    try {
      if (contextMessage) console.error(contextMessage, error);
      else console.error('Persistence error:', error);
      if (typeof onPersistenceError === 'function') onPersistenceError(error);
      if (typeof onRetry === 'function') onRetry();
    } catch (handlerError) {
      console.error('Error while handling persistence error:', handlerError);
    }
  }, [onPersistenceError, onRetry]);

  // Load my list items and liked items - async
  const loadMyList = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, liked] = await Promise.all([
        storageClient.getMyList(),
        storageClient.getLikedContent()
      ]);
      setMyListItems(Array.isArray(items) ? items : []);

      const likedSet = new Set<string>();
      if (Array.isArray(liked)) {
        liked.forEach(item => likedSet.add(`${item.contentType}_${item.contentId}`));
      }
      setLikedItems(likedSet);

    } catch (error) {
      handlePersistenceError(error, 'Error loading My List data:');
      setMyListItems([]);
      setLikedItems(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [storageClient, handlePersistenceError]);

  // Check if item is in list - uses local state for sync access
  const isInList = useCallback((contentId: number, contentType: ContentType) => {
    return myListItems.some(item => item.contentId === contentId && item.contentType === contentType);
  }, [myListItems]);

  // Check if item is liked
  const isLiked = useCallback((contentId: number, contentType: ContentType) => {
    return likedItems.has(`${contentType}_${contentId}`);
  }, [likedItems]);

  // Add item to list - async
  const addToList = useCallback(async (content: Movie | TVShow, contentType: ContentType) => {
    try {
      const newItem = await storageClient.addToList(content, contentType);
      setMyListItems(prev => [...prev, newItem]);
      return newItem;
    } catch (error) {
      handlePersistenceError(error, 'Error adding to My List:');
      throw error;
    }
  }, [storageClient, handlePersistenceError]);

  // Remove item from list - async
  const removeFromList = useCallback(async (itemId: string) => {
    try {
      await storageClient.removeFromList(itemId);
      setMyListItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      handlePersistenceError(error, 'Error removing from My List:');
      throw error;
    }
  }, [storageClient, handlePersistenceError]);

  // Remove by content ID - async
  const removeByContentId = useCallback(async (contentId: number, contentType: ContentType) => {
    try {
      const itemToRemove = findItemByContent(myListItems, contentId, contentType);
      if (itemToRemove) {
        await removeFromList(itemToRemove.id);
      }
    } catch (error) {
      handlePersistenceError(error, 'Error removing from My List by content id:');
      throw error;
    }
  }, [myListItems, removeFromList, handlePersistenceError]);

  // Toggle like status
  const toggleLike = useCallback(async (content: Movie | TVShow, contentType: ContentType) => {
    try {
      const isNowLiked = await storageClient.toggleLike(content.id, contentType);

      setLikedItems(prev => {
        const newSet = new Set(prev);
        const key = `${contentType}_${content.id}`;
        if (isNowLiked) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });

      return isNowLiked;
    } catch (error) {
      handlePersistenceError(error, 'Error toggling like:');
      throw error;
    }
  }, [storageClient, handlePersistenceError]);

  // Update item - async
  const updateItem = useCallback(async (itemId: string, updates: Partial<MyListItem>) => {
    try {
      await storageClient.updateItem(itemId, updates);
      setMyListItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    } catch (error) {
      handlePersistenceError(error, 'Error updating My List item:');
      throw error;
    }
  }, [storageClient, handlePersistenceError]);

  // Update progress - async
  const updateProgress = useCallback(async (contentId: number, contentType: ContentType, progress: number) => {
    try {
      const item = findItemByContent(myListItems, contentId, contentType);
      if (item) {
        const status = determineStatusFromProgress(progress);
        await updateItem(item.id, {
          progress,
          status,
          lastWatched: new Date().toISOString(),
          isInContinueWatching: progress > 0 && progress < 100
        });
      }
    } catch (error) {
      handlePersistenceError(error, 'Error updating progress:');
      throw error;
    }
  }, [myListItems, updateItem, handlePersistenceError]);

  // Get list stats - async
  const getStats = useCallback(async () => {
    try {
      return await storageClient.getListStats();
    } catch (error) {
      handlePersistenceError(error, 'Error getting My List stats:');
      return null;
    }
  }, [storageClient, handlePersistenceError]);

  // Get continue watching items - async
  const getContinueWatching = useCallback(async () => {
    try {
      return await storageClient.getContinueWatching();
    } catch (error) {
      handlePersistenceError(error, 'Error getting continue watching items:');
      return [];
    }
  }, [storageClient, handlePersistenceError]);

  // Get recently added items - async
  const getRecentlyAdded = useCallback(async (limit?: number) => {
    try {
      return await storageClient.getRecentlyAdded(limit);
    } catch (error) {
      handlePersistenceError(error, 'Error getting recently added items:');
      return [];
    }
  }, [storageClient, handlePersistenceError]);

  // Toggle item in list - async
  const toggleInList = useCallback(async (content: Movie | TVShow, contentType: ContentType) => {
    const inList = isInList(content.id, contentType);

    if (inList) {
      await removeByContentId(content.id, contentType);
      return false;
    } else {
      await addToList(content, contentType);
      return true;
    }
  }, [isInList, removeByContentId, addToList]);

  // Load data on mount
  useEffect(() => {
    loadMyList();
  }, [loadMyList]);

  return {
    myListItems,
    isLoading,
    isInList,
    isLiked,
    addToList,
    removeFromList,
    removeByContentId,
    toggleLike,
    updateItem,
    updateProgress,
    toggleInList,
    getStats,
    getContinueWatching,
    getRecentlyAdded,
    loadMyList
  };
};

export default useMyList;