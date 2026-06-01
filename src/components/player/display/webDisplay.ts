import Hls, { type Level } from 'hls.js';

import type {
  DisplayInterface,
  DisplayInterfaceEvents,
  QualityChangeOptions,
  DisplayType,
} from '@/components/player/display/displayInterface';
import { handleBuffered } from '@/components/player/utils/handleBuffered';
import { getMediaErrorDetails } from '@/components/player/utils/mediaErrorDetails';
import type { AudioTrack, CaptionListItem } from '@/stores/player/slices/source';
import {
  type LoadableSource,
  type SourceQuality,
  getPreferredQuality,
} from '@/stores/player/utils/qualities';
import {
  canChangeVolume,
  canFullscreen,
  canFullscreenAnyElement,
  canPictureInPicture,
  canPlayHlsNatively,
  canWebkitFullscreen,
  canWebkitPictureInPicture,
} from '@/utils/detectFeatures';
import { makeEmitter } from '@/utils/events';

const levelConversionMap: Record<number, SourceQuality> = {
  360: '360',
  480: '480',
  720: '720',
  1080: '1080',
  2160: '4k',
};

const qualityThresholds: { minHeight: number; quality: SourceQuality }[] = [
  { minHeight: 1800, quality: '4k' },
  { minHeight: 800, quality: '1080' },
  { minHeight: 600, quality: '720' },
  { minHeight: 420, quality: '480' },
  { minHeight: 0, quality: '360' },
];

function hlsLevelToQuality(level?: Level): SourceQuality | null {
  if (!level?.height) return null;
  const exactMatch = levelConversionMap[level.height];
  if (exactMatch) return exactMatch;
  for (const threshold of qualityThresholds) {
    if (level.height >= threshold.minHeight) return threshold.quality;
  }
  return 'unknown';
}

function hlsLevelsToQualities(levels: Level[]): SourceQuality[] {
  return levels
    .map((v) => hlsLevelToQuality(v))
    .filter((v): v is SourceQuality => !!v);
}

function sortLevelsByQuality(levels: Level[]): Level[] {
  return [...levels].sort((a, b) => (b.height || 0) - (a.height || 0));
}

/**
 * Creates a DisplayInterface implementation backed by an HTML5 `<video>` element
 * and HLS.js for adaptive streaming.
 *
 * This is the core video rendering engine for CINEFLIX's native player.
 * It handles:
 * - HLS.js initialization and quality management
 * - Native `<video>` for MP4 file-based streams
 * - Safari native HLS fallback
 * - Fullscreen and Picture-in-Picture
 * - Volume, playback rate, seeking
 * - All event emission to the Zustand store via DisplayInterface events
 */
