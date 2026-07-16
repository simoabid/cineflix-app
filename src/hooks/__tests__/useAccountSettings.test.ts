import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAccountSettings,
  defaultSettings,
  GUEST_SETTINGS_STORAGE_KEY,
  loadGuestSettings,
  saveGuestSettings,
  sanitizeSettings,
  isAllDefaultSettings,
  getGuestGlobalOverrides,
  type AccountSettings,
} from '../useAccountSettings';

const mockGetPreferences = vi.fn();
const mockSavePreferences = vi.fn();

vi.mock('../../services/api', () => ({
  preferencesApi: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    savePreferences: (...args: unknown[]) => mockSavePreferences(...args),
  },
}));

const mockAuth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as { id: string; email: string; name: string; createdAt: string } | null,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('sanitizeSettings / guest storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sanitizeSettings only accepts known keys and correct types', () => {
    const result = sanitizeSettings({
      videoQuality: '1080p',
      autoplayNext: false,
      evil: 'nope',
      __proto__: { polluted: true },
      autoRemoveAfterDays: 'not-a-number',
      fontSize: 12,
    });

    expect(result.videoQuality).toBe('1080p');
    expect(result.autoplayNext).toBe(false);
    expect(result.autoRemoveAfterDays).toBe(defaultSettings.autoRemoveAfterDays);
    expect(result.fontSize).toBe(defaultSettings.fontSize);
    expect((result as unknown as Record<string, unknown>).evil).toBeUndefined();
  });

  it('loadGuestSettings returns defaults when empty', () => {
    expect(loadGuestSettings()).toEqual(defaultSettings);
  });

  it('saveGuestSettings and loadGuestSettings round-trip', () => {
    const custom = { ...defaultSettings, videoQuality: '720p', reduceMotion: true };
    saveGuestSettings(custom);
    expect(loadGuestSettings().videoQuality).toBe('720p');
    expect(loadGuestSettings().reduceMotion).toBe(true);
    const raw = localStorage.getItem(GUEST_SETTINGS_STORAGE_KEY);
    expect(raw).toContain('"v":1');
  });

  it('loadGuestSettings ignores invalid JSON', () => {
    localStorage.setItem(GUEST_SETTINGS_STORAGE_KEY, '{broken');
    expect(loadGuestSettings()).toEqual(defaultSettings);
  });

  it('isAllDefaultSettings and getGuestGlobalOverrides', () => {
    expect(isAllDefaultSettings(defaultSettings)).toBe(true);
    const guest = {
      ...defaultSettings,
      videoQuality: '4k',
      emailNotifications: false,
      isSupporter: true,
      profileVisible: false,
    };
    const overrides = getGuestGlobalOverrides(guest);
    expect(overrides.videoQuality).toBe('4k');
    expect(overrides.emailNotifications).toBeUndefined();
    expect(overrides.isSupporter).toBeUndefined();
    expect(overrides.profileVisible).toBeUndefined();
  });

  it('saveGuestSettings strips unknown keys before write', () => {
    const dirty = {
      ...defaultSettings,
      videoQuality: '1080p',
      evilKey: 'drop-me',
    };
    saveGuestSettings(dirty as unknown as AccountSettings);
    const raw = JSON.parse(localStorage.getItem(GUEST_SETTINGS_STORAGE_KEY) || '{}') as Record<string, unknown>;
    expect(raw.evilKey).toBeUndefined();
    expect(raw.videoQuality).toBe('1080p');
  });
});

describe('useAccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
    mockAuth.user = null;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('guest loads from localStorage and never calls preferences API', async () => {
    saveGuestSettings({ ...defaultSettings, videoQuality: '480p' });

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.persistenceMode).toBe('local');
    expect(result.current.settings.videoQuality).toBe('480p');
    expect(mockGetPreferences).not.toHaveBeenCalled();
    expect(mockSavePreferences).not.toHaveBeenCalled();
  });

  it('guest updateSetting persists to localStorage without API', async () => {
    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSetting('autoplayNext', false);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });

    expect(mockSavePreferences).not.toHaveBeenCalled();
    expect(loadGuestSettings().autoplayNext).toBe(false);
  });

  it('authenticated user loads from API', async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'u1', email: 'a@b.com', name: 'A', createdAt: '2025-01-01' };
    mockGetPreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings, videoQuality: '1080p' },
    });

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.persistenceMode).toBe('cloud');
    expect(result.current.settings.videoQuality).toBe('1080p');
    expect(mockGetPreferences).toHaveBeenCalledTimes(1);
  });

  it('authenticated updateSetting calls savePreferences', async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'u1', email: 'a@b.com', name: 'A', createdAt: '2025-01-01' };
    mockGetPreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings },
    });
    mockSavePreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings, autoplayPreviews: false },
    });

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSetting('autoplayPreviews', false);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalled();
    });

    expect(mockSavePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ autoplayPreviews: false }),
    );
  });

  it('merges guest global overrides when cloud is all defaults', async () => {
    saveGuestSettings({ ...defaultSettings, videoQuality: '720p', reduceMotion: true });
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'u1', email: 'a@b.com', name: 'A', createdAt: '2025-01-01' };
    mockGetPreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings },
    });
    mockSavePreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings, videoQuality: '720p', reduceMotion: true },
    });

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSavePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ videoQuality: '720p', reduceMotion: true }),
    );
    expect(result.current.settings.videoQuality).toBe('720p');
  });

  it('does not merge guest blob over non-default cloud preferences', async () => {
    saveGuestSettings({
      ...defaultSettings,
      videoQuality: '480p',
      reduceMotion: true,
      isSupporter: true,
      emailNotifications: false,
    });
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'u1', email: 'a@b.com', name: 'A', createdAt: '2025-01-01' };
    mockGetPreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings, videoQuality: '1080p', autoplayNext: false },
    });

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSavePreferences).not.toHaveBeenCalled();
    expect(result.current.settings.videoQuality).toBe('1080p');
    expect(result.current.settings.autoplayNext).toBe(false);
    expect(result.current.settings.reduceMotion).toBe(false);
    expect(result.current.settings.isSupporter).toBe(false);
  });

  it('never merges isSupporter from guest localStorage into new cloud profile', async () => {
    saveGuestSettings({ ...defaultSettings, isSupporter: true, videoQuality: '720p' });
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'u2', email: 'b@b.com', name: 'B', createdAt: '2025-01-01' };
    mockGetPreferences.mockResolvedValue({
      success: true,
      data: { ...defaultSettings },
    });
    mockSavePreferences.mockImplementation(async (payload: Partial<AccountSettings>) => ({
      success: true,
      data: { ...defaultSettings, ...payload },
    }));

    const { result } = renderHook(() => useAccountSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSavePreferences).toHaveBeenCalled();
    const mergePayload = mockSavePreferences.mock.calls[0][0] as Partial<AccountSettings>;
    expect(mergePayload.isSupporter).toBeUndefined();
    expect(mergePayload.videoQuality).toBe('720p');
    expect(result.current.settings.isSupporter).toBe(false);
  });
});
