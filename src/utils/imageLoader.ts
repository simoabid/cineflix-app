// Image loading utilities with fallback mechanisms
import React from 'react';

export const FALLBACK_POSTER = '/fallback-poster.jpg';
export const FALLBACK_BACKDROP = '/fallback-backdrop.jpg';

// Preload images to prevent broken image display
export const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

// Get image URL with size and fallback
export const getImageUrlWithFallback = (
  path: string | null,
  size: string = 'w500',
  type: 'poster' | 'backdrop' = 'poster'
): string => {
  if (!path) {
    return type === 'poster' ? FALLBACK_POSTER : FALLBACK_BACKDROP;
  }
  
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Image component props helper
export interface ImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  onError?: () => void;
  onLoad?: () => void;
}

// Lazy loading observer
export const createLazyLoader = () => {
  if (!('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
      }
    });
  }, {
    rootMargin: '50px',
  });
};

// Image validation
export const isValidImageUrl = (url: string): boolean => {
  return url.startsWith('http') && !url.includes('null');
};

// Handle image errors
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>,
  fallback: string = FALLBACK_POSTER
) => {
  const img = event.currentTarget;
  img.src = fallback;
  img.onerror = null; // Prevent infinite loop
};

// Cache for loaded images
const imageCache = new Set<string>();

export const isImageCached = (url: string): boolean => {
  return imageCache.has(url);
};

export const cacheImage = (url: string): void => {
  imageCache.add(url);
};

// Progressive image loading
export const loadImageProgressive = (
  src: string,
  placeholder: string = '/placeholder.jpg'
): { src: string; blur: boolean } => {
  const [imageState, setImageState] = React.useState({
    src: placeholder,
    blur: true,
  });

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageState({ src, blur: false });
    };
    img.src = src;
  }, [src]);

  return imageState;
};
