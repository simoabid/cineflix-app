import { describe, expect, it } from 'vitest';
import {
  SUPPORT_BANNER_COOLDOWN_MS,
  areSupportAdsEnabled,
  shouldShowSupportBanner,
} from '../utils';

describe('areSupportAdsEnabled', () => {
  it('is true only when ads on and not a supporter', () => {
    expect(areSupportAdsEnabled(true, false)).toBe(true);
    expect(areSupportAdsEnabled(false, false)).toBe(false);
    expect(areSupportAdsEnabled(true, true)).toBe(false);
    expect(areSupportAdsEnabled(false, true)).toBe(false);
  });
});

describe('shouldShowSupportBanner', () => {
  const now = 1_700_000_000_000;

  it('shows on normal routes when never dismissed', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/',
        dismissedAt: null,
        isSupporter: false,
        now,
      }),
    ).toBe(true);
  });

  it('hides on watch routes', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/watch/movie/123',
        dismissedAt: null,
        isSupporter: false,
        now,
      }),
    ).toBe(false);
  });

  it('hides on auth routes', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/login',
        dismissedAt: null,
        isSupporter: false,
        now,
      }),
    ).toBe(false);
  });

  it('hides for supporters', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/movies',
        dismissedAt: null,
        isSupporter: true,
        now,
      }),
    ).toBe(false);
  });

  it('hides within weekly cooldown after dismiss', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/',
        dismissedAt: now - SUPPORT_BANNER_COOLDOWN_MS + 1000,
        isSupporter: false,
        now,
      }),
    ).toBe(false);
  });

  it('shows again after weekly cooldown', () => {
    expect(
      shouldShowSupportBanner({
        pathname: '/',
        dismissedAt: now - SUPPORT_BANNER_COOLDOWN_MS - 1,
        isSupporter: false,
        now,
      }),
    ).toBe(true);
  });
});
