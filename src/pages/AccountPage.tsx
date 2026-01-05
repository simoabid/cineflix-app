import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Lock,
    Calendar,
    LogOut,
    Trash2,
    Save,
    Edit3,
    X,
    Check,
    Bell,
    Shield,
    Monitor,
    Globe,
    CreditCard,
    Volume2,
    Play,
    Download,
    Languages,
    Clock,
    Tv,
    Laptop,
    Smartphone,
    Tablet,
    Crown,
    Zap,
    Settings,
    ChevronRight,
    AlertTriangle,
    History,
    HardDrive,
    Accessibility,
    Type,
    Contrast,
    MousePointerClick,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PasswordInput } from '../components/auth';
import { validatePassword, validatePasswordMatch } from '../utils/validation';
import { AUTH_STRINGS } from '../utils/strings';
import { useAccountSettings, SaveStatus } from '../hooks/useAccountSettings';
import { AVATARS, renderAvatarById } from '../constants/avatars';
import DynamicBackground from '../components/DynamicBackground';

// Settings tabs
type SettingsTab = 'profile' | 'playback' | 'notifications' | 'privacy' | 'devices' | 'subscription' | 'accessibility' | 'language';

interface TabItem {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
}

const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'playback', label: 'Playback', icon: Play },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'devices', label: 'Devices', icon: Monitor },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'language', label: 'Language', icon: Globe },
];

// Toggle Switch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; disabled?: boolean }> = ({ enabled, onChange, disabled }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-netflix-red focus:ring-offset-2 focus:ring-offset-gray-900 ${enabled ? 'bg-netflix-red' : 'bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

// Settings Card Component
const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; icon?: React.ElementType }> = ({
    title,
    description,
    children,
    icon: Icon
}) => (
    <div className="auth-card rounded-2xl p-6 mb-4 animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
            {Icon && (
                <div className="w-10 h-10 bg-netflix-red/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-netflix-red" />
                </div>
            )}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
            </div>
        </div>
        {children}
    </div>
);

// Setting Row Component
const SettingRow: React.FC<{
    label: string;
    description?: string;
    children: React.ReactNode;
}> = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-700/50 last:border-0">
        <div className="flex-1 pr-4">
            <p className="text-white font-medium">{label}</p>
            {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
        </div>
        <div className="flex-shrink-0">{children}</div>
    </div>
);

// Select Dropdown Component
const SelectDropdown: React.FC<{
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
}> = ({ value, options, onChange, disabled }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-netflix-red transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);

// Save Status Indicator Component
const SaveStatusIndicator: React.FC<{ status: SaveStatus; error: string | null }> = ({ status, error }) => {
    if (status === 'idle' && !error) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
            {status === 'saving' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                    <Loader2 className="w-4 h-4 text-netflix-red animate-spin" />
                    <span className="text-sm text-gray-300">Saving...</span>
                </div>
            )}
            {status === 'saved' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/80 border border-green-600 rounded-lg shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">Settings saved</span>
                </div>
            )}
            {(status === 'error' || error) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/80 border border-red-600 rounded-lg shadow-lg">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">{error || 'Save failed'}</span>
                </div>
            )}
        </div>
    );
};

