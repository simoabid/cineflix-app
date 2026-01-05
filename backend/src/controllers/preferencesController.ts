import { Request, Response } from 'express';
import Preferences, { IPreferences } from '../models/Preferences.js';
import mongoose from 'mongoose';

// Default preferences for new users
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
};

// Helper to get user ID from request (use authenticated user or fallback)
const getUserId = (req: Request): mongoose.Types.ObjectId => {
    // If user is authenticated, use their ID
    if ((req as any).user?._id) {
        return new mongoose.Types.ObjectId((req as any).user._id);
    }
    // Fallback for development/testing
    return new mongoose.Types.ObjectId('000000000000000000000001');
};

// Format preferences for response (exclude internal fields)
const formatPreferences = (prefs: IPreferences | typeof defaultPreferences) => {
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
};

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getUserId(req);
        const prefs = await Preferences.findOne({ userId });

        if (!prefs) {
            res.json({ success: true, data: defaultPreferences });
            return;
        }

        res.json({ success: true, data: formatPreferences(prefs) });
    } catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get preferences' });
    }
};

export const savePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getUserId(req);

        // Only allow valid preference fields to be updated
        const allowedFields = Object.keys(defaultPreferences);
        const updates: Record<string, any> = {};

        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const prefs = await Preferences.findOneAndUpdate(
            { userId },
            { $set: { ...updates, userId } },
            { new: true, upsert: true }
        );

        res.json({ success: true, data: formatPreferences(prefs) });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to save preferences' });
    }
};
