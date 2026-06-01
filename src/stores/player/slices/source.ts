import type { MakeSlice } from '@/stores/player/slices/types';
import type { StreamSource } from '@/types';
import {
  type SourceQuality,
  type SourceSliceSource,
  selectQuality,
} from '@/stores/player/utils/qualities';
import { useQualityStore } from '@/stores/quality';
import type { ValuesOf } from '@/utils/typeguard';
import type { ScrapeMedia } from '@/lib/providers';

export const playerStatus = {
  IDLE: 'idle',
  RESUME: 'resume',
  SCRAPING: 'scraping',
  PLAYING: 'playing',
  SCRAPE_NOT_FOUND: 'scrapeNotFound',
  PLAYBACK_ERROR: 'playbackError',
} as const;

export type PlayerStatus = ValuesOf<typeof playerStatus>;

export interface PlayerMetaEpisode {
  number: number;
  tmdbId: string;
  title: string;
  air_date?: string;
  overview?: string;
}

export interface PlayerMeta {
  type: 'movie' | 'show';
  title: string;
  tmdbId: string;
  imdbId?: string;
  releaseYear: number;
  poster?: string;
  overview?: string;
  episodes?: PlayerMetaEpisode[];
  episode?: PlayerMetaEpisode;
  season?: {
    number: number;
    tmdbId: string;
    title: string;
  };
}

export interface Caption {
  id: string;
  language: string;
  url?: string;
  srtData: string;
}

export interface CaptionListItem {
  id: string;
  language: string;
  url: string;
  type?: string;
  needsProxy: boolean;
  hls?: boolean;
  opensubtitles?: boolean;
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
  flagUrl?: string;
  release?: string | null;
  releases?: string[];
  origin?: string | null;
}

export interface AudioTrack {
  id: string;
  label: string;
  language: string;
}

export interface TranslateTask {
  targetCaption: CaptionListItem;
  fetchedTargetCaption?: Caption;
  targetLanguage: string;
  translatedCaption?: Caption;
  done: boolean;
  error: boolean;
  cancel: () => void;
}

export interface SourceSlice {
  status: PlayerStatus;
  source: SourceSliceSource | null;
  sourceId: string | null;
  embedId: string | null;
  qualities: SourceQuality[];
  audioTracks: AudioTrack[];
  currentQuality: SourceQuality | null;
  currentAudioTrack: AudioTrack | null;
  captionList: CaptionListItem[];
  isLoadingExternalSubtitles: boolean;
  caption: {
    selected: Caption | null;
    asTrack: boolean;
    translateTask: TranslateTask | null;
  };
  meta: PlayerMeta | null;
  displayMode: 'native' | 'iframe';
  iframeSource: StreamSource | null;
  failedSourcesPerMedia: Record<string, string[]>;
  failedEmbedsPerMedia: Record<string, Record<string, string[]>>;
  resumeFromSourceId: string | null;
  setStatus(status: PlayerStatus): void;
  setSource(
    stream: SourceSliceSource,
    captions: CaptionListItem[],
    startAt: number,
  ): void;
  switchQuality(quality: SourceQuality): void;
  setMeta(meta: PlayerMeta, status?: PlayerStatus): void;
  setCaption(caption: Caption | null): void;
  setSourceId(id: string | null): void;
  setEmbedId(id: string | null): void;
  enableAutomaticQuality(): void;
  redisplaySource(startAt: number): void;
  setCaptionAsTrack(asTrack: boolean): void;
  addExternalSubtitles(): Promise<void>;
  translateCaption(
    targetCaption: CaptionListItem,
    targetLanguage: string,
  ): Promise<void>;
  clearTranslateTask(): void;
  addFailedSource(sourceId: string): void;
  addFailedEmbed(sourceId: string, embedId: string): void;
  clearFailedSources(mediaKey?: string): void;
  clearFailedEmbeds(mediaKey?: string): void;
  setResumeFromSourceId(sourceId: string | null): void;
  setDisplayMode(mode: 'native' | 'iframe'): void;
  setIframeSource(source: StreamSource | null): void;
  switchToClassic(source: StreamSource): void;
  switchToNative(): void;
  reset(): void;
}

/**
 * Generates a unique media key for tracking failed sources per media.
 * For movies: `${type}-${tmdbId}`
 * For shows: `${type}-${tmdbId}-${season.tmdbId}-${episode.tmdbId}`
 */
export function getMediaKey(meta: PlayerMeta | null): string | null {
  if (!meta) return null;
  if (meta.type === 'movie') {
    return `${meta.type}-${meta.tmdbId}`;
  }
  if (meta.type === 'show' && meta.season && meta.episode) {
    return `${meta.type}-${meta.tmdbId}-${meta.season.tmdbId}-${meta.episode.tmdbId}`;
  }
  return `${meta.type}-${meta.tmdbId}`;
}