// Loading Skeleton Component
const SettingsSkeleton: React.FC = () => (
    <div className="space-y-6">
        {[1, 2, 3].map((i) => (
            <div key={i} className="auth-card rounded-2xl p-6 mb-4 animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl" />
                    <div className="flex-1">
                        <div className="h-5 bg-gray-700 rounded w-1/3 mb-2" />
                        <div className="h-4 bg-gray-700 rounded w-2/3" />
                    </div>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center justify-between py-4 border-b border-gray-700/50 last:border-0">
                            <div className="flex-1">
                                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                                <div className="h-3 bg-gray-700 rounded w-1/2" />
                            </div>
                            <div className="w-11 h-6 bg-gray-700 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout, updateProfile, changePassword } = useAuth();
    const { settings, isLoading, saveStatus, error, updateSetting } = useAccountSettings();

    // Active tab
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editBio, setEditBio] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileError, setProfileError] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Modal states
    const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    // Handle avatar change
    const handleAvatarChange = async (avatarId: string) => {
        setAvatarLoading(true);
        try {
            const result = await updateProfile({ avatar: avatarId });
            if (result.success) {
                setShowAvatarModal(false);
                setProfileSuccess('Avatar updated successfully!');
                setTimeout(() => setProfileSuccess(''), 3000);
            } else {
                setProfileError(result.error || 'Failed to update avatar');
            }
        } catch (error) {
            setProfileError('An error occurred');
        } finally {
            setAvatarLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Handle profile update
    const handleProfileUpdate = async () => {
        if (!editName.trim()) {
            setProfileError('Name is required');
            return;
        }

        setProfileLoading(true);
        setProfileError('');
        setProfileSuccess('');

        try {
            const result = await updateProfile({ name: editName.trim() });
            if (result.success) {
                setProfileSuccess(AUTH_STRINGS.success.profileUpdated);
                setIsEditingProfile(false);
                setTimeout(() => setProfileSuccess(''), 3000);
            } else {
                setProfileError(result.error || 'Failed to update profile');
            }
        } catch (error) {
            setProfileError('An error occurred');
        } finally {
            setProfileLoading(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            setPasswordError(passwordValidation.errors[0]);
            return;
        }

        const matchValidation = validatePasswordMatch(newPassword, confirmNewPassword);
        if (!matchValidation.valid) {
            setPasswordError(matchValidation.error || 'Passwords do not match');
            return;
        }

        setPasswordLoading(true);

        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                setPasswordSuccess(AUTH_STRINGS.success.passwordChanged);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setTimeout(() => setPasswordSuccess(''), 3000);
            } else {
                setPasswordError(result.error || 'Failed to change password');
            }
        } catch (error) {
            setPasswordError('An error occurred');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Get device icon
    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'phone': return Smartphone;
            case 'tv': return Tv;
            case 'tablet': return Tablet;
            default: return Laptop;
        }
    };

    // Render tab content
    const renderTabContent = () => {
        // Show loading skeleton during initial load
        if (isLoading && activeTab !== 'profile') {
            return <SettingsSkeleton />;
        }

        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        {/* Profile Card */}
                        <SettingsCard title="Profile Information" icon={User}>
                            {/* Success/Error Messages */}
                            {profileSuccess && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    {profileSuccess}
                                </div>
                            )}
                            {profileError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm" role="alert">
                                    {profileError}
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="w-28 h-28 rounded-full flex items-center justify-center ring-4 ring-gray-700/50 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                                            {user?.avatar ? (
                                                renderAvatarById(user.avatar, 'w-full h-full')
                                            ) : (
                                                <span className="text-white text-4xl font-bold">
                                                    {user?.name?.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setShowAvatarModal(true)}
                                            className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <Edit3 className="w-6 h-6 text-white" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowAvatarModal(true)}
                                        className="mt-3 text-sm text-netflix-red hover:text-red-400 transition-colors"
                                    >
                                        Change Avatar
                                    </button>
                                    {user?.avatar && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {AVATARS.find(a => a.id === user.avatar)?.name || 'Custom'}
                                        </p>
                                    )}
                                </div>

                                {/* Profile Fields */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                                        {isEditingProfile ? (
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="auth-input w-full"
                                                placeholder="Your name"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <p className="text-white text-lg font-semibold">{user?.name}</p>
                                                <button
                                                    onClick={() => setIsEditingProfile(true)}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                                        <div className="flex items-center gap-2 text-white">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            {user?.email}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Bio</label>
                                        {isEditingProfile ? (
                                            <textarea
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                className="auth-input w-full h-20 resize-none"
                                                placeholder="Tell us about yourself..."
                                            />
                                        ) : (
                                            <p className="text-gray-300">{editBio || 'No bio set'}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>Member since {formatDate(user?.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                            <span className="text-yellow-500">Premium</span>
                                        </div>
                                    </div>

                                    {isEditingProfile && (
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleProfileUpdate}
                                                disabled={profileLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-netflix-red hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                {profileLoading ? <span className="auth-spinner" /> : <Save className="w-4 h-4" />}
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingProfile(false);
                                                    setEditName(user?.name || '');
                                                    setProfileError('');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SettingsCard>

                        {/* Security Card */}
                        <SettingsCard title="Security" description="Manage your password and security settings" icon={Lock}>
                            {passwordSuccess && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    {passwordSuccess}
                                </div>
                            )}
                            {passwordError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm" role="alert">
                                    {passwordError}
                                </div>
                            )}

                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <PasswordInput
                                        id="currentPassword"
                                        name="currentPassword"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        label="Current Password"
                                        placeholder="Enter current password"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <PasswordInput
                                        id="newPassword"
                                        name="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        label="New Password"
                                        placeholder="Enter new password"
                                        autoComplete="new-password"
                                        required
                                        showStrengthMeter
                                    />
                                    <PasswordInput
                                        id="confirmNewPassword"
                                        name="confirmNewPassword"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        label="Confirm New Password"
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={passwordLoading || !currentPassword || !newPassword || !confirmNewPassword}
                                        className="flex items-center gap-2 px-4 py-2 bg-netflix-red hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {passwordLoading ? <span className="auth-spinner" /> : <Lock className="w-4 h-4" />}
                                        {AUTH_STRINGS.buttons.changePassword}
                                    </button>
                                </div>
                            </form>
                        </SettingsCard>

                        {/* Account Actions Card */}
                        <SettingsCard title="Account Actions" icon={Settings}>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    {AUTH_STRINGS.buttons.signOut}
                                </button>

                                <button
                                    onClick={() => setShowDeleteAccountModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-medium transition-colors border border-red-500/30"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete Account
                                </button>
                            </div>
                        </SettingsCard>
                    </div>
                );

            case 'playback':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Video Quality" description="Choose your preferred streaming quality" icon={Tv}>
                            <SettingRow label="Data Saver" description="Reduce data usage on mobile networks">
                                <ToggleSwitch
                                    enabled={settings.videoQuality === 'low'}
                                    onChange={() => updateSetting('videoQuality', settings.videoQuality === 'low' ? 'auto' : 'low')}
                                />
                            </SettingRow>
                            <SettingRow label="Preferred Quality" description="Select the default quality for streaming">
                                <SelectDropdown
                                    value={settings.videoQuality}
                                    options={[
                                        { value: 'auto', label: 'Auto' },
                                        { value: '4k', label: '4K Ultra HD' },
                                        { value: '1080p', label: 'Full HD (1080p)' },
                                        { value: '720p', label: 'HD (720p)' },
                                        { value: '480p', label: 'SD (480p)' },
                                        { value: 'low', label: 'Low (Data Saver)' },
                                    ]}
                                    onChange={(value) => updateSetting('videoQuality', value)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Autoplay" description="Control automatic playback behavior" icon={Play}>
                            <SettingRow label="Autoplay Next Episode" description="Automatically play the next episode in a series">
                                <ToggleSwitch
                                    enabled={settings.autoplayNext}
                                    onChange={() => updateSetting('autoplayNext', !settings.autoplayNext)}
                                />
                            </SettingRow>
                            <SettingRow label="Autoplay Previews" description="Play trailers and previews while browsing">
                                <ToggleSwitch
                                    enabled={settings.autoplayPreviews}
                                    onChange={() => updateSetting('autoplayPreviews', !settings.autoplayPreviews)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Audio & Subtitles" description="Set your preferred audio and subtitle languages" icon={Volume2}>
                            <SettingRow label="Default Audio Language" description="Preferred language for audio tracks">
                                <SelectDropdown
                                    value={settings.defaultAudioLang}
                                    options={[
                                        { value: 'en', label: 'English' },
                                        { value: 'es', label: 'Spanish' },
                                        { value: 'fr', label: 'French' },
                                        { value: 'de', label: 'German' },
                                        { value: 'ja', label: 'Japanese' },
                                        { value: 'ko', label: 'Korean' },
                                    ]}
                                    onChange={(value) => updateSetting('defaultAudioLang', value)}
                                />
                            </SettingRow>
                            <SettingRow label="Default Subtitles" description="Preferred language for subtitles">
                                <SelectDropdown
                                    value={settings.defaultSubtitleLang}
                                    options={[
                                        { value: 'off', label: 'Off' },
                                        { value: 'en', label: 'English' },
                                        { value: 'es', label: 'Spanish' },
                                        { value: 'fr', label: 'French' },
                                        { value: 'de', label: 'German' },
                                        { value: 'ja', label: 'Japanese' },
                                        { value: 'ko', label: 'Korean' },
                                    ]}
                                    onChange={(value) => updateSetting('defaultSubtitleLang', value)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Downloads" description="Manage download settings for offline viewing" icon={Download}>
                            <SettingRow label="Download Quality" description="Quality for downloaded content">
                                <SelectDropdown
                                    value={settings.downloadQuality}
                                    options={[
                                        { value: 'high', label: 'High' },
                                        { value: 'medium', label: 'Standard' },
                                        { value: 'low', label: 'Low (Save Space)' },
                                    ]}
                                    onChange={(value) => updateSetting('downloadQuality', value)}
                                />
                            </SettingRow>
                            <SettingRow label="Download Over Wi-Fi Only" description="Only download content when connected to Wi-Fi">
                                <ToggleSwitch
                                    enabled={settings.downloadOverWifiOnly}
                                    onChange={() => updateSetting('downloadOverWifiOnly', !settings.downloadOverWifiOnly)}
                                />
                            </SettingRow>
                        </SettingsCard>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Notification Channels" description="Choose how you want to receive notifications" icon={Bell}>
                            <SettingRow label="Email Notifications" description="Receive notifications via email">
                                <ToggleSwitch
                                    enabled={settings.emailNotifications}
                                    onChange={() => updateSetting('emailNotifications', !settings.emailNotifications)}
                                />
                            </SettingRow>
                            <SettingRow label="Push Notifications" description="Receive push notifications on your devices">
                                <ToggleSwitch
                                    enabled={settings.pushNotifications}
                                    onChange={() => updateSetting('pushNotifications', !settings.pushNotifications)}
                                />
                            </SettingRow>
                            <SettingRow label="In-App Notifications" description="Show notifications within the app">
                                <ToggleSwitch
                                    enabled={settings.inAppNotifications}
                                    onChange={() => updateSetting('inAppNotifications', !settings.inAppNotifications)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Email Preferences" description="Control what emails you receive from us" icon={Mail}>
                            <SettingRow label="New Release Alerts" description="Get notified when new movies and shows are added">
                                <ToggleSwitch
                                    enabled={settings.newReleaseAlerts}
                                    onChange={() => updateSetting('newReleaseAlerts', !settings.newReleaseAlerts)}
                                />
                            </SettingRow>
                            <SettingRow label="Personalized Recommendations" description="Receive tailored content suggestions">
                                <ToggleSwitch
                                    enabled={settings.recommendationEmails}
                                    onChange={() => updateSetting('recommendationEmails', !settings.recommendationEmails)}
                                />
                            </SettingRow>
                            <SettingRow label="Newsletter" description="Weekly digest of trending content">
                                <ToggleSwitch
                                    enabled={settings.newsletterSubscription}
                                    onChange={() => updateSetting('newsletterSubscription', !settings.newsletterSubscription)}
                                />
                            </SettingRow>
                        </SettingsCard>
                    </div>
                );

            case 'privacy':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Profile Privacy" description="Control who can see your profile and activity" icon={Shield}>
                            <SettingRow label="Profile Visibility" description="Allow others to see your profile">
                                <ToggleSwitch
                                    enabled={settings.profileVisible}
                                    onChange={() => updateSetting('profileVisible', !settings.profileVisible)}
                                />
                            </SettingRow>
                            <SettingRow label="Viewing History Visibility" description="Show your watch history on your profile">
                                <ToggleSwitch
                                    enabled={settings.viewingHistoryVisible}
                                    onChange={() => updateSetting('viewingHistoryVisible', !settings.viewingHistoryVisible)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Data & Personalization" description="Control how we use your data" icon={Shield}>
                            <SettingRow label="Data Collection" description="Allow us to collect usage data to improve our service">
                                <ToggleSwitch
                                    enabled={settings.dataCollection}
                                    onChange={() => updateSetting('dataCollection', !settings.dataCollection)}
                                />
                            </SettingRow>
                            <SettingRow label="Personalized Experience" description="Receive personalized recommendations based on your viewing history">
                                <ToggleSwitch
                                    enabled={settings.personalization}
                                    onChange={() => updateSetting('personalization', !settings.personalization)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Data Management" description="Download or delete your personal data" icon={HardDrive}>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
                                    <Download className="w-4 h-4" />
                                    Download My Data
                                </button>
                                <button
                                    onClick={() => setShowClearHistoryModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <History className="w-4 h-4" />
                                    Clear Watch History
                                </button>
                            </div>
                        </SettingsCard>
                    </div>
                );

            case 'devices':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Connected Devices" description="Manage devices that are signed in to your account" icon={Monitor}>
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                    <Monitor className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-medium text-white mb-2">Coming Soon</h4>
                                <p className="text-gray-400 max-w-sm">
                                    Device management and session tracking will be available in a future update.
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-700/50">
                                <button
                                    onClick={() => setShowLogoutAllModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-medium transition-colors border border-red-500/30"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out of All Devices
                                </button>
                            </div>
                        </SettingsCard>
                    </div>
                );

            case 'subscription':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Current Plan" icon={Crown}>
                            <div className="p-6 bg-gradient-to-r from-netflix-red/20 via-red-600/10 to-transparent rounded-xl border border-netflix-red/30">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-netflix-red rounded-xl flex items-center justify-center">
                                            <Crown className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">Premium</h4>
                                            <p className="text-sm text-gray-400">$19.99/month</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full border border-green-500/30">
                                        Active
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Zap className="w-4 h-4 text-netflix-red" />
                                        <span>4K Ultra HD streaming</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Monitor className="w-4 h-4 text-netflix-red" />
                                        <span>Watch on 4 devices</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Download className="w-4 h-4 text-netflix-red" />
                                        <span>Unlimited downloads</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Volume2 className="w-4 h-4 text-netflix-red" />
                                        <span>Spatial Audio</span>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400">
                                    Next billing date: <span className="text-white">January 15, 2025</span>
                                </p>
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Billing Information" description="Manage your payment methods" icon={CreditCard}>
                            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">VISA</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">•••• •••• •••• 4242</p>
                                        <p className="text-sm text-gray-400">Expires 12/26</p>
                                    </div>
                                </div>
                                <button className="text-netflix-red hover:text-red-400 transition-colors">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
                                    <CreditCard className="w-4 h-4" />
                                    Add Payment Method
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white rounded-lg font-medium transition-colors">
                                    View Billing History
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Change Plan" description="Upgrade or downgrade your subscription" icon={Zap}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { name: 'Basic', price: '$9.99', features: ['HD streaming', '1 device', 'No downloads'] },
                                    { name: 'Standard', price: '$14.99', features: ['Full HD', '2 devices', '10 downloads'] },
                                    { name: 'Premium', price: '$19.99', features: ['4K Ultra HD', '4 devices', 'Unlimited'], current: true },
                                ].map((plan) => (
                                    <div
                                        key={plan.name}
                                        className={`p-4 rounded-xl border transition-all ${plan.current
                                            ? 'bg-netflix-red/10 border-netflix-red'
                                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                            }`}
                                    >
                                        <h4 className="text-lg font-bold text-white mb-1">{plan.name}</h4>
                                        <p className="text-2xl font-bold text-netflix-red mb-3">{plan.price}<span className="text-sm text-gray-400">/mo</span></p>
                                        <ul className="space-y-2">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            disabled={plan.current}
                                            className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${plan.current
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-netflix-red hover:bg-red-700 text-white'
                                                }`}
                                        >
                                            {plan.current ? 'Current Plan' : 'Switch'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </SettingsCard>
                    </div>
                );

            case 'accessibility':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Display" description="Adjust visual preferences for better accessibility" icon={Contrast}>
                            <SettingRow label="High Contrast Mode" description="Increase contrast for better visibility">
                                <ToggleSwitch
                                    enabled={settings.highContrast}
                                    onChange={() => updateSetting('highContrast', !settings.highContrast)}
                                />
                            </SettingRow>
                            <SettingRow label="Reduce Motion" description="Minimize animations and transitions">
                                <ToggleSwitch
                                    enabled={settings.reduceMotion}
                                    onChange={() => updateSetting('reduceMotion', !settings.reduceMotion)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Text" description="Customize text appearance" icon={Type}>
                            <SettingRow label="Font Size" description="Adjust the size of text throughout the app">
                                <SelectDropdown
                                    value={settings.fontSize}
                                    options={[
                                        { value: 'small', label: 'Small' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'large', label: 'Large' },
                                        { value: 'xlarge', label: 'Extra Large' },
                                    ]}
                                    onChange={(value) => updateSetting('fontSize', value)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Assistive Technology" description="Settings for screen readers and other assistive technologies" icon={MousePointerClick}>
                            <SettingRow label="Screen Reader Optimization" description="Optimize the interface for screen readers">
                                <ToggleSwitch
                                    enabled={settings.screenReaderOptimized}
                                    onChange={() => updateSetting('screenReaderOptimized', !settings.screenReaderOptimized)}
                                />
                            </SettingRow>
                        </SettingsCard>
                    </div>
                );

            case 'language':
                return (
                    <div className="space-y-6">
                        <SettingsCard title="Display Language" description="Choose your preferred language for the interface" icon={Languages}>
                            <SettingRow label="Interface Language" description="Language used for menus and navigation">
                                <SelectDropdown
                                    value={settings.interfaceLanguage}
                                    options={[
                                        { value: 'en', label: 'English' },
                                        { value: 'es', label: 'Español' },
                                        { value: 'fr', label: 'Français' },
                                        { value: 'de', label: 'Deutsch' },
                                        { value: 'pt', label: 'Português' },
                                        { value: 'ja', label: '日本語' },
                                        { value: 'ko', label: '한국어' },
                                        { value: 'zh', label: '中文' },
                                    ]}
                                    onChange={(value) => updateSetting('interfaceLanguage', value)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Region" description="Set your location for content availability" icon={Globe}>
                            <SettingRow label="Country/Region" description="Determines content catalog and recommendations">
                                <SelectDropdown
                                    value={settings.region}
                                    options={[
                                        { value: 'us', label: 'United States' },
                                        { value: 'uk', label: 'United Kingdom' },
                                        { value: 'ca', label: 'Canada' },
                                        { value: 'au', label: 'Australia' },
                                        { value: 'de', label: 'Germany' },
                                        { value: 'fr', label: 'France' },
                                        { value: 'jp', label: 'Japan' },
                                        { value: 'kr', label: 'South Korea' },
                                    ]}
                                    onChange={(value) => updateSetting('region', value)}
                                />
                            </SettingRow>
                        </SettingsCard>

                        <SettingsCard title="Time Zone" description="Set your time zone for accurate scheduling" icon={Clock}>
                            <SettingRow label="Time Zone" description="Used for scheduling and release times">
                                <SelectDropdown
                                    value={settings.timezone}
                                    options={[
                                        { value: 'America/New_York', label: 'Eastern Time (ET)' },
                                        { value: 'America/Chicago', label: 'Central Time (CT)' },
                                        { value: 'America/Denver', label: 'Mountain Time (MT)' },
                                        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                                        { value: 'Europe/London', label: 'GMT/BST' },
                                        { value: 'Europe/Paris', label: 'Central European Time' },
                                        { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
                                        { value: 'Asia/Seoul', label: 'Korea Standard Time' },
                                    ]}
                                    onChange={(value) => updateSetting('timezone', value)}
                                />
                            </SettingRow>
                        </SettingsCard>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <DynamicBackground className="pt-20 pb-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Account Settings</h1>
                    <p className="text-gray-400">Manage your profile, preferences, and account settings</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="auth-card rounded-2xl p-2 sticky top-24">
                            <nav className="space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === tab.id
                                                ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/25'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {/* Save Status Indicator */}
            <SaveStatusIndicator status={saveStatus} error={error} />

            {/* Modals */}
            {showLogoutAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="auth-card rounded-2xl p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Sign Out of All Devices?</h3>
                                <p className="text-sm text-gray-400">This will sign you out everywhere except this device.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowLogoutAllModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutAllModal(false);
                                    // Handle logout all - will be implemented with session tracking
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Sign Out All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAccountModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="auth-card rounded-2xl p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete Account?</h3>
                                <p className="text-sm text-gray-400">This action cannot be undone. All your data will be permanently deleted.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteAccountModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteAccountModal(false);
                                    alert('Account deletion is not available in this demo.');
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClearHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="auth-card rounded-2xl p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                <History className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Clear Watch History?</h3>
                                <p className="text-sm text-gray-400">This will remove all your viewing history. Your recommendations may be affected.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowClearHistoryModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowClearHistoryModal(false);
                                    // Handle clear history
                                }}
                                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Avatar Selection Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="auth-card rounded-2xl p-6 max-w-lg w-full animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Choose Your Avatar</h3>
                                <p className="text-sm text-gray-400 mt-1">Select an avatar to represent you</p>
                            </div>
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="text-gray-400 hover:text-white transition-colors p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            {AVATARS.map((avatar) => {
                                const AvatarComponent = avatar.Component;
                                const isSelected = user?.avatar === avatar.id;
                                return (
                                    <button
                                        key={avatar.id}
                                        onClick={() => handleAvatarChange(avatar.id)}
                                        disabled={avatarLoading}
                                        className={`relative group flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${isSelected
                                            ? 'bg-netflix-red/20 ring-2 ring-netflix-red'
                                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                                            } ${avatarLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-full overflow-hidden transition-transform ${!avatarLoading && 'group-hover:scale-110'
                                            }`}>
                                            <AvatarComponent className="w-full h-full" />
                                        </div>
                                        <span className="text-xs text-gray-400 mt-2 text-center">{avatar.name}</span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-netflix-red rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {avatarLoading && (
                            <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Saving...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DynamicBackground>
    );
};

export default AccountPage;
