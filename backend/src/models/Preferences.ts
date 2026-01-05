import mongoose, { Schema, Document } from 'mongoose';

export interface IPreferences extends Document {
    userId: mongoose.Types.ObjectId;

    // View preferences (existing)
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

const preferencesSchema = new Schema<IPreferences>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // View preferences (existing)
        defaultViewMode: { type: String, enum: ['grid', 'list', 'compact'], default: 'grid' },
        defaultSortOption: { type: String, enum: ['dateAdded', 'title', 'rating', 'runtime', 'releaseYear'], default: 'dateAdded' },
        defaultSortDirection: { type: String, enum: ['asc', 'desc'], default: 'desc' },
        autoRemoveCompleted: { type: Boolean, default: false },
        autoRemoveAfterDays: { type: Number, default: 30 },
        showProgressBars: { type: Boolean, default: true },
        compactModeItemsPerRow: { type: Number, default: 10, min: 5, max: 20 },

        // Playback Settings
        videoQuality: { type: String, enum: ['auto', '4k', '1080p', '720p', '480p', 'low'], default: 'auto' },
        autoplayNext: { type: Boolean, default: true },
        autoplayPreviews: { type: Boolean, default: true },
        defaultAudioLang: { type: String, default: 'en' },
        defaultSubtitleLang: { type: String, default: 'off' },
        downloadQuality: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        downloadOverWifiOnly: { type: Boolean, default: true },

        // Notification Settings
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
        inAppNotifications: { type: Boolean, default: true },
        newsletterSubscription: { type: Boolean, default: false },
        newReleaseAlerts: { type: Boolean, default: true },
        recommendationEmails: { type: Boolean, default: true },

        // Privacy Settings
        viewingHistoryVisible: { type: Boolean, default: true },
        profileVisible: { type: Boolean, default: true },
        dataCollection: { type: Boolean, default: true },
        personalization: { type: Boolean, default: true },

        // Accessibility Settings
        highContrast: { type: Boolean, default: false },
        reduceMotion: { type: Boolean, default: false },
        screenReaderOptimized: { type: Boolean, default: false },
        fontSize: { type: String, enum: ['small', 'medium', 'large', 'xlarge'], default: 'medium' },

        // Language Settings
        interfaceLanguage: { type: String, default: 'en' },
        region: { type: String, default: 'us' },
        timezone: { type: String, default: 'America/New_York' },
    },
    { timestamps: true }
);

export const Preferences = mongoose.model<IPreferences>('Preferences', preferencesSchema);
export default Preferences;
