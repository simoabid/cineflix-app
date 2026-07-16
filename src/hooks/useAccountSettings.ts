import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

    // Support / monetization (Phase 1)
    showSupportAds: boolean;
    isSupporter: boolean;
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

    // Support / monetization
    showSupportAds: true,
    isSupporter: false,
};

/** localStorage key for guest preferences (device-only). */
export const GUEST_SETTINGS_STORAGE_KEY = '__CINEFLIX::settings';

/**
 * Global preference keys safe to merge from guest localStorage into a
 * brand-new (all-default) cloud profile on first login.
 * Account-bound keys (email notifications, profile visibility, etc.) are excluded.
 */
export const GLOBAL_MERGE_KEYS: readonly (keyof AccountSettings)[] = [
    'defaultViewMode',
    'defaultSortOption',
    'defaultSortDirection',
    'autoRemoveCompleted',
    'autoRemoveAfterDays',
    'showProgressBars',
    'compactModeItemsPerRow',
    'videoQuality',
    'autoplayNext',
    'autoplayPreviews',
    'defaultAudioLang',
    'defaultSubtitleLang',
    'downloadQuality',
    'downloadOverWifiOnly',
    'inAppNotifications',
    'dataCollection',
    'personalization',
    'highContrast',
    'reduceMotion',
    'screenReaderOptimized',
    'fontSize',
    'interfaceLanguage',
    'region',
    'timezone',
    'showSupportAds',
    // Never merge isSupporter from device storage — honor/support status must not
    // be elevated solely because guest localStorage claimed it before login.
] as const;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type SettingsPersistenceMode = 'local' | 'cloud';

interface UseAccountSettingsReturn {
    settings: AccountSettings;
    isLoading: boolean;
    saveStatus: SaveStatus;
    error: string | null;
    /** 'local' for guests, 'cloud' for signed-in users */
    persistenceMode: SettingsPersistenceMode;
    updateSetting: <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => void;
    updateSettings: (updates: Partial<AccountSettings>) => void;
    refreshSettings: () => Promise<void>;
}

/** Sanitize raw storage/API payload into a full AccountSettings object. */
export function sanitizeSettings(raw: unknown): AccountSettings {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ...defaultSettings };
    }

    const source = raw as Record<string, unknown>;
    const result: Record<string, unknown> = { ...defaultSettings };

    for (const key of Object.keys(defaultSettings) as (keyof AccountSettings)[]) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
        const value = source[key as string];
        const expected = defaultSettings[key];

        if (typeof expected === 'boolean' && typeof value === 'boolean') {
            result[key] = value;
        } else if (typeof expected === 'number' && typeof value === 'number' && Number.isFinite(value)) {
            result[key] = value;
        } else if (typeof expected === 'string' && typeof value === 'string') {
            result[key] = value;
        }
    }

    return result as unknown as AccountSettings;
}

/** Read guest settings from localStorage (safe parse + allowlist). */
export function loadGuestSettings(): AccountSettings {
    try {
        const raw = localStorage.getItem(GUEST_SETTINGS_STORAGE_KEY);
        if (!raw) return { ...defaultSettings };
        const parsed = JSON.parse(raw) as unknown;
        // Support versioned envelope `{ v: 1, ...fields }` or flat object
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const obj = parsed as Record<string, unknown>;
            if ('v' in obj) {
                const fields = { ...obj };
                delete fields.v;
                return sanitizeSettings(fields);
            }
            return sanitizeSettings(obj);
        }
        return { ...defaultSettings };
    } catch {
        return { ...defaultSettings };
    }
}