export function metaToScrapeMedia(meta: PlayerMeta): ScrapeMedia {
  if (meta.type === 'show') {
    if (!meta.episode || !meta.season) throw new Error('missing show data');
    return {
      title: meta.title,
      releaseYear: meta.releaseYear,
      tmdbId: meta.tmdbId,
      type: 'show',
      imdbId: meta.imdbId,
      episode: meta.episode,
      season: meta.season,
    };
  }

  return {
    title: meta.title,
    releaseYear: meta.releaseYear,
    tmdbId: meta.tmdbId,
    type: 'movie',
    imdbId: meta.imdbId,
  };
}

export const createSourceSlice: MakeSlice<SourceSlice> = (set, get) => ({
  source: null,
  sourceId: null,
  embedId: null,
  qualities: [],
  audioTracks: [],
  captionList: [],
  displayMode: 'native',
  iframeSource: null,
  isLoadingExternalSubtitles: false,
  currentQuality: null,
  currentAudioTrack: null,
  status: playerStatus.IDLE,
  meta: null,
  failedSourcesPerMedia: {},
  failedEmbedsPerMedia: {},
  resumeFromSourceId: null,
  caption: {
    selected: null,
    asTrack: false,
    translateTask: null,
  },

  setSourceId(id) {
    set((s) => {
      s.status = playerStatus.PLAYING;
      s.sourceId = id;
      s.embedId = null;
    });
  },

  setEmbedId(id) {
    set((s) => {
      s.embedId = id;
    });
  },

  setStatus(status: PlayerStatus) {
    set((s) => {
      s.status = status;
    });
  },

  setMeta(meta, newStatus) {
    const store = get();
    const oldMediaKey = getMediaKey(store.meta);
    const newMediaKey = getMediaKey(meta);
    set((s) => {
      s.meta = meta;
      s.embedId = null;
      s.sourceId = null;
      s.interface.hideNextEpisodeBtn = false;
      if (newStatus) s.status = newStatus;
      if (newMediaKey && oldMediaKey && oldMediaKey !== newMediaKey) {
        delete s.failedSourcesPerMedia[newMediaKey];
        delete s.failedEmbedsPerMedia[newMediaKey];
      }
    });
  },

  setCaption(caption) {
    const store = get();
    store.display?.setCaption(caption);
    if (
      !caption ||
      (store.caption.translateTask &&
        store.caption.translateTask.targetCaption.id !== caption.id &&
        store.caption.translateTask.translatedCaption?.id !== caption.id)
    ) {
      store.clearTranslateTask();
    }
    set((s) => {
      s.caption.selected = caption;
    });
  },

  setSource(
    stream: SourceSliceSource,
    captions: CaptionListItem[],
    startAt: number,
  ) {
    let qualities: string[] = [];
    if (stream.type === 'file') qualities = Object.keys(stream.qualities);
    const qualityPreferences = useQualityStore.getState();
    const loadableStream = selectQuality(stream, qualityPreferences.quality);
    set((s) => {
      s.source = stream;
      s.qualities = qualities as SourceQuality[];
      s.currentQuality = loadableStream.quality;
      s.captionList = captions;
      s.interface.error = undefined;
      s.status = playerStatus.PLAYING;
      s.audioTracks = [];
      s.currentAudioTrack = null;
    });
    const store = get();
    store.redisplaySource(startAt);
    setTimeout(() => {
      void store.addExternalSubtitles();
    }, 100);
  },

  redisplaySource(startAt: number) {
    const store = get();
    if (!store.source) return;
    const qualityPreferences = useQualityStore.getState();
    const loadableStream = selectQuality(store.source, {
      automaticQuality: qualityPreferences.quality.automaticQuality,
      lastChosenQuality: qualityPreferences.quality.lastChosenQuality,
    });
    set((s) => {
      s.interface.error = undefined;
      s.status = playerStatus.PLAYING;
    });
    store.display?.load({
      source: loadableStream.stream,
      startAt,
      automaticQuality: qualityPreferences.quality.automaticQuality,
      preferredQuality: qualityPreferences.quality.lastChosenQuality,
    });
  },

  switchQuality(quality) {
    const store = get();
    if (!store.source) return;
    if (store.source.type === 'file') {
      const selectedQuality = store.source.qualities[quality];
      if (!selectedQuality) return;
      set((s) => {
        s.currentQuality = quality;
        s.status = playerStatus.PLAYING;
        s.interface.error = undefined;
      });
      store.display?.load({
        source: {
          ...selectedQuality,
          headers: store.source.headers,
          preferredHeaders: store.source.preferredHeaders,
        },
        startAt: store.progress.time,
        automaticQuality: false,
        preferredQuality: quality,
      });
    } else if (store.source.type === 'hls') {
      store.display?.changeQuality(false, quality);
    }
  },

  enableAutomaticQuality() {
    const store = get();
    store.display?.changeQuality(true, null);
  },

  setCaptionAsTrack(asTrack: boolean) {
    set((s) => {
      s.caption.asTrack = asTrack;
    });
  },

  async addExternalSubtitles() {
    const store = get();
    if (!store.meta) return;
    set((s) => {
      s.isLoadingExternalSubtitles = true;
    });
    try {
      const { scrapeExternalSubtitles } = await import(
        '@/utils/externalSubtitles'
      );
      const externalCaptions = await scrapeExternalSubtitles(store.meta);
      set((s) => {
        const existingIds = new Set(s.captionList.map((caption) => caption.id));
        s.captionList = [
          ...s.captionList,
          ...externalCaptions.filter((caption) => !existingIds.has(caption.id)),
        ];
      });
    } catch {
      // External subtitles are optional; bundled/provider captions remain usable.
    } finally {
      set((s) => {
        s.isLoadingExternalSubtitles = false;
      });
    }
  },

  async translateCaption(targetCaption, targetLanguage) {
    const abortController = new AbortController();
    set((s) => {
      s.caption.translateTask = {
        targetCaption,
        targetLanguage,
        done: false,
        error: false,
        cancel: () => abortController.abort(),
      };
    });

    try {
      const { downloadCaption } = await import('@/backend/helpers/subs');
      const srtData = await downloadCaption(targetCaption);
      if (abortController.signal.aborted) return;
      const translatedCaption: Caption = {
        id: `${targetCaption.id}-translated-${targetLanguage}`,
        language: targetLanguage,
        srtData,
      };
      set((s) => {
        if (!s.caption.translateTask) return;
        s.caption.translateTask.fetchedTargetCaption = {
          id: targetCaption.id,
          language: targetCaption.language,
          srtData,
        };
        s.caption.translateTask.translatedCaption = translatedCaption;
        s.caption.translateTask.done = true;
      });
    } catch {
      set((s) => {
        if (s.caption.translateTask) s.caption.translateTask.error = true;
      });
    }
  },

  clearTranslateTask() {
    set((s) => {
      s.caption.translateTask?.cancel();
      s.caption.translateTask = null;
    });
  },

  addFailedSource(sourceId: string) {
    const store = get();
    const mediaKey = getMediaKey(store.meta);
    if (!mediaKey) return;
    set((s) => {
      if (!s.failedSourcesPerMedia[mediaKey]) {
        s.failedSourcesPerMedia[mediaKey] = [];
      }
      if (!s.failedSourcesPerMedia[mediaKey].includes(sourceId)) {
        s.failedSourcesPerMedia[mediaKey] = [
          ...s.failedSourcesPerMedia[mediaKey],
          sourceId,
        ];
      }
    });
  },

  addFailedEmbed(sourceId: string, embedId: string) {
    const store = get();
    const mediaKey = getMediaKey(store.meta);
    if (!mediaKey) return;
    set((s) => {
      if (!s.failedEmbedsPerMedia[mediaKey]) {
        s.failedEmbedsPerMedia[mediaKey] = {};
      }
      if (!s.failedEmbedsPerMedia[mediaKey][sourceId]) {
        s.failedEmbedsPerMedia[mediaKey][sourceId] = [];
      }
      if (!s.failedEmbedsPerMedia[mediaKey][sourceId].includes(embedId)) {
        s.failedEmbedsPerMedia[mediaKey][sourceId] = [
          ...s.failedEmbedsPerMedia[mediaKey][sourceId],
          embedId,
        ];
      }
    });
  },

  clearFailedSources(mediaKey?: string) {
    set((s) => {
      if (mediaKey) {
        delete s.failedSourcesPerMedia[mediaKey];
      } else {
        s.failedSourcesPerMedia = {};
      }
    });
  },

  clearFailedEmbeds(mediaKey?: string) {
    set((s) => {
      if (mediaKey) {
        delete s.failedEmbedsPerMedia[mediaKey];
      } else {
        s.failedEmbedsPerMedia = {};
      }
    });
  },

  setResumeFromSourceId(sourceId: string | null) {
    set((s) => {
      s.resumeFromSourceId = sourceId;
    });
  },

  setDisplayMode(mode) {
    set((s) => {
      s.displayMode = mode;
    });
  },

  setIframeSource(source) {
    set((s) => {
      s.iframeSource = source;
    });
  },

  switchToClassic(source) {
    set((s) => {
      s.displayMode = 'iframe';
      s.iframeSource = source;
      s.status = playerStatus.PLAYING;
    });
  },

  switchToNative() {
    set((s) => {
      s.displayMode = 'native';
      s.iframeSource = null;
    });
  },

  reset() {
    get().clearSkipSegments?.();
    set((s) => {
      s.source = null;
      s.sourceId = null;
      s.embedId = null;
      s.qualities = [];
      s.audioTracks = [];
      s.captionList = [];
      s.isLoadingExternalSubtitles = false;
      s.currentQuality = null;
      s.currentAudioTrack = null;
      s.status = playerStatus.IDLE;
      s.meta = null;
      s.failedSourcesPerMedia = {};
      s.failedEmbedsPerMedia = {};
      s.resumeFromSourceId = null;
      s.displayMode = 'native';
      s.iframeSource = null;
      s.caption = {
        selected: null,
        asTrack: false,
        translateTask: null,
      };
    });
  },
});
