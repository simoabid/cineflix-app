import Hls from 'hls.js';

export const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent,
);

export const isFirefox = /firefox/i.test(navigator.userAgent);

let cachedVolumeResult: boolean | null = null;

/**
 * Tests whether the browser allows programmatic volume changes.
 * iOS Safari ignores `video.volume` changes — this detects that.
 */
export async function canChangeVolume(): Promise<boolean> {
  if (cachedVolumeResult !== null) return cachedVolumeResult;
  const timeoutPromise = new Promise<false>((resolve) => {
    setTimeout(() => resolve(false), 1000);
  });
  const promise = new Promise<true>((resolve) => {
    const video = document.createElement('video');
    const handler = () => {
      video.removeEventListener('volumechange', handler);
      resolve(true);
    };
    video.addEventListener('volumechange', handler);
    video.volume = 0.5;
  });
  cachedVolumeResult = await Promise.race([promise, timeoutPromise]);
  return cachedVolumeResult;
}

export function canFullscreenAnyElement(): boolean {
  return !!document.fullscreenEnabled;
}

export function canWebkitFullscreen(): boolean {
  return canFullscreenAnyElement() || isSafari;
}

export function canFullscreen(): boolean {
  return canFullscreenAnyElement() || canWebkitFullscreen();
}

export function canPictureInPicture(): boolean {
  return 'pictureInPictureEnabled' in document;
}

export function canWebkitPictureInPicture(): boolean {
  return 'webkitSupportsPresentationMode' in document.createElement('video');
}

/**
 * Returns true if the browser can play HLS natively (Safari).
 * If HLS.js is supported, we prefer it over native playback for quality control.
 */
export function canPlayHlsNatively(video: HTMLVideoElement): boolean {
  if (Hls.isSupported()) return false;
  return !!video.canPlayType('application/vnd.apple.mpegurl');
}
