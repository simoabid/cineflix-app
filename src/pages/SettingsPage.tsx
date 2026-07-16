import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    Volume2,
    Play,
    Download,
    Languages,
    Clock,
    Tv,
    Crown,
    Settings,
    AlertTriangle,
    History,
    HardDrive,
    Accessibility,
    Type,
    Contrast,
    MousePointerClick,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Palette,
    Heart,
    ExternalLink,
    Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PasswordInput } from '../components/auth';
import { validatePassword, validatePasswordMatch } from '../utils/validation';
import { AUTH_STRINGS } from '../utils/strings';
import { useAccountSettings, SaveStatus } from '../hooks/useAccountSettings';
import { AVATARS, renderAvatarById, resolveAvatarId } from '../constants/avatars';
import { CineProSettingsView } from '../components/CineProSettingsView';
import { SEOHead } from '../components/layout/SEOHead';
import { ThemePicker } from '../components/settings/ThemePicker';
import {
    SUPPORT_CTA_LABEL,
    SUPPORT_MESSAGE,
    SUPPORT_URL,
} from '../setup/constants';
import { useSupportStore } from '../stores/support';

// Settings tabs
type SettingsTab =
    | 'profile'
    | 'playback'
    | 'appearance'
    | 'notifications'
    | 'privacy'
    | 'devices'
    | 'support'
    | 'accessibility'
    | 'language'
    | 'cinepro';

interface TabItem {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    /** When true, tab is only listed for signed-in users */
    authRequired?: boolean;
}

const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User, authRequired: true },
    { id: 'playback', label: 'Playback', icon: Play },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell, authRequired: true },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'devices', label: 'Devices', icon: Monitor, authRequired: true },
    { id: 'support', label: 'Support', icon: Heart },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'cinepro', label: 'CinePro Core', icon: Settings },
];

const AUTH_REQUIRED_TAB_IDS = new Set(
    tabs.filter((t) => t.authRequired).map((t) => t.id),
);

function resolveInitialTab(isAuthenticated: boolean): SettingsTab {
    if (typeof window === 'undefined') {
        return isAuthenticated ? 'profile' : 'appearance';
    }
    const hash = window.location.hash.replace('#', '') as SettingsTab | '';
    const validIds = new Set(tabs.map((t) => t.id));
    if (hash && validIds.has(hash as SettingsTab)) {
        const tab = hash as SettingsTab;
        if (!isAuthenticated && AUTH_REQUIRED_TAB_IDS.has(tab)) {
            // Allow profile deep-link to show sign-in CTA; other auth tabs fall back
            if (tab === 'profile') return 'profile';
            return 'appearance';
        }
        return tab;
    }
    return isAuthenticated ? 'profile' : 'appearance';
}

/** Sign-in prompt used for auth-only sections when guest deep-links in */
const SignInRequiredCard: React.FC<{ title?: string; description?: string }> = ({
    title = 'Sign in required',
    description = 'Create a free account or sign in to manage this section.',
}) => (
    <SettingsCard title={title} description={description} icon={User}>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-buttons-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-buttons-purpleHover"
            >
                Sign In
            </Link>
            <Link
                to="/signup"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
                Create Account
            </Link>
        </div>
    </SettingsCard>
);

// Toggle Switch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; disabled?: boolean }> = ({ enabled, onChange, disabled }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-buttons-purple focus:ring-offset-2 focus:ring-offset-gray-900 ${enabled ? 'bg-buttons-purple' : 'bg-gray-600'
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
                <div className="w-10 h-10 bg-buttons-purple/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-type-logo" />
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
        className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-buttons-purple transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);

