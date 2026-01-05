import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesApi } from '../services/api';

// Type definition matching backend Preferences model
export interface AccountSettings {
    // View preferences
    defaultViewMode: string;
    defaultSortOption: string;
    defaultSortDirection: string;
    autoRemoveCompleted: boolean;
    autoRemoveAfterDays: number;
    showProgressBars: boolean;
    compactModeItemsPerRow: number;

    // Playback Settings
    videoQuality: string;
    autoplayNext: boolean;
    autoplayPreviews: boolean;
    defaultAudioLang: string;
    defaultSubtitleLang: string;
    downloadQuality: string;
    downloadOverWifiOnly: boolean;

    // Notification Settings
    emailNotifications: boolean;
    pushNotifications: boolean;
    inAppNotifications: boolean;
    newsletterSubscription: boolean;
    newReleaseAlerts: boolean;
    recommendationEmails: boolean;

    // Privacy Settings
    viewingHistoryVisible: boolean;
    profileVisible: boolean;
    dataCollection: boolean;
    personalization: boolean;

    // Accessibility Settings
    highContrast: boolean;
    reduceMotion: boolean;
    screenReaderOptimized: boolean;
    fontSize: string;

    // Language Settings
    interfaceLanguage: string;
    region: string;
    timezone: string;
}

// Default settings (matches backend defaults)
export const defaultSettings: AccountSettings = {
    // View preferences
    defaultViewMode: 'grid',
    defaultSortOption: 'dateAdded',
    defaultSortDirection: 'desc',
    autoRemoveCompleted: false,
    autoRemoveAfterDays: 30,
    showProgressBars: true,
    compactModeItemsPerRow: 10,

    // Playback Settings
    videoQuality: 'auto',
    autoplayNext: true,
    autoplayPreviews: true,
    defaultAudioLang: 'en',
    defaultSubtitleLang: 'off',
    downloadQuality: 'high',
    downloadOverWifiOnly: true,

    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    newsletterSubscription: false,
    newReleaseAlerts: true,
    recommendationEmails: true,

    // Privacy Settings
    viewingHistoryVisible: true,
    profileVisible: true,
    dataCollection: true,
    personalization: true,

    // Accessibility Settings
    highContrast: false,
    reduceMotion: false,
    screenReaderOptimized: false,
    fontSize: 'medium',

    // Language Settings
    interfaceLanguage: 'en',
    region: 'us',
    timezone: 'America/New_York',
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAccountSettingsReturn {
    settings: AccountSettings;
    isLoading: boolean;
    saveStatus: SaveStatus;
    error: string | null;
    updateSetting: <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => void;
    updateSettings: (updates: Partial<AccountSettings>) => void;
    refreshSettings: () => Promise<void>;
}

export const useAccountSettings = (): UseAccountSettingsReturn => {
    const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    // Track pending changes for debounced save
    const pendingChanges = useRef<Partial<AccountSettings>>({});
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousSettingsRef = useRef<AccountSettings>(defaultSettings);

    // Load settings on mount
    const refreshSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await preferencesApi.getPreferences();
            if (response.success && response.data) {
                const loadedSettings = { ...defaultSettings, ...response.data } as AccountSettings;
                setSettings(loadedSettings);
                previousSettingsRef.current = loadedSettings;
            } else {
                setError(response.error || 'Failed to load settings');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    // Debounced save function
    const debouncedSave = useCallback(async () => {
        if (Object.keys(pendingChanges.current).length === 0) return;

        setSaveStatus('saving');
        const changes = { ...pendingChanges.current };
        pendingChanges.current = {};

        try {
            const response = await preferencesApi.savePreferences(changes);
            if (response.success && response.data) {
                // Update with server response to ensure consistency
                const savedSettings = { ...settings, ...response.data } as AccountSettings;
                setSettings(savedSettings);
                previousSettingsRef.current = savedSettings;
                setSaveStatus('saved');
                // Auto-hide "saved" status after 2 seconds
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                // Rollback on error
                setSettings(previousSettingsRef.current);
                setError(response.error || 'Failed to save settings');
                setSaveStatus('error');
            }
        } catch (err) {
            // Rollback on error
            setSettings(previousSettingsRef.current);
            setError('Failed to save settings');
            setSaveStatus('error');
        }
    }, [settings]);

    // Update single setting with optimistic update and debounced save
    const updateSetting = useCallback(<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => {
        // Optimistic update
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));

        // Queue the change
        pendingChanges.current[key] = value;
        setError(null);

        // Clear existing timeout and set new one
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(debouncedSave, 500);
    }, [debouncedSave]);

    // Update multiple settings at once
    const updateSettings = useCallback((updates: Partial<AccountSettings>) => {
        // Optimistic update
        setSettings(prev => ({
            ...prev,
            ...updates
        }));

        // Queue all changes
        Object.assign(pendingChanges.current, updates);
        setError(null);

        // Clear existing timeout and set new one
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(debouncedSave, 500);
    }, [debouncedSave]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        settings,
        isLoading,
        saveStatus,
        error,
        updateSetting,
        updateSettings,
        refreshSettings,
    };
};

export default useAccountSettings;
