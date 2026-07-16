import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  SUPPORT_BANNER_COOLDOWN_MS,
  SUPPORT_STORAGE_KEY,
  areSupportAdsEnabled,
  migrateLegacyShowSupportAds,
  shouldShowSupportBanner,
} from './utils';

export type SupportState = {
  /** Prefer showing support ads when inventory exists (default true). */
  showSupportAds: boolean;
  /** Honor-system / future webhook: supporter forces ads off. */
  isSupporter: boolean;
  /** Timestamp when the soft banner was last dismissed (null = never). */
  supportBannerDismissedAt: number | null;
  setShowSupportAds: (value: boolean) => void;
  setIsSupporter: (value: boolean) => void;
  dismissSupportBanner: () => void;
  /** Merge server preferences without clobbering unspecified fields. */
  hydrateFromServer: ( partial: {
    showSupportAds?: boolean;
    isSupporter?: boolean;
  }) => void;
};

export const useSupportStore = create(
  persist(
    immer<SupportState>((set) => ({
      showSupportAds: true,
      isSupporter: false,
      supportBannerDismissedAt: null,

      setShowSupportAds(value) {
        set((s) => {
          s.showSupportAds = value;
        });
      },

      setIsSupporter(value) {
        set((s) => {
          s.isSupporter = value;
          // Supporters never see support ads
          if (value) s.showSupportAds = false;
        });
      },

      dismissSupportBanner() {
        set((s) => {
          s.supportBannerDismissedAt = Date.now();
        });
      },

      hydrateFromServer(partial) {
        set((s) => {
          if (typeof partial.showSupportAds === 'boolean') {
            s.showSupportAds = partial.showSupportAds;
          }
          if (typeof partial.isSupporter === 'boolean') {
            s.isSupporter = partial.isSupporter;
            if (partial.isSupporter) s.showSupportAds = false;
          }
        });
      },
    })),
    {
      name: SUPPORT_STORAGE_KEY,
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SupportState>;
        const legacy = migrateLegacyShowSupportAds();
        if (legacy !== null && state.showSupportAds === undefined) {
          return {
            ...state,
            showSupportAds: legacy,
          };
        }
        return state;
      },
      partialize: (state) => ({
        showSupportAds: state.showSupportAds,
        isSupporter: state.isSupporter,
        supportBannerDismissedAt: state.supportBannerDismissedAt,
      }),
    },
  ),
);

/** Selector: effective ad permission for Phase 2 loaders. */
export function selectSupportAdsAllowed(state: SupportState): boolean {
  return areSupportAdsEnabled(state.showSupportAds, state.isSupporter);
}

export function selectShouldShowSupportBanner(
  state: SupportState,
  pathname: string,
  now?: number,
): boolean {
  return shouldShowSupportBanner({
    pathname,
    dismissedAt: state.supportBannerDismissedAt,
    isSupporter: state.isSupporter,
    now,
  });
}

export { areSupportAdsEnabled, shouldShowSupportBanner, SUPPORT_BANNER_COOLDOWN_MS };