// Save Status Indicator Component
const SaveStatusIndicator: React.FC<{
    status: SaveStatus;
    error: string | null;
    persistenceMode: 'local' | 'cloud';
}> = ({ status, error, persistenceMode }) => {
    if (status === 'idle' && !error) return null;

    const savedLabel = persistenceMode === 'local' ? 'Saved on this device' : 'Settings saved';

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
            {status === 'saving' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                    <Loader2 className="w-4 h-4 text-type-logo animate-spin" />
                    <span className="text-sm text-gray-300">Saving...</span>
                </div>
            )}
            {status === 'saved' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/80 border border-green-600 rounded-lg shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">{savedLabel}</span>
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

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authLoading, logout, updateProfile, changePassword } = useAuth();
    const { settings, isLoading, saveStatus, error, updateSetting, persistenceMode } = useAccountSettings();
    const showSupportAds = useSupportStore((s) => s.showSupportAds);
    const isSupporter = useSupportStore((s) => s.isSupporter);
    const setShowSupportAds = useSupportStore((s) => s.setShowSupportAds);
    const setIsSupporter = useSupportStore((s) => s.setIsSupporter);
    const hydrateFromServer = useSupportStore((s) => s.hydrateFromServer);

    const visibleTabs = tabs.filter((tab) => isAuthenticated || !tab.authRequired);

    // Active tab (support #appearance / #support / #profile deep-links)
    const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
        resolveInitialTab(false),
    );
    const didResolveAuthTab = useRef(false);

    // Resolve default tab once auth finishes loading (hash wins; else profile vs appearance)
    useEffect(() => {
        if (authLoading) return;

        const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
        if (hash) {
            setActiveTab(resolveInitialTab(isAuthenticated));
            didResolveAuthTab.current = true;
            return;
        }

        if (!didResolveAuthTab.current) {
            didResolveAuthTab.current = true;
            setActiveTab(isAuthenticated ? 'profile' : 'appearance');
            return;
        }

        // After logout, leave auth-only tabs
        if (!isAuthenticated) {
            setActiveTab((current) =>
                AUTH_REQUIRED_TAB_IDS.has(current) || current === 'profile' ? 'appearance' : current,
            );
        }
    }, [authLoading, isAuthenticated]);

    const selectTab = useCallback((tab: SettingsTab) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const url = `${window.location.pathname}${window.location.search}#${tab}`;
            window.history.replaceState(null, '', url);
        }
    }, []);

    // Sync server preferences → local support store when account settings load
    useEffect(() => {
        if (isLoading) return;
        hydrateFromServer({
            showSupportAds: settings.showSupportAds,
            isSupporter: settings.isSupporter,
        });
    }, [
        isLoading,
        settings.showSupportAds,
        settings.isSupporter,
        hydrateFromServer,
    ]);

    const toggleShowSupportAds = useCallback(() => {
        if (isSupporter) return;
        const next = !showSupportAds;
        setShowSupportAds(next);
        updateSetting('showSupportAds', next);
    }, [isSupporter, showSupportAds, setShowSupportAds, updateSetting]);

    const toggleIsSupporter = useCallback(() => {
        const next = !isSupporter;
        setIsSupporter(next);
        updateSetting('isSupporter', next);
        if (next) {
            updateSetting('showSupportAds', false);
        }
    }, [isSupporter, setIsSupporter, updateSetting]);

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

    // Handle avatar change (auth-only — never call profile API as guest)
    const handleAvatarChange = async (avatarId: string) => {
        if (!isAuthenticated || !user) return;
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
        } catch {
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

    // Handle profile update (auth-only)
    const handleProfileUpdate = async () => {
        if (!isAuthenticated || !user) return;
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
        } catch {
            setProfileError('An error occurred');
        } finally {
            setProfileLoading(false);
        }
    };

    // Handle password change (auth-only)
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user) return;
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
        } catch {
            setPasswordError('An error occurred');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        if (!isAuthenticated) return;
        await logout();
        navigate('/');
    };


    // Render tab content
    const renderTabContent = () => {
        // Cloud load skeleton only for signed-in users (guest local load is sync)
        if (isLoading && isAuthenticated && activeTab !== 'profile') {
            return <SettingsSkeleton />;
        }

        switch (activeTab) {
            case 'profile':
                if (!isAuthenticated || !user) {
                    return (
                        <div className="space-y-6">
                            <SignInRequiredCard
                                title="Your Profile"
                                description="Sign in to manage your profile, password, and account security."
                            />
                        </div>
                    );
                }
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
                                <div className="mb-4 p-3 bg-red-500/10 border border-buttons-purple/50 rounded-lg text-red-400 text-sm" role="alert">
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
                                        className="mt-3 text-sm text-type-logo hover:text-red-400 transition-colors"
                                    >
                                        Change Avatar
                                    </button>
                                    {user?.avatar && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {AVATARS.find(a => a.id === resolveAvatarId(user.avatar!))?.name || 'Custom'}
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
                                                className="flex items-center gap-2 px-4 py-2 bg-buttons-purple hover:bg-buttons-purpleHover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
                                <div className="mb-4 p-3 bg-red-500/10 border border-buttons-purple/50 rounded-lg text-red-400 text-sm" role="alert">
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
                                        className="flex items-center gap-2 px-4 py-2 bg-buttons-purple hover:bg-buttons-purpleHover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="flex items-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-medium transition-colors border border-buttons-purple/30"
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
                if (!isAuthenticated) {
                    return (
                        <div className="space-y-6">
                            <SignInRequiredCard
                                title="Notifications"
                                description="Sign in to manage email, push, and account notification preferences."
                            />
                        </div>
                    );
                }
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
                        {isAuthenticated ? (
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
                        ) : null}

                        <SettingsCard title="Data & Personalization" description="Control how we use your data on this device" icon={Shield}>
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

                        {isAuthenticated ? (
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
                        ) : (
                            <SignInRequiredCard
                                title="Account privacy tools"
                                description="Sign in to manage profile visibility, download your data, or clear watch history."
                            />
                        )}
                    </div>
                );

            case 'devices':
                if (!isAuthenticated) {
                    return (
                        <div className="space-y-6">
                            <SignInRequiredCard
                                title="Devices"
                                description="Sign in to view connected devices and sign out of other sessions."
                            />
                        </div>
                    );
                }
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
                                    className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-medium transition-colors border border-buttons-purple/30"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out of All Devices
                                </button>
                            </div>
                        </SettingsCard>
                    </div>
                );

            case 'support':
                return (
                    <div className="space-y-6">
                        <SettingsCard
                            title="Support CINEFLIX"
                            description="Help keep this free, open-source project running online"
                            icon={Heart}
                        >
                            <div className="rounded-xl border border-buttons-purple/30 bg-gradient-to-r from-buttons-purple/20 via-red-600/10 to-transparent p-6">
                                <p className="text-sm leading-relaxed text-gray-300">{SUPPORT_MESSAGE}</p>
                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                    <a
                                        href={SUPPORT_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-buttons-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-buttons-purpleHover"
                                    >
                                        <Heart className="h-4 w-4" />
                                        {SUPPORT_CTA_LABEL} on Ko-fi
                                        <ExternalLink className="h-4 w-4 opacity-80" />
                                    </a>
                                    <Link
                                        to="/support"
                                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                                    >
                                        About support
                                    </Link>
                                </div>
                                <p className="mt-4 text-xs text-gray-500">
                                    Opens{' '}
                                    <span className="text-gray-400">ko-fi.com/abiddev</span>
                                    . Tips are voluntary and help with hosting and maintenance.
                                </p>
                            </div>
                        </SettingsCard>

                        <SettingsCard
                            title="Support ads"
                            description="Optional, non-intrusive ads on browse and detail pages — never on the watch player"
                            icon={Megaphone}
                        >
                            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                                <strong className="font-semibold text-amber-200">Coming soon.</strong>{' '}
                                Display ads are not live yet. Your preference is saved and will apply
                                when respectful ads ship (Phase 2). Watch pages will never show these ads.
                            </div>

                            <SettingRow
                                label="Show support ads"
                                description={
                                    isSupporter
                                        ? 'Disabled while you are marked as a supporter (ad-free).'
                                        : 'When ads go live, help cover costs with light placements outside /watch. You can turn this off anytime.'
                                }
                            >
                                <ToggleSwitch
                                    enabled={showSupportAds && !isSupporter}
                                    onChange={toggleShowSupportAds}
                                    disabled={isSupporter}
                                />
                            </SettingRow>

                            <SettingRow
                                label="I support CINEFLIX"
                                description="Honor system for now: mark yourself as a supporter to stay ad-free and hide the support banner. Automatic Ko-fi linking comes later."
                            >
                                <ToggleSwitch
                                    enabled={isSupporter}
                                    onChange={toggleIsSupporter}
                                />
                            </SettingRow>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <span
                                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                        isSupporter
                                            ? 'border-green-500/40 bg-green-500/15 text-green-300'
                                            : 'border-gray-600 bg-gray-800/80 text-gray-400'
                                    }`}
                                >
                                    {isSupporter ? 'Supporter · ad-free' : 'Free user'}
                                </span>
                                <p className="text-xs text-gray-500">
                                    Preferences sync to your account when signed in, and stay on this device as a backup.
                                </p>
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

            case 'appearance':
                return (
                    <div className="space-y-6">
                        <SettingsCard
                            title="Theme"
                            description="Choose a color scheme for the entire app. Hover to preview, click to apply."
                            icon={Palette}
                        >
                            <ThemePicker />
                        </SettingsCard>
                    </div>
                );

            case 'cinepro':
                return (
                    <CineProSettingsView />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background-main pt-20 pb-12">
            <SEOHead
                title="Settings"
                description="Manage CINEFLIX playback, appearance, accessibility, and account preferences."
            />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-gray-400">
                        {isAuthenticated
                            ? 'Manage your profile, preferences, and account settings — synced to your account'
                            : 'Customize playback, appearance, and privacy for this device. Sign in to sync across devices.'}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="auth-card rounded-2xl p-2 sticky top-24">
                            <nav className="space-y-1" aria-label="Settings sections">
                                {visibleTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => selectTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === tab.id
                                                ? 'bg-buttons-purple text-white shadow-lg shadow-buttons-purple/25'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
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
            <SaveStatusIndicator status={saveStatus} error={error} persistenceMode={persistenceMode} />

            {/* Modals — account actions only when signed in */}
            {isAuthenticated && showLogoutAllModal && (
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
                                className="flex-1 px-4 py-2 bg-buttons-purple hover:bg-buttons-purpleHover text-white rounded-lg font-medium transition-colors"
                            >
                                Sign Out All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAuthenticated && showDeleteAccountModal && (
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
                                className="flex-1 px-4 py-2 bg-buttons-purple hover:bg-buttons-purpleHover text-white rounded-lg font-medium transition-colors"
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
            {isAuthenticated && showAvatarModal && (
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

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
                            {AVATARS.map((avatar) => {
                                const AvatarComponent = avatar.Component;
                                const isSelected = resolveAvatarId(user?.avatar || '') === avatar.id;
                                return (
                                    <button
                                        key={avatar.id}
                                        type="button"
                                        onClick={() => handleAvatarChange(avatar.id)}
                                        disabled={avatarLoading}
                                        className={`relative group flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${isSelected
                                            ? 'bg-buttons-purple/20 ring-2 ring-buttons-purple'
                                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                                            } ${avatarLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-full overflow-hidden transition-transform ${!avatarLoading ? 'group-hover:scale-110' : ''}`}>
                                            <AvatarComponent className="w-full h-full" />
                                        </div>
                                        <span className="text-xs text-gray-400 mt-2 text-center">{avatar.name}</span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-buttons-purple rounded-full flex items-center justify-center">
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
        </div>
    );
};

export default SettingsPage;
