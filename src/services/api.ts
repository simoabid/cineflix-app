const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
};

export const getAuthToken = () => authToken;

interface ApiResponse<T> { success: boolean; data?: T; error?: string; message?: string; }

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>)
        };

        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        const data = await response.json();
        if (!response.ok) return { success: false, error: data.error || `HTTP error ${response.status}` };
        return data;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

// Auth types
export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    createdAt: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

// Auth API
export const authApi = {
    register: (email: string, password: string, name: string, avatar?: string) =>
        apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, avatar }) }),

    login: (email: string, password: string) =>
        apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),

    getMe: () => apiRequest<{ user: User }>('/auth/me'),

    updateProfile: (data: { name?: string; avatar?: string }) =>
        apiRequest<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

    changePassword: (currentPassword: string, newPassword: string) =>
        apiRequest<void>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
};

export const myListApi = {
    getMyList: () => apiRequest<any[]>('/my-list'),
    addToList: (content: any, contentType: 'movie' | 'tv') => apiRequest<any>('/my-list/add', { method: 'POST', body: JSON.stringify({ content, contentType }) }),
    removeFromList: (itemId: string) => apiRequest<void>(`/my-list/${itemId}`, { method: 'DELETE' }),
    updateItem: (itemId: string, updates: any) => apiRequest<any>(`/my-list/${itemId}`, { method: 'PUT', body: JSON.stringify(updates) }),
    toggleLike: (contentId: number, contentType: 'movie' | 'tv') => apiRequest<{ isLiked: boolean }>('/my-list/toggle-like', { method: 'POST', body: JSON.stringify({ contentId, contentType }) }),
    likeContent: (content: any, contentType: 'movie' | 'tv') => apiRequest<any>('/my-list/like', { method: 'POST', body: JSON.stringify({ content, contentType }) }),
    unlikeContent: (contentId: number, contentType: 'movie' | 'tv') => apiRequest<void>('/my-list/unlike', { method: 'POST', body: JSON.stringify({ contentId, contentType }) }),
    getStats: () => apiRequest<any>('/my-list/stats'),
    searchItems: (query: string, includeNotes = true, includeTags = true) => apiRequest<any[]>(`/my-list/search?query=${encodeURIComponent(query)}&includeNotes=${includeNotes}&includeTags=${includeTags}`),
    bulkOperation: (type: string, itemIds: string[], payload?: any) => apiRequest<void>('/my-list/bulk', { method: 'POST', body: JSON.stringify({ type, itemIds, payload }) }),
    isInList: (contentId: number, contentType: 'movie' | 'tv') => apiRequest<{ inList: boolean; isLiked: boolean }>(`/my-list/check/${contentId}/${contentType}`),
    getLikedContent: () => apiRequest<any[]>('/my-list/liked'),
    getContinueWatching: () => apiRequest<any[]>('/my-list/continue-watching'),
    getRecentlyAdded: (limit = 10) => apiRequest<any[]>(`/my-list/recent?limit=${limit}`),
    getAllTags: () => apiRequest<string[]>('/my-list/tags'),
    updateProgress: (data: { 
        contentId: number; 
        contentType: 'movie' | 'tv'; 
        progress: number; 
        playbackPosition: number; 
        duration: number; 
        content?: any;
        seasonNumber?: number;
        episodeNumber?: number; 
    }) => apiRequest<any>('/my-list/progress', { method: 'POST', body: JSON.stringify(data) }),
};

export const collectionsApi = {
    getCollections: () => apiRequest<any[]>('/collections'),
    createCollection: (name: string, description?: string, color?: string) => apiRequest<any>('/collections', { method: 'POST', body: JSON.stringify({ name, description, color }) }),
    updateCollection: (id: string, updates: any) => apiRequest<any>(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteCollection: (id: string) => apiRequest<void>(`/collections/${id}`, { method: 'DELETE' }),
    addItemToCollection: (collectionId: string, itemId: string) => apiRequest<any>(`/collections/${collectionId}/items`, { method: 'POST', body: JSON.stringify({ itemId }) }),
    removeItemFromCollection: (collectionId: string, itemId: string) => apiRequest<any>(`/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' }),
};

export const preferencesApi = {
    getPreferences: () => apiRequest<any>('/preferences'),
    savePreferences: (preferences: any) => apiRequest<any>('/preferences', { method: 'PUT', body: JSON.stringify(preferences) }),
};

export const watchedEpisodesApi = {
    getWatchedEpisodes: (tvShowId: number) => apiRequest<any[]>(`/watched-episodes/${tvShowId}`),
    toggleWatchedEpisode: (tvShowId: number, seasonNumber: number, episodeNumber: number) =>
        apiRequest<{ success: boolean; watched: boolean }>('/watched-episodes/toggle', {
            method: 'POST',
            body: JSON.stringify({ tvShowId, seasonNumber, episodeNumber })
        }),
};

export const checkBackendHealth = async (): Promise<boolean> => {
    try { const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`); return response.ok; } catch { return false; }
};

export default { auth: authApi, myList: myListApi, collections: collectionsApi, preferences: preferencesApi, checkHealth: checkBackendHealth };
