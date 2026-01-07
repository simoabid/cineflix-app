import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Movie, TVShow } from '../types';
import { getImageUrl } from '../services/tmdb';
import { handleImageError } from '../utils/imageLoader';
// Removed in-card buttons; keep preview actions instead
import HoverPreviewCard from './HoverPreviewCard';
import { useScreenSize } from '../hooks/useScreenSize';
import { useHoverIntent } from '../hooks/useHoverIntent';

type MinimalContent = Partial<Movie & TVShow> & {
  id?: number;
  poster_path?: string | null;
  logo_path?: string | null;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
};

interface ContentCardProps {
  item: MinimalContent;
  mediaType?: 'movie' | 'tv';
  size?: 'sm' | 'md';
  showTitleBelow?: boolean;
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  mediaType,
  size = 'md',
  showTitleBelow = true,
  className = ''
}) => {
  // No direct navigate on card overlay; handled in preview
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreviewHovering, setIsPreviewHovering] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useScreenSize();

  // Disable hover effects on mobile and tablet
  const shouldShowHover = !isMobile && !isTablet;

  // Use hover intent hook for smart hover detection
  const { visible: isHovering, onPointerEnter, onPointerLeave, onFocus, onBlur } = useHoverIntent({
    hoverDelay: 180,
    pointerMoveThreshold: 120,
    wheelThreshold: 250
  });
  const derivedType: 'movie' | 'tv' = mediaType || (item.media_type === 'tv' ? 'tv' : 'movie');
  const title = item.title || item.name || '';
  const year = (() => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : '';
  })();
  const rating = typeof item.vote_average === 'number' ? item.vote_average : undefined;

  const widthClass = size === 'sm' ? 'w-32 sm:w-36 md:w-40 lg:w-48' : 'w-36 sm:w-40 md:w-48 lg:w-64';

  return (
    <div
      ref={anchorRef}
      className={`relative flex-shrink-0 ${widthClass} ${className}`}
      onPointerEnter={shouldShowHover ? onPointerEnter : undefined}
      onPointerLeave={shouldShowHover ? onPointerLeave : undefined}
      onFocus={shouldShowHover ? onFocus : undefined}
      onBlur={shouldShowHover ? onBlur : undefined}
      tabIndex={shouldShowHover ? 0 : undefined}
    >
      <Link
        to={`/${derivedType}/${item.id}`}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-netflix-red rounded-xl"
      >
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10 bg-gray-800 transition-opacity duration-300"
        >
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800">
              <div className="absolute inset-0 animate-pulse bg-white/5"></div>
            </div>
          )}

          <img
            src={getImageUrl(item.poster_path || null, 'w500')}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            onError={handleImageError}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />

          {/* Type badge */}
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-black/70 text-white tracking-wide">
              {derivedType === 'movie' ? 'MOVIE' : 'TV'}
            </span>
          </div>

          {/* Rating badge */}
          {typeof rating === 'number' && rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-white text-xs font-medium">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {(rating || 0).toFixed(1)}
            </div>
          )}

          {/* Removed bottom overlay to avoid duplication with info below card */}
        </div>
      </Link>

      {showTitleBelow && (
        <div className="mt-2 px-0.5">
          <h5 className="text-white/90 text-sm font-semibold line-clamp-2 hover:text-netflix-red transition-colors">
            {title}
          </h5>
          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
            {year && <span>{year}</span>}
            {typeof rating === 'number' && (
              <>
                <span>•</span>
                <span>{(rating || 0).toFixed(1)} ★</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hover Preview (Portal) - Only on desktop */}
      {shouldShowHover && anchorRef.current && (isHovering || isPreviewHovering) && (
        <HoverPreviewCard
          item={item}
          mediaType={derivedType}
          anchorRect={anchorRef.current.getBoundingClientRect()}
          visible={isHovering || isPreviewHovering}
          onMouseEnterPreview={() => setIsPreviewHovering(true)}
          onMouseLeavePreview={() => setIsPreviewHovering(false)}
        />
      )}
    </div>
  );
};

export default ContentCard;