/** Persist guest settings to localStorage (re-sanitize so only allowlisted fields are written). */
export function saveGuestSettings(settings: AccountSettings): void {
    try {
        const clean = sanitizeSettings(settings);
        const payload = { v: 1, ...clean };
        localStorage.setItem(GUEST_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage full or unavailable — fail silently
    }
}

/** True when every field matches defaultSettings (new cloud profile). */
export function isAllDefaultSettings(settings: AccountSettings): boolean {
    return (Object.keys(defaultSettings) as (keyof AccountSettings)[]).every(
        (key) => settings[key] === defaultSettings[key],
    );
}

/** Diff of guest global keys that differ from defaults. */
export function getGuestGlobalOverrides(guest: AccountSettings): Partial<AccountSettings> {
    const overrides: Partial<AccountSettings> = {};
    for (const key of GLOBAL_MERGE_KEYS) {
        if (guest[key] !== defaultSettings[key]) {
            (overrides as Record<string, unknown>)[key] = guest[key];
        }
    }
    return overrides;
}

export const useAccountSettings = (): UseAccountSettingsReturn => {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    // Track pending changes for debounced save
    const pendingChanges = useRef<Partial<AccountSettings>>({});
    const saveTimeoutRef = useRef<number | null>(null);
    const previousSettingsRef = useRef<AccountSettings>(defaultSettings);
    /** Generation counter to ignore stale async responses after auth flips. */
    const loadGenerationRef = useRef(0);
    /** Mirrors auth for save path without stale closures. */
    const isAuthenticatedRef = useRef(isAuthenticated);
    isAuthenticatedRef.current = isAuthenticated;

    const persistenceMode: SettingsPersistenceMode = isAuthenticated ? 'cloud' : 'local';

    const clearPendingSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        pendingChanges.current = {};
    }, []);

    // Load settings based on auth mode
    const refreshSettings = useCallback(async () => {
        const generation = ++loadGenerationRef.current;
        setIsLoading(true);
        setError(null);
        clearPendingSave();

        // Guests: localStorage only — never call preferences API
        if (!isAuthenticatedRef.current) {
            const local = loadGuestSettings();
            if (generation !== loadGenerationRef.current) return;
            setSettings(local);
            previousSettingsRef.current = local;
            setIsLoading(false);
            return;
        }

        // Signed-in: server is source of truth
        try {
            const response = await preferencesApi.getPreferences();
            if (generation !== loadGenerationRef.current || !isAuthenticatedRef.current) {
                return;
            }

            if (response.success && response.data) {
                let loadedSettings = sanitizeSettings(response.data);

                // One-time merge: only when cloud is all defaults and guest has global overrides
                if (isAllDefaultSettings(loadedSettings)) {
                    const guest = loadGuestSettings();
                    const overrides = getGuestGlobalOverrides(guest);
                    if (Object.keys(overrides).length > 0) {
                        try {
                            const mergeResponse = await preferencesApi.savePreferences(overrides);
                            if (
                                generation === loadGenerationRef.current &&
                                isAuthenticatedRef.current &&
                                mergeResponse.success &&
                                mergeResponse.data
                            ) {
                                loadedSettings = sanitizeSettings(mergeResponse.data);
                            } else if (Object.keys(overrides).length > 0) {
                                loadedSettings = sanitizeSettings({ ...loadedSettings, ...overrides });
                            }
                        } catch {
                            loadedSettings = sanitizeSettings({ ...loadedSettings, ...overrides });
                        }
                    }
                }

                if (generation !== loadGenerationRef.current || !isAuthenticatedRef.current) {
                    return;
                }

                setSettings(loadedSettings);
                previousSettingsRef.current = loadedSettings;
            } else {
                setError(response.error || 'Failed to load settings');
            }
        } catch {
            if (generation !== loadGenerationRef.current) return;
            setError('Failed to connect to server');
        } finally {
            if (generation === loadGenerationRef.current) {
                setIsLoading(false);
            }
        }
    }, [clearPendingSave]);

    // Reload when auth settles or user identity changes
    useEffect(() => {
        if (authLoading) return;
        void refreshSettings();
    }, [authLoading, isAuthenticated, user?.id, refreshSettings]);

    // Debounced save function
    const debouncedSave = useCallback(async () => {
        if (Object.keys(pendingChanges.current).length === 0) return;

        setSaveStatus('saving');
        const changes = { ...pendingChanges.current };
        pendingChanges.current = {};
        const generation = loadGenerationRef.current;

        // Guest: localStorage only
        if (!isAuthenticatedRef.current) {
            setSettings((current) => {
                const next = { ...current, ...changes };
                previousSettingsRef.current = next;
                saveGuestSettings(next);
                return next;
            });
            if (generation === loadGenerationRef.current) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }
            return;
        }

        // Signed-in: cloud API
        try {
            const response = await preferencesApi.savePreferences(changes);
            if (generation !== loadGenerationRef.current || !isAuthenticatedRef.current) {
                return;
            }

            if (response.success && response.data) {
                const savedSettings = sanitizeSettings({
                    ...previousSettingsRef.current,
                    ...response.data,
                });
                setSettings(savedSettings);
                previousSettingsRef.current = savedSettings;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSettings(previousSettingsRef.current);
                setError(response.error || 'Failed to save settings');
                setSaveStatus('error');
            }
        } catch {
            if (generation !== loadGenerationRef.current) return;
            setSettings(previousSettingsRef.current);
            setError('Failed to save settings');
            setSaveStatus('error');
        }
    }, []);

    // Update single setting with optimistic update and debounced save
    const updateSetting = useCallback(<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));

        pendingChanges.current[key] = value;
        setError(null);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            void debouncedSave();
        }, 500);
    }, [debouncedSave]);

    // Update multiple settings at once
    const updateSettings = useCallback((updates: Partial<AccountSettings>) => {
        setSettings((prev) => ({
            ...prev,
            ...updates,
        }));

        Object.assign(pendingChanges.current, updates);
        setError(null);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            void debouncedSave();
        }, 500);
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
        isLoading: authLoading || isLoading,
        saveStatus,
        error,
        persistenceMode,
        updateSetting,
        updateSettings,
        refreshSettings,
    };
};

export default useAccountSettings;