export function makeVideoElementDisplayInterface(): DisplayInterface {
  const { emit, on, off } = makeEmitter<DisplayInterfaceEvents>();
  let source: LoadableSource | null = null;
  let hls: Hls | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let containerElement: HTMLElement | null = null;
  let isFullscreen = false;
  let isPausedBeforeSeeking = false;
  let isSeeking = false;
  let startAt = 0;
  let automaticQuality = false;
  let preferenceQuality: SourceQuality | null = null;
  let lastVolume = 1;
  let lastValidDuration = 0;
  let lastValidTime = 0;
  let shouldAutoplayAfterLoad = false;
  let qualityChangeTimeout: ReturnType<typeof setTimeout> | null = null;

  function reportLevels(): void {
    if (!hls) return;
    const convertedLevels = hls.levels
      .map((v) => hlsLevelToQuality(v))
      .filter((v): v is SourceQuality => !!v);
    emit('qualities', convertedLevels);
  }

  function reportAudioTracks(): void {
    if (!hls) return;
    const audioTracks = hls.audioTracks;
    const currentTrack = audioTracks[hls.audioTrack ?? 0];
    if (!currentTrack) return;
    emit('changedaudiotrack', {
      id: currentTrack.id.toString(),
      label: currentTrack.name,
      language: currentTrack.lang ?? 'unknown',
    });
    emit(
      'audiotracks',
      hls.audioTracks.map((v) => ({
        id: v.id.toString(),
        label: v.name,
        language: v.lang ?? 'unknown',
      })),
    );
  }

  function setupQualityForHls(): void {
    if (videoElement && canPlayHlsNatively(videoElement)) return;
    if (!hls) return;
    if (!automaticQuality) {
      const sortedLevels = sortLevelsByQuality(hls.levels);
      const qualities = hlsLevelsToQualities(sortedLevels);
      const availableQuality = getPreferredQuality(qualities, {
        lastChosenQuality: preferenceQuality,
        automaticQuality,
      });
      if (availableQuality) {
        const matchingLevels = hls.levels.filter(
          (level) => hlsLevelToQuality(level) === availableQuality,
        );
        if (matchingLevels.length > 0) {
          const bestLevel = sortLevelsByQuality(matchingLevels)[0];
          const levelIndex = hls.levels.indexOf(bestLevel);
          if (levelIndex !== -1) {
            hls.currentLevel = levelIndex;
            hls.loadLevel = levelIndex;
          }
        }
      }
    } else {
      hls.currentLevel = -1;
      hls.loadLevel = -1;
    }
  }

  /**
   * Merges stream headers and preferredHeaders into one object.
   */
  function getStreamHeaders(src: LoadableSource): Record<string, string> {
    return {
      ...(src.preferredHeaders ?? {}),
      ...(src.headers ?? {}),
    };
  }

  function setupSource(vid: HTMLVideoElement, src: LoadableSource): void {
    hls = null;
    const streamHeaders = getStreamHeaders(src);
    const hasCustomHeaders = Object.keys(streamHeaders).length > 0;
    console.log('[CINEFLIX Player] Loading source:', src.type, src.url, hasCustomHeaders ? streamHeaders : '(no custom headers)');
    if (src.type === 'hls') {
      if (canPlayHlsNatively(vid)) {
        vid.src = src.url;
        vid.currentTime = startAt;
        return;
      }
      if (!Hls.isSupported()) {
        throw new Error('HLS not supported. Update your browser.');
      }
      hls = new Hls({
        autoStartLoad: true,
        maxBufferLength: 120,
        maxMaxBufferLength: 240,
        abrEwmaDefaultEstimate: 5_000_000,
        fragLoadPolicy: {
          default: {
            maxLoadTimeMs: 30_000,
            maxTimeToFirstByteMs: 30_000,
            errorRetry: {
              maxNumRetry: 10,
              retryDelayMs: 1000,
              maxRetryDelayMs: 10_000,
            },
            timeoutRetry: {
              maxNumRetry: 10,
              maxRetryDelayMs: 0,
              retryDelayMs: 0,
            },
          },
        },
        renderTextTracksNatively: false,
        // Inject stream-specific headers (Referer, Origin, etc.) into every XHR request.
        // Many stream servers reject requests without the correct Referer.
        xhrSetup(xhr: XMLHttpRequest, _url: string) {
          if (hasCustomHeaders) {
            for (const [key, value] of Object.entries(streamHeaders)) {
              try {
                xhr.setRequestHeader(key, value);
              } catch {
                // Some headers (e.g. Origin, Referer) are restricted in XHR.
                // The extension's declarativeNetRequest handles these instead.
              }
            }
          }
        },
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        const hlsErrorInfo = {
          details: data.details,
          fatal: data.fatal,
          level: data.level,
          frag: data.frag
            ? {
                url: data.frag.url,
                baseurl: data.frag.baseurl,
                duration: data.frag.duration,
                start: data.frag.start,
                sn: data.frag.sn,
              }
            : undefined,
          type: data.type,
          url: undefined as string | undefined,
        };
        console.error('[CINEFLIX Player] HLS error:', data.details, data.fatal ? '(FATAL)' : '', data.error?.message ?? '');
        if (data.fatal) {
          emit('error', {
            message: data.error?.message ?? `HLS fatal error: ${data.details}`,
            stackTrace: data.error?.stack,
            errorName: data.error?.name ?? data.details,
            type: 'hls',
            hls: hlsErrorInfo,
          });
        }
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        if (!hls) return;
        console.log('[CINEFLIX Player] HLS manifest loaded successfully');
        reportLevels();
        setupQualityForHls();
        reportAudioTracks();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (!hls) return;
        if (qualityChangeTimeout) return;
        const currentLevel = hls.levels[hls.currentLevel];
        const currentQuality = hlsLevelToQuality(currentLevel);
        if (automaticQuality) {
          emit('changedquality', currentQuality);
        } else {
          emit('changedquality', preferenceQuality);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_LOADED, () => {
        // Subtitle tracks loaded — can be used for language preference matching
      });

      hls.attachMedia(vid);
      hls.loadSource(src.url);
      vid.currentTime = startAt;
      return;
    }

    // MP4 / file-based source
    console.log('[CINEFLIX Player] Loading MP4 source:', src.url);
    vid.src = src.url;
    vid.currentTime = startAt;
  }

  function setSource(): void {
    if (!videoElement || !source) return;
    setupSource(videoElement, source);

    videoElement.addEventListener('play', () => {
      emit('play', undefined);
      emit('loading', false);
    });
    videoElement.addEventListener('error', () => {
      const err = videoElement?.error ?? null;
      const errorDetails = getMediaErrorDetails(err);
      emit('error', {
        errorName: errorDetails.name,
        key: errorDetails.key,
        type: 'htmlvideo',
      });
    });
    videoElement.addEventListener('playing', () => emit('play', undefined));
    videoElement.addEventListener('pause', () => emit('pause', undefined));
    videoElement.addEventListener('canplay', () => {
      emit('loading', false);
      if (shouldAutoplayAfterLoad && startAt === 0 && videoElement) {
        shouldAutoplayAfterLoad = false;
        videoElement.play().catch(() => {
          emit('pause', undefined);
        });
      }
    });
    videoElement.addEventListener('waiting', () => emit('loading', true));
    videoElement.addEventListener('volumechange', () =>
      emit(
        'volumechange',
        videoElement?.muted ? 0 : (videoElement?.volume ?? 0),
      ),
    );
    videoElement.addEventListener('timeupdate', () => {
      const currentTime = videoElement?.currentTime ?? 0;
      if (
        currentTime >= lastValidTime ||
        isSeeking ||
        Math.abs(currentTime - lastValidTime) > 0.1
      ) {
        lastValidTime = currentTime;
        emit('time', currentTime);
      }
    });
    videoElement.addEventListener('loadedmetadata', () => {
      if (
        source?.type === 'hls' &&
        videoElement &&
        canPlayHlsNatively(videoElement)
      ) {
        emit('qualities', ['unknown']);
        emit('changedquality', 'unknown');
      }
      const duration = videoElement?.duration ?? 0;
      if (duration > 0) {
        lastValidDuration = duration;
        emit('duration', duration);
      } else if (lastValidDuration > 0) {
        emit('duration', lastValidDuration);
      }
    });
    videoElement.addEventListener('progress', () => {
      if (!videoElement) return;
      const bufferedTime = handleBuffered(
        videoElement.currentTime,
        videoElement.buffered,
      );
      emit('buffered', bufferedTime);
    });
    videoElement.addEventListener('durationchange', () => {
      const duration = videoElement?.duration ?? 0;
      if (duration > 0) {
        lastValidDuration = duration;
        emit('duration', duration);
      } else if (lastValidDuration > 0) {
        emit('duration', lastValidDuration);
      }
    });
    videoElement.addEventListener('ratechange', () => {
      if (videoElement) emit('playbackrate', videoElement.playbackRate);
    });
    videoElement.addEventListener(
      'webkitpresentationmodechanged',
      () => {
        if (!videoElement) return;
        const webkitPlayer = videoElement as HTMLVideoElement & {
          webkitPresentationMode?: string;
        };
        const isInWebkitPip =
          webkitPlayer.webkitPresentationMode === 'picture-in-picture';
        emit('needstrack', isInWebkitPip);
      },
    );
    videoElement.addEventListener(
      'webkitplaybacktargetavailabilitychanged',
      ((e: Event & { availability?: string }) => {
        if (e.availability === 'available') {
          emit('canairplay', true);
        }
      }) as EventListener,
    );
  }

  function unloadSource(): void {
    if (qualityChangeTimeout) {
      clearTimeout(qualityChangeTimeout);
      qualityChangeTimeout = null;
    }
    if (videoElement) {
      videoElement.removeAttribute('src');
      videoElement.load();
    }
    if (hls) {
      hls.destroy();
      hls = null;
    }
    lastValidDuration = 0;
    lastValidTime = 0;
  }

  function destroyVideoElement(): void {
    unloadSource();
    videoElement = null;
    if (qualityChangeTimeout) {
      clearTimeout(qualityChangeTimeout);
      qualityChangeTimeout = null;
    }
  }

  function fullscreenChange(): void {
    isFullscreen =
      !!document.fullscreenElement ||
      !!(document as Document & { webkitFullscreenElement?: Element })
        .webkitFullscreenElement;
    emit('fullscreen', isFullscreen);
    if (!isFullscreen) emit('needstrack', false);
  }
  document.addEventListener('fullscreenchange', fullscreenChange);
  document.addEventListener('webkitfullscreenchange', fullscreenChange);

  function pictureInPictureChange(): void {
    const isPip = !!document.pictureInPictureElement;
    emit('needstrack', isPip);
  }
  document.addEventListener('enterpictureinpicture', pictureInPictureChange);
  document.addEventListener('leavepictureinpicture', pictureInPictureChange);

  return {
    on,
    off,

    getType(): DisplayType {
      return 'web';
    },

    destroy(): void {
      destroyVideoElement();
      document.removeEventListener('fullscreenchange', fullscreenChange);
      document.removeEventListener('webkitfullscreenchange', fullscreenChange);
      document.removeEventListener(
        'enterpictureinpicture',
        pictureInPictureChange,
      );
      document.removeEventListener(
        'leavepictureinpicture',
        pictureInPictureChange,
      );
    },

    load(ops: QualityChangeOptions): void {
      if (!ops.source) {
        unloadSource();
        return;
      }
      automaticQuality = ops.automaticQuality;
      preferenceQuality = ops.preferredQuality;
      source = ops.source;
      emit('loading', true);
      startAt = ops.startAt;
      shouldAutoplayAfterLoad = ops.startAt === 0;
      setSource();
    },

    changeQuality(newAutomaticQuality, newPreferredQuality): void {
      if (source?.type !== 'hls') return;
      if (qualityChangeTimeout) {
        clearTimeout(qualityChangeTimeout);
        qualityChangeTimeout = null;
      }
      automaticQuality = newAutomaticQuality;
      preferenceQuality = newPreferredQuality;
      qualityChangeTimeout = setTimeout(() => {
        setupQualityForHls();
        qualityChangeTimeout = null;
      }, 100);
    },

    processVideoElement(video: HTMLVideoElement): void {
      destroyVideoElement();
      videoElement = video;
      setSource();
      this.setVolume(lastVolume);
    },

    processContainerElement(container: HTMLElement): void {
      containerElement = container;
    },

    setMeta(): void {
      // Metadata is managed by the store, not the display
    },

    setCaption(): void {
      // Caption rendering handled by the subtitle overlay component (Phase 4)
    },

    pause(): void {
      videoElement?.pause();
    },

    play(): void {
      videoElement?.play();
    },

    setSeeking(active: boolean): void {
      if (active === isSeeking) return;
      isSeeking = active;
      if (!active) {
        if (!isPausedBeforeSeeking) this.play();
        return;
      }
      isPausedBeforeSeeking = videoElement?.paused ?? true;
      this.pause();
    },

    setTime(t: number): void {
      if (!videoElement) return;
      let time = Math.min(t, videoElement.duration);
      time = Math.max(0, time);
      if (Number.isNaN(time)) return;
      emit('time', time);
      videoElement.currentTime = time;
    },

    async setVolume(v: number): Promise<void> {
      let volume = Math.min(v, 1);
      volume = Math.max(0, volume);
      lastVolume = v;
      if (!videoElement) return;
      videoElement.muted = volume === 0;
      const isChangeable = await canChangeVolume();
      if (!videoElement) return;
      if (isChangeable) {
        videoElement.volume = volume;
      } else {
        emit('volumechange', volume === 0 ? 0 : 1);
      }
    },

    toggleFullscreen(): void {
      if (isFullscreen) {
        isFullscreen = false;
        emit('fullscreen', isFullscreen);
        emit('needstrack', false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        return;
      }
      isFullscreen = true;
      emit('fullscreen', isFullscreen);
      if (!canFullscreen() || document.fullscreenElement) return;
      if (canFullscreenAnyElement()) {
        if (containerElement) containerElement.requestFullscreen();
        return;
      }
      if (canWebkitFullscreen() && videoElement) {
        emit('needstrack', true);
        const webkitVideo = videoElement as HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        };
        webkitVideo.webkitEnterFullscreen?.();
      }
    },

    togglePictureInPicture(): void {
      if (!videoElement) return;
      if (canWebkitPictureInPicture()) {
        const webkitPlayer = videoElement as HTMLVideoElement & {
          webkitPresentationMode?: string;
          webkitSetPresentationMode?: (mode: string) => void;
        };
        webkitPlayer.webkitSetPresentationMode?.(
          webkitPlayer.webkitPresentationMode === 'picture-in-picture'
            ? 'inline'
            : 'picture-in-picture',
        );
      }
      if (canPictureInPicture()) {
        if (videoElement !== document.pictureInPictureElement) {
          videoElement.requestPictureInPicture();
        } else {
          document.exitPictureInPicture();
        }
      }
    },

    startAirplay(): void {
      const videoPlayer = videoElement as
        | (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void })
        | null;
      if (!videoPlayer?.webkitShowPlaybackTargetPicker) return;
      videoPlayer.webkitShowPlaybackTargetPicker();
    },

    setPlaybackRate(rate: number): void {
      if (videoElement) videoElement.playbackRate = rate;
    },

    getCaptionList(): CaptionListItem[] {
      return (
        hls?.subtitleTracks.map((track) => ({
          id: track.id.toString(),
          language: track.lang ?? 'unknown',
          url: track.url,
          type: 'vtt',
          needsProxy: false,
          hls: true,
        })) ?? []
      );
    },

    getSubtitleTracks() {
      return hls?.subtitleTracks ?? [];
    },

    async setSubtitlePreference(lang: string): Promise<void> {
      const track = hls?.subtitleTracks.find((t) => t.lang === lang);
      if (track?.details !== undefined) return;
      const promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Subtitle load timeout')), 5000);
        const checkLoaded = () => {
          if (!hls) {
            reject(new Error('HLS instance destroyed.'));
            return;
          }
          const loaded = hls.subtitleTracks.find(
            (t) => t.lang === lang && t.details !== undefined,
          );
          if (loaded) {
            resolve();
          } else {
            setTimeout(checkLoaded, 200);
          }
        };
        checkLoaded();
      });
      hls?.setSubtitleOption({ lang });
      return promise;
    },

    changeAudioTrack(track: AudioTrack): void {
      if (!hls) return;
      const audioTrack = hls.audioTracks.find(
        (t) => t.id.toString() === track.id,
      );
      if (!audioTrack) return;
      hls.audioTrack = hls.audioTracks.indexOf(audioTrack);
      emit('changedaudiotrack', {
        id: audioTrack.id.toString(),
        label: audioTrack.name,
        language: audioTrack.lang ?? 'unknown',
      });
    },
  };
}
