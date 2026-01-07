import { useHoverIntent } from '../hooks/useHoverIntent';

type MovieCardProps = {
  title: string;
  poster: string;
  description?: string;
  rating?: number;
  year?: number;
};

export default function MovieCard({ title, poster, description, rating, year }: MovieCardProps) {
  const { visible, onPointerEnter, onPointerLeave, onFocus, onBlur } = useHoverIntent({
    hoverDelay: 180,
    pointerMoveThreshold: 120,
    wheelThreshold: 250
  });

  return (
    <div
      className="relative w-44 h-64 cursor-pointer"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={0} // allow keyboard focus
    >
      <img
        src={poster}
        alt={title}
        className="w-full h-full object-cover rounded-lg shadow-lg ring-1 ring-white/10"
      />

      {/* Hover popup that only appears on intentional hover */}
      {visible && (
        <div className="absolute left-2 bottom-2 w-64 p-3 rounded-lg shadow-xl bg-gray-900/95 text-white border border-white/10 z-50">
          <div className="font-semibold text-sm">{title}</div>
          {year && (
            <div className="text-xs text-gray-300 mt-1">{year}</div>
          )}
          {rating && (
            <div className="text-xs text-yellow-400 mt-1">★ {(rating || 0).toFixed(1)}</div>
          )}
          {description && (
            <div className="text-xs mt-2 text-gray-300 line-clamp-3">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 