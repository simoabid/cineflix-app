import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Star } from 'lucide-react';
import { Movie, TVShow } from '../types';
import { getImageUrl } from '../services/tmdb';
import { handleImageError } from '../utils/imageLoader';
import AddToListButton from './AddToListButton';
import LikeButton from './LikeButton';
import { useNavigate } from 'react-router-dom';
import { useSmartPlayer } from '../hooks/useSmartPlayer';
import { useCertification } from '../hooks/useCertification';

type MinimalContent = Partial<Movie & TVShow> & {
  id?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
  overview?: string;
};

interface HoverPreviewCardProps {
  item: MinimalContent;
  mediaType: 'movie' | 'tv';
  anchorRect: DOMRect;
  visible: boolean;
  onMouseEnterPreview: () => void;
  onMouseLeavePreview: () => void;
}

const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT_APPROX = 330;

/** Premium cubic-bezier curves for Netflix-style transitions */
const EASING_ENTER = 'cubic-bezier(0.25, 1, 0.5, 1)';
const EASING_EXIT  = 'cubic-bezier(0.25, 0, 0.3, 1)';
const DURATION_ENTER_MS = 330;
const DURATION_EXIT_MS  = 220;

const HoverPreviewCard: React.FC<HoverPreviewCardProps> = ({
  item,
  mediaType,
  anchorRect,
  visible,
  onMouseEnterPreview,
  onMouseLeavePreview
}) => {
  const navigate = useNavigate();
  const { openPlayer } = useSmartPlayer();
  const [mounted, setMounted] = useState(false);
  const [animVisible, setAnimVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tight show/hide delays tuned to match enter/exit animation durations
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // Small settle delay — lets the card render before triggering the scale
      showTimerRef.current = window.setTimeout(() => {
        setAnimVisible(true);
      }, 50);
    } else {
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      // Exit immediately so it feels highly responsive
      hideTimerRef.current = window.setTimeout(() => {
        setAnimVisible(false);
      }, DURATION_EXIT_MS);
    }
    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [visible, mounted]);

  /**
   * Position the preview so its center aligns with the original card's center.
   * The preview is wider/taller than the card — by centering on the card's
   * midpoint the scale animation radiates equally in all directions (center center).
   */
  const position = useMemo(() => {
    const margin = 12;
    // Horizontal: center preview on card's horizontal midpoint
    const cardCenterX = anchorRect.left + anchorRect.width / 2;
    const centerLeft = cardCenterX - PREVIEW_WIDTH / 2;
    const clampedLeft = Math.max(margin, Math.min(window.innerWidth - PREVIEW_WIDTH - margin, centerLeft));

    // Vertical: center preview on card's vertical midpoint
    const cardCenterY = anchorRect.top + anchorRect.height / 2;
    const centerTop = cardCenterY - PREVIEW_HEIGHT_APPROX / 2;
    const clampedTop = Math.max(margin, Math.min(window.innerHeight - PREVIEW_HEIGHT_APPROX - margin, centerTop));

    return { left: clampedLeft, top: clampedTop };
  }, [anchorRect]);

  // Compute scale-origin so animation radiates from card center even when
  // the preview panel is clamped to avoid viewport edges.
  // MUST live above the early return to satisfy Rules of Hooks.
  const transformOriginX = useMemo(() => {
    const cardCenterX = anchorRect.left + anchorRect.width / 2;
    const originPct = ((cardCenterX - position.left) / PREVIEW_WIDTH) * 100;
    return `${Math.round(Math.min(100, Math.max(0, originPct)))}%`;
  }, [anchorRect, position]);

  const transformOriginY = useMemo(() => {
    const cardCenterY = anchorRect.top + anchorRect.height / 2;
    const originPct = ((cardCenterY - position.top) / PREVIEW_HEIGHT_APPROX) * 100;
    return `${Math.round(Math.min(100, Math.max(0, originPct)))}%`;
  }, [anchorRect, position]);

  // Lazy-fetch real certification — fires only on hover, cached per session.
  // MUST be above the early return to satisfy Rules of Hooks.
  const { certification, isLoading: isCertLoading } = useCertification({
    id: item.id,
    mediaType,
  });

  if (!mounted) return null;

  const title = item.title || item.name || '';
  const year = (() => {
    const d = item.release_date || item.first_air_date;
    return d ? new Date(d).getFullYear() : '';
  })();
  const rating = typeof item.vote_average === 'number' ? item.vote_average : undefined;


  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!rootRef.current) return;
    const originalPointerEvents = rootRef.current.style.pointerEvents;
    rootRef.current.style.pointerEvents = 'none';
    const beneath = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    rootRef.current.style.pointerEvents = originalPointerEvents;

    let scrollEl: HTMLElement | null = beneath;
    while (scrollEl && scrollEl !== document.body) {
      const hasHorizontal = scrollEl.scrollWidth > scrollEl.clientWidth;
      const style = window.getComputedStyle(scrollEl);
      const overflowX = style.overflowX;
      if (hasHorizontal && (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay')) {
        break;
      }
      scrollEl = scrollEl.parentElement as HTMLElement | null;
    }

    if (scrollEl && scrollEl !== document.body) {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrollEl.scrollLeft += delta;
    }
  };



  return createPortal(
    <>
      {/* ── Full-screen dim overlay (lightbox) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 59,
          backgroundColor: 'rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          opacity: animVisible ? 1 : 0,
          transition: animVisible
            ? `opacity ${DURATION_ENTER_MS}ms ${EASING_ENTER}`
            : `opacity ${DURATION_EXIT_MS}ms ${EASING_EXIT}`,
          willChange: 'opacity',
        }}
      />

      {/* ── Preview card wrapper ── */}
      <div
        className="fixed pointer-events-auto"
        style={{
          left: position.left,
          top: position.top,
          width: PREVIEW_WIDTH,
          zIndex: 60,
        }}
        onPointerEnter={onMouseEnterPreview}
        onPointerLeave={onMouseLeavePreview}
      >
      <div
        ref={rootRef}
        className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gray-900/70 backdrop-blur-xl shadow-2xl cursor-pointer"
        onClick={() => item.id && navigate(`/${mediaType}/${item.id}`)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && item.id) {
            e.preventDefault();
            navigate(`/${mediaType}/${item.id}`);
          }
        }}
        role="button"
        tabIndex={0}
        onWheel={handleWheel}
        style={{
          transformOrigin: `${transformOriginX} ${transformOriginY}`,
          willChange: 'transform, opacity',
          transform: animVisible
            ? 'scale(1) translateZ(0)'
            : 'scale(0.68) translateZ(0)',
          opacity: animVisible ? 1 : 0,
          transition: animVisible
            ? `transform ${DURATION_ENTER_MS}ms ${EASING_ENTER}, opacity ${DURATION_ENTER_MS}ms ${EASING_ENTER}`
            : `transform ${DURATION_EXIT_MS}ms ${EASING_EXIT}, opacity ${Math.round(DURATION_EXIT_MS * 0.75)}ms ${EASING_EXIT}`,
        }}
      >
        {/* Media banner */}
        <div className="relative h-36 w-full">
          <img
            src={getImageUrl(item.backdrop_path || item.poster_path || null, 'w780')}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          {typeof rating === 'number' && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-white text-xs font-medium">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3">
            <img
              src={getImageUrl(item.poster_path || null, 'w342')}
              alt={title}
              className="w-20 h-28 object-cover rounded-lg ring-1 ring-white/10"
              onError={handleImageError}
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white text-lg font-semibold leading-tight line-clamp-2">{title}</h3>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-black/70 text-white tracking-wide">
                  {mediaType === 'movie' ? 'MOVIE' : 'TV'}
                </span>
              </div>
              <div className="mt-1 text-xs flex items-center gap-2 flex-wrap">
                {/* Green match score derived from vote_average */}
                {typeof rating === 'number' && rating > 0 && (
                  <span className="text-green-400 font-bold text-sm">
                    {Math.round(rating * 10)}% Match
                  </span>
                )}
                {/* HD quality badge */}
                <span className="border border-white/40 text-white/70 text-[10px] font-semibold px-1 py-0.5 rounded">
                  HD
                </span>
                {/* Content rating badge — real TMDB certification, lazy-fetched */}
                <span className="border border-white/40 text-white/70 text-[10px] font-semibold px-1 py-0.5 rounded">
                  {isCertLoading ? '···' : (certification ?? (mediaType === 'tv' ? 'TV-MA' : 'NR'))}
                </span>
                {/* Release year */}
                {year && <span className="text-gray-400">{year}</span>}
              </div>
              <p className="mt-2 text-sm text-gray-300 line-clamp-3">
                {item.overview}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id) openPlayer({ tmdbId: item.id, type: mediaType });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium shadow hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            <AddToListButton
              content={item as Movie | TVShow}
              contentType={mediaType}
              variant="button"
              className="bg-black/40 text-white border border-white/20 hover:bg-black/60"
              showText={true}
            />
            <LikeButton
              content={item as Movie | TVShow}
              contentType={mediaType}
              variant="button"
              className="bg-black/40 text-white border border-white/20 hover:bg-black/60"
              showText={true}
            />
          </div>
        </div>
      </div>
      </div>
    </>,
    document.body
  );
};

export default HoverPreviewCard;


