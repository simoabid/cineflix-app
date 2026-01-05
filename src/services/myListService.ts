import { MyListItem, CustomCollection, ListStats, FilterOptions, ListPreferences, BulkOperation } from '../types/myList';
import { Movie, TVShow } from '../types';
import { myListApi, collectionsApi, preferencesApi, checkBackendHealth } from './api';

export class ValidationError extends Error { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
export class ApiError extends Error { constructor(message: string) { super(message); this.name = 'ApiError'; } }

let listCache: MyListItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5000;

export function calculateRuntimePure(content: Movie | TVShow, contentType: 'movie' | 'tv'): number {
    if (contentType === 'movie') return (content as Movie).runtime || 120;
    const tvShow = content as TVShow;
    return ((tvShow.episode_run_time?.[0]) || 45) * (tvShow.number_of_episodes || 20);
}

function clearCache(): void { listCache = null; cacheTimestamp = 0; }
function isCacheValid(): boolean { return listCache !== null && Date.now() - cacheTimestamp < CACHE_TTL; }

class MyListService {
    async getMyList(): Promise<MyListItem[]> {
        if (isCacheValid()) return listCache!;
        const response = await myListApi.getMyList();
        if (response.success && response.data) { listCache = response.data; cacheTimestamp = Date.now(); return response.data; }
        throw new ApiError(response.error || 'Failed to get list');
    }

    getMyListSync(): MyListItem[] { return listCache || []; }

    async addToList(content: Movie | TVShow, contentType: 'movie' | 'tv'): Promise<MyListItem> {
        if (!content || (content as any).id == null) throw new ValidationError('content must be provided and contain an id');
        const response = await myListApi.addToList(content, contentType);
        if (response.success && (response.data || (response as any).item)) { clearCache(); return (response.data || (response as any).item) as MyListItem; }
        throw new ApiError(response.error || 'Failed to add to list');
    }

    async removeFromList(itemId: string): Promise<void> {
        if (!itemId) throw new ValidationError('itemId must be a non-empty string');
        const response = await myListApi.removeFromList(itemId);
        if (response.success) { clearCache(); return; }
        throw new ApiError(response.error || 'Failed to remove from list');
    }

    async toggleLike(contentId: number, contentType: 'movie' | 'tv'): Promise<boolean> {
        const response = await myListApi.toggleLike(contentId, contentType);
        if (response.success) { clearCache(); return response.data?.isLiked || false; }
        throw new ApiError(response.error || 'Failed to toggle like');
    }

    async isLiked(contentId: number, contentType: 'movie' | 'tv'): Promise<boolean> {
        const response = await myListApi.isInList(contentId, contentType);
        return response.success ? response.data?.isLiked || false : false;
    }

    async getLikedContent(): Promise<MyListItem[]> {
        const response = await myListApi.getLikedContent();
        return response.success ? response.data || [] : [];
    }

    async likeContent(content: any, contentType: 'movie' | 'tv'): Promise<MyListItem> {
        if (!content || content.id == null) throw new ValidationError('content must be provided and contain an id');
        const response = await myListApi.likeContent(content, contentType);
        if (response.success && (response.data || (response as any).item)) { clearCache(); return (response.data || (response as any).item) as MyListItem; }
        throw new ApiError(response.error || 'Failed to like content');
    }

    async unlikeContent(contentId: number, contentType: 'movie' | 'tv'): Promise<void> {
        const response = await myListApi.unlikeContent(contentId, contentType);
        if (response.success) { clearCache(); return; }
        throw new ApiError(response.error || 'Failed to unlike content');
    }

    async updateItem(itemId: string, updates: Partial<MyListItem>): Promise<void> {
        const response = await myListApi.updateItem(itemId, updates);
        if (response.success) { clearCache(); return; }
        throw new ApiError(response.error || 'Failed to update item');
    }

    async isInList(contentId: number, contentType: 'movie' | 'tv'): Promise<boolean> {
        const response = await myListApi.isInList(contentId, contentType);
        return response.success ? response.data?.inList || false : false;
    }

    async getFilteredItems(filters: FilterOptions, sortBy: string, sortDirection: 'asc' | 'desc'): Promise<MyListItem[]> {
        const items = await this.getMyList();
        let filtered = [...items];
        if (filters.contentType !== 'all') filtered = filtered.filter(item => item.contentType === filters.contentType);
        if (filters.status !== 'all') filtered = filtered.filter(item => item.status === filters.status);
        if (filters.liked && filters.liked !== 'all') filtered = filtered.filter(item => filters.liked === 'liked' ? item.isLiked : !item.isLiked);
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortBy === 'dateAdded') { aVal = new Date(a.dateAdded); bVal = new Date(b.dateAdded); }
            else if (sortBy === 'title') { aVal = (a.content as any).title || (a.content as any).name || ''; bVal = (b.content as any).title || (b.content as any).name || ''; }
            else if (sortBy === 'rating') { aVal = a.content.vote_average ?? 0; bVal = b.content.vote_average ?? 0; }
            else return 0;
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }

    async searchItems(query: string, includeNotes = true, includeTags = true): Promise<MyListItem[]> {
        const response = await myListApi.searchItems(query, includeNotes, includeTags);
        return response.success ? response.data || [] : [];
    }

    async getListStats(): Promise<ListStats> {
        const response = await myListApi.getStats();
        if (response.success && response.data) return response.data;
        return { totalItems: 0, totalMovies: 0, totalTVShows: 0, totalHours: 0, completionRate: 0, averageRating: 0, genreDistribution: {}, statusDistribution: { notStarted: 0, inProgress: 0, completed: 0, dropped: 0 }, monthlyAdditions: {} };
    }

    async performBulkOperation(operation: BulkOperation): Promise<void> {
        const response = await myListApi.bulkOperation(operation.type, operation.itemIds, operation.payload);
        if (response.success) { clearCache(); return; }
        throw new ApiError(response.error || 'Failed to perform bulk operation');
    }

    async getCollections(): Promise<CustomCollection[]> {
        const response = await collectionsApi.getCollections();
        return response.success ? response.data || [] : [];
    }

    async createCollection(name: string, description?: string): Promise<CustomCollection> {
        const response = await collectionsApi.createCollection(name, description);
        if (response.success && response.data) return response.data;
        throw new ApiError(response.error || 'Failed to create collection');
    }

    async getPreferences(): Promise<ListPreferences> {
        const response = await preferencesApi.getPreferences();
        if (response.success && response.data) return response.data;
        return { defaultViewMode: 'grid', defaultSortOption: 'dateAdded', defaultSortDirection: 'desc', autoRemoveCompleted: false, autoRemoveAfterDays: 30, showProgressBars: true, enableNotifications: true, compactModeItemsPerRow: 10 };
    }

    async savePreferences(preferences: ListPreferences): Promise<void> {
        const response = await preferencesApi.savePreferences(preferences);
        if (!response.success) throw new ApiError(response.error || 'Failed to save preferences');
    }

    async getContinueWatching(): Promise<MyListItem[]> {
        const response = await myListApi.getContinueWatching();
        return response.success ? response.data || [] : [];
    }

    async getRecentlyAdded(limit = 10): Promise<MyListItem[]> {
        const response = await myListApi.getRecentlyAdded(limit);
        return response.success ? response.data || [] : [];
    }

    async getAllTags(): Promise<string[]> {
        const response = await myListApi.getAllTags();
        return response.success ? response.data || [] : [];
    }
}

export const myListService = new MyListService();
export { MyListService };
