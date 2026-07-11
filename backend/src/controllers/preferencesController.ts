import { Request, Response } from 'express';
import Preferences, { IPreferences } from '../models/Preferences.js';
import { logger } from '../utils/logger.js';

/** Default preferences for new users */
const defaultPreferences = {
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
} as const;

/** Format preferences for response (exclude internal fields) */
function formatPreferences(prefs: IPreferences | typeof defaultPreferences) {
    return {
        // View preferences
        defaultViewMode: prefs.defaultViewMode,
        defaultSortOption: prefs.defaultSortOption,
        defaultSortDirection: prefs.defaultSortDirection,
        autoRemoveCompleted: prefs.autoRemoveCompleted,
        autoRemoveAfterDays: prefs.autoRemoveAfterDays,
        showProgressBars: prefs.showProgressBars,
        compactModeItemsPerRow: prefs.compactModeItemsPerRow,
        // Playback Settings
        videoQuality: prefs.videoQuality,
        autoplayNext: prefs.autoplayNext,
        autoplayPreviews: prefs.autoplayPreviews,
        defaultAudioLang: prefs.defaultAudioLang,
        defaultSubtitleLang: prefs.defaultSubtitleLang,
        downloadQuality: prefs.downloadQuality,
        downloadOverWifiOnly: prefs.downloadOverWifiOnly,
        // Notification Settings
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
        inAppNotifications: prefs.inAppNotifications,
        newsletterSubscription: prefs.newsletterSubscription,
        newReleaseAlerts: prefs.newReleaseAlerts,
        recommendationEmails: prefs.recommendationEmails,
        // Privacy Settings
        viewingHistoryVisible: prefs.viewingHistoryVisible,
        profileVisible: prefs.profileVisible,
        dataCollection: prefs.dataCollection,
        personalization: prefs.personalization,
        // Accessibility Settings
        highContrast: prefs.highContrast,
        reduceMotion: prefs.reduceMotion,
        screenReaderOptimized: prefs.screenReaderOptimized,
        fontSize: prefs.fontSize,
        // Language Settings
        interfaceLanguage: prefs.interfaceLanguage,
        region: prefs.region,
        timezone: prefs.timezone,
    };
}

/**
 * GET /api/preferences
 * Retrieve preferences for the authenticated user.
 */
export const getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const prefs = await Preferences.findOne({ userId });
        if (!prefs) {
            res.json({ success: true, data: defaultPreferences });
            return;
        }
        res.json({ success: true, data: formatPreferences(prefs) });
    } catch (error) {
        logger.error('Error getting preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get preferences' });
    }
};

/**
 * PUT /api/preferences
 * Save/update preferences for the authenticated user.
 */
export const savePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        // Only allow valid preference fields to be updated
        const allowedFields = Object.keys(defaultPreferences);
        const updates: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }
        const prefs = await Preferences.findOneAndUpdate(
            { userId },
            { $set: { ...updates, userId } },
            { new: true, upsert: true },
        );
        res.json({ success: true, data: formatPreferences(prefs) });
    } catch (error) {
        logger.error('Error saving preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to save preferences' });
    }
};
