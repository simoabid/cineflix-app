import React, { useEffect, useRef, useState } from 'react';

export type LazySectionProps = {
  /** Section content — only mounted after the sentinel enters the viewport */
  readonly children: React.ReactNode;
  /** Estimated height reserved while unloaded (prevents layout jump) */
  readonly minHeight?: number | string;
  /** How far before the viewport to start mounting (px). Default 200 */
  readonly rootMargin?: string;
  /** Optional className on the outer wrapper */
  readonly className?: string;
  /** Called once when the section first becomes active (for deferred data fetch) */
  readonly onActivate?: () => void;
  /** If true, always keep children mounted after first activation */
  readonly keepMounted?: boolean;
  /** Optional placeholder shown before activation */
  readonly placeholder?: React.ReactNode;
  /** Accessible label for the region */
  readonly 'aria-label'?: string;
};

/**
 * Defers mounting heavy DOM (carousels, image grids) until the section
 * is near the viewport. Uses IntersectionObserver with a stable min-height
 * placeholder so scroll position does not jump.
 */
const LazySection: React.FC<LazySectionProps> = ({
  children,
  minHeight = 320,
  rootMargin = '200px 0px',
  className = '',
  onActivate,
  keepMounted = true,
  placeholder,
  'aria-label': ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const activatedRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || activatedRef.current) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsActive(true);
      activatedRef.current = true;
      onActivate?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          if (!keepMounted && activatedRef.current) {
            setIsActive(false);
          }
          return;
        }

        if (!activatedRef.current) {
          activatedRef.current = true;
          setIsActive(true);
          onActivate?.();
          if (keepMounted) {
            observer.disconnect();
          }
        } else if (!keepMounted) {
          setIsActive(true);
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, onActivate, keepMounted]);

  const heightStyle =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      ref={containerRef}
      className={`content-lazy-contain ${className}`.trim()}
      style={!isActive ? { minHeight: heightStyle } : undefined}
      aria-label={ariaLabel}
      data-lazy-active={isActive ? 'true' : 'false'}
    >
      {isActive
        ? children
        : (placeholder ?? (
            <div
              className="w-full animate-pulse rounded-xl bg-white/[0.03]"
              style={{ minHeight: heightStyle }}
              aria-hidden="true"
            />
          ))}
    </div>
  );
};

export default LazySection;
