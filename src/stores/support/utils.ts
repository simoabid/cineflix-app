/** One week in milliseconds — support banner reappears after this. */
export const SUPPORT_BANNER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const SUPPORT_STORAGE_KEY = '__CINEFLIX::support';

/** Legacy key from early Account Support tab; migrated once into the store. */
export const LEGACY_SHOW_SUPPORT_ADS_KEY = '__CINEFLIX::showSupportAds';

/**
 * Whether the soft support banner should be visible.
 * Hidden on watch routes, while dismissed within the weekly cooldown,
 * or when the user is already marked as a supporter.
 */
export function shouldShowSupportBanner(options: {
  pathname: string;
  dismissedAt: number | null;
  isSupporter: boolean;
  now?: number;
}): boolean {
  const { pathname, dismissedAt, isSupporter, now = Date.now() } = options;
  if (isSupporter) return false;
  if (pathname.startsWith('/watch')) return false;
  if (pathname === '/login' || pathname === '/signup') return false;
  if (dismissedAt != null && now - dismissedAt < SUPPORT_BANNER_COOLDOWN_MS) {
    return false;
  }
  return true;
}

/** Ads may render only when the user wants them and is not a supporter. */
export function areSupportAdsEnabled(
  showSupportAds: boolean,
  isSupporter: boolean,
): boolean {
  return showSupportAds && !isSupporter;
}

export function migrateLegacyShowSupportAds(): boolean | null {
  try {
    const raw = localStorage.getItem(LEGACY_SHOW_SUPPORT_ADS_KEY);
    if (raw === null) return null;
    localStorage.removeItem(LEGACY_SHOW_SUPPORT_ADS_KEY);
    return raw === 'true';
  } catch {
    return null;
  }
}
