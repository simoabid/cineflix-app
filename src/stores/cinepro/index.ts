import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { Stream } from '@/lib/providers/engine';
import { CineProProviderInfo, checkCineProHealth, fetchCineProProviders, isValidCineProUrl } from '@/services/cinepro-adapter';
import { CineProHealthService } from '@/services/cinepro-adapter/health';

export type CineProConnectionStatus = 'connected' | 'disconnected' | 'checking';

export interface CineProCachedStream {
  /**
   * Unique stream key used by the player (e.g. `cinepro-vidsrc-hls-1`).
   * Must NOT collapse multi-server providers onto a single id.
   */
  sourceId: string;
  /** Bare CinePro provider id (`vidsrc`, `hexa`, …) for grouping / fail-forward. */
  providerId: string;
  /** Display label — often includes server, e.g. "VidSrc (Alpha)". */
  providerName: string;
  stream: Stream;
  quality: string;
}

export interface CineProStore {
  serverUrl: string;
  isEnabled: boolean;
  connectionStatus: CineProConnectionStatus;
  availableProviders: CineProProviderInfo[];
  disabledProviderIds: string[];
  preferCinePro: boolean;
  scrapedStreams: CineProCachedStream[];

  setServerUrl: (url: string) => void;
  setIsEnabled: (enabled: boolean) => void;
  setPreferCinePro: (prefer: boolean) => void;
  toggleProvider: (providerId: string) => void;
  checkConnection: () => Promise<void>;
  loadProviders: () => Promise<void>;
  setScrapedStreams: (streams: CineProCachedStream[]) => void;
  clearScrapedStreams: () => void;
}

const defaultServerUrl = import.meta.env?.VITE_CINEPRO_URL || 'http://localhost:3005';
const defaultIsEnabled = import.meta.env?.VITE_CINEPRO_ENABLED !== 'false';

export const useCineProStore = create(
  persist(
    immer<CineProStore>((set, get) => ({
      serverUrl: defaultServerUrl,
      isEnabled: defaultIsEnabled,
      connectionStatus: 'disconnected',
      availableProviders: [],
      disabledProviderIds: [],
      preferCinePro: false,
      scrapedStreams: [],

      setServerUrl(url) {
        const normalized = url.endsWith('/') ? url.slice(0, -1) : url;
        if (!isValidCineProUrl(normalized)) {
          if (import.meta.env.DEV) {
            console.warn('[CinePro Store] Invalid server URL rejected:', url);
          }
          return;
        }
        CineProHealthService.resetFailureCount();
        set((s) => {
          s.serverUrl = normalized;
          s.connectionStatus = 'disconnected';
        });
      },

      setIsEnabled(enabled) {
        set((s) => {
          s.isEnabled = enabled;
        });
      },

      setPreferCinePro(prefer) {
        set((s) => {
          s.preferCinePro = prefer;
        });
      },

      toggleProvider(providerId) {
        set((s) => {
          const index = s.disabledProviderIds.indexOf(providerId);
          if (index !== -1) {
            s.disabledProviderIds.splice(index, 1);
          } else {
            s.disabledProviderIds.push(providerId);
          }
        });
      },

      async checkConnection() {
        set((s) => {
          s.connectionStatus = 'checking';
        });

        const isHealthy = await checkCineProHealth(get().serverUrl);

        set((s) => {
          s.connectionStatus = isHealthy ? 'connected' : 'disconnected';
        });

        if (isHealthy) {
          await get().loadProviders();
        }
      },

      async loadProviders() {
        const providers = await fetchCineProProviders(get().serverUrl);
        if (providers && providers.length > 0) {
          set((s) => {
            s.availableProviders = providers;
          });
        }
      },

      setScrapedStreams(streams) {
        set((s) => {
          s.scrapedStreams = streams;
        });
      },

      clearScrapedStreams() {
        set((s) => {
          s.scrapedStreams = [];
        });
      },
    })),
    {
      name: '__MW::cinepro',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        isEnabled: state.isEnabled,
        disabledProviderIds: state.disabledProviderIds,
        preferCinePro: state.preferCinePro,
      }),
      version: 1,
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Partial<CineProStore>;
        if (state.serverUrl === 'http://localhost:3000') {
          state.serverUrl = defaultServerUrl;
        }
        return state as CineProStore;
      },
    }
  )
);
