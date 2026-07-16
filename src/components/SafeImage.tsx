import React, { useState } from 'react';
import { Film, Tv } from 'lucide-react';

interface SafeImageProps {
  readonly src: string;
  readonly alt: string;
  readonly title: string;
  readonly mediaType: 'movie' | 'tv';
  readonly className?: string;
  readonly loading?: 'lazy' | 'eager';
  /** Hint browser for LCP / priority images */
  readonly fetchPriority?: 'high' | 'low' | 'auto';
  /** Responsive sizes hint for the browser */
  readonly sizes?: string;
}

/**
 * Renders an image with a graceful inline SVG fallback when the source
 * is missing or fails to load. Eliminates 404 console errors caused by
 * hardcoded fallback poster paths.
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  title,
  mediaType,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isSourceMissing = !src || src.includes('null') || src.includes('undefined');

  if (hasError || isSourceMissing) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-b from-background-secondaryHover to-background-main flex flex-col items-center justify-center p-4 ${className}`}
        role="img"
        aria-label={`Poster placeholder for ${title}`}
      >
        {mediaType === 'movie' ? (
          <Film className="w-8 h-8 text-gray-500 mb-2" />
        ) : (
          <Tv className="w-8 h-8 text-gray-500 mb-2" />
        )}
        <span className="text-xs text-gray-400 text-center font-medium line-clamp-3">
          {title}
        </span>
        <span className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider">
          {mediaType}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-background-secondary animate-pulse" aria-hidden="true" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        draggable={false}
      />
    </div>
  );
};

export default SafeImage;
