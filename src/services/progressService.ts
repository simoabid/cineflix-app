import { myListApi } from './api';

const STORAGE_KEY = 'cineflix_watch_progress';

export interface ProgressData {
    contentId: number;
    contentType: 'movie' | 'tv';
    progress: number; // 0-100
    playbackPosition: number; // seconds
    duration: number; // seconds
    content?: any; // minimal content data context
    seasonNumber?: number;
    episodeNumber?: number;
    timestamp: number; // last updated
}

class ProgressService {
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingUpdates: Map<string, ProgressData> = new Map();

    // Save progress (debounced)
    saveProgress(data: Omit<ProgressData, 'timestamp'>, isAuthenticated: boolean) {
        const key = `${data.contentType}_${data.contentId}`;
        const fullData = { ...data, timestamp: Date.now() };

        // 1. Update Local Storage instantly (fallback/offline)
        this.saveToLocal(key, fullData);

        // 2. If authenticated, debounce push to API
        if (isAuthenticated) {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.pendingUpdates.set(key, fullData);

            this.debounceTimer = setTimeout(() => {
                this.flushPendingUpdates();
            }, 5000); // Sync every 5 seconds or on page leave
        }
    }

    // Get progress for a specific item
    getProgress(contentId: number, contentType: 'movie' | 'tv'): ProgressData | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            const key = `${contentType}_${contentId}`;
            return parsed[key] || null;
        } catch {
            return null;
        }
    }

    // Private: Save single item to localStorage map
    private saveToLocal(key: string, data: ProgressData) {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const parsed = stored ? JSON.parse(stored) : {};
            parsed[key] = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {
            console.warn('Failed to save progress locally', e);
        }
    }

    // Private: Push pending updates to Backend
    private async flushPendingUpdates() {
        if (this.pendingUpdates.size === 0) return;

        const updates = Array.from(this.pendingUpdates.values());
        this.pendingUpdates.clear();

        for (const update of updates) {
            try {
                await myListApi.updateProgress({
                    contentId: update.contentId,
                    contentType: update.contentType,
                    progress: update.progress,
                    playbackPosition: update.playbackPosition,
                    duration: update.duration,
                    content: update.content,
                    seasonNumber: update.seasonNumber,
                    episodeNumber: update.episodeNumber
                });
            } catch (e) {
                console.error('Failed to sync progress to cloud', e);
            }
        }
    }

    // Sync local progress to cloud (called on login)
    async syncLocalToCloud() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;

            const parsed = JSON.parse(stored);
            const items: ProgressData[] = Object.values(parsed);

            for (const item of items) {
                // Send all local history to cloud.
                // In a real app, you might check timestamps to merge smarter.
                await myListApi.updateProgress({
                    contentId: item.contentId,
                    contentType: item.contentType,
                    progress: item.progress,
                    playbackPosition: item.playbackPosition,
                    duration: item.duration,
                    content: item.content,
                    seasonNumber: item.seasonNumber,
                    episodeNumber: item.episodeNumber
                });
            }

            // Optional: Clear local storage after successful sync? 
            // Better to keep it as cache/backup, or clear only if design requires strict cloud-only.
            // For now, we keep it.
        } catch (e) {
            console.error('Sync failed', e);
        }
    }
}

export const progressService = new ProgressService();
