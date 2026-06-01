import type { MakeSlice } from '@/stores/player/slices/types';

export interface ThumbnailImage {
  at: number;
  data: string;
}

export interface ThumbnailSlice {
  thumbnails: {
    images: ThumbnailImage[];
    addImage(img: ThumbnailImage): void;
    resetImages(): void;
  };
}

export interface ThumbnailImagePosition {
  index: number;
  image: ThumbnailImage;
}

/**
 * Finds the nearest thumbnail image at the given timestamp.
 * Images must be sorted by `at` in ascending order.
 */
export function nearestImageAt(
  images: ThumbnailImage[],
  at: number,
): ThumbnailImagePosition | null {
  if (images.length === 0) return null;

  const indexPastTimestamp = images.findIndex((v) => v.at > at);

  if (indexPastTimestamp === -1)
    return {
      index: images.length - 1,
      image: images[images.length - 1],
    };

  const imagePastTimestamp = images[indexPastTimestamp];

  if (indexPastTimestamp === 0)
    return {
      index: indexPastTimestamp,
      image: imagePastTimestamp,
    };

  const imageBeforeTimestamp = images[indexPastTimestamp - 1];
  const distanceBefore = at - imageBeforeTimestamp.at;
  const distancePast = imagePastTimestamp.at - at;

  if (distanceBefore < distancePast)
    return {
      index: indexPastTimestamp - 1,
      image: imageBeforeTimestamp,
    };

  return {
    index: indexPastTimestamp,
    image: imagePastTimestamp,
  };
}

export const createThumbnailSlice: MakeSlice<ThumbnailSlice> = (set, get) => ({
  thumbnails: {
    images: [],
    resetImages() {
      set((s) => {
        s.thumbnails.images = [];
      });
    },
    addImage(img) {
      const store = get();
      const exactOrPastImageIndex = store.thumbnails.images.findIndex(
        (v) => v.at >= img.at,
      );

      if (exactOrPastImageIndex === -1) {
        set((s) => {
          s.thumbnails.images.push(img);
          s.thumbnails.images = [...s.thumbnails.images];
        });
        return;
      }

      const exactOrPastImage = store.thumbnails.images[exactOrPastImageIndex];

      if (exactOrPastImage.at === img.at) {
        set((s) => {
          s.thumbnails.images[exactOrPastImageIndex] = img;
          s.thumbnails.images = [...s.thumbnails.images];
        });
        return;
      }

      set((s) => {
        s.thumbnails.images.splice(exactOrPastImageIndex, 0, img);
        s.thumbnails.images = [...s.thumbnails.images];
      });
    },
  },
});
