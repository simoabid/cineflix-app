import { useEffect, useRef, useState, useCallback } from 'react';

type UseNearViewportOptions = {
  /** IntersectionObserver rootMargin. Default: 200px ahead of viewport */
  readonly rootMargin?: string;
  /** Fire only once when first intersecting (default true) */
  readonly once?: boolean;
  /** Start as already active (skip observation) */
  readonly initialActive?: boolean;
};

type UseNearViewportResult = {
  readonly isNear: boolean;
  readonly ref: (node: HTMLElement | null) => void;
};

/**
 * Tracks whether an element is near the viewport for deferred
 * mount / data-fetch patterns. Stable callback ref for flexible attachment.
 */
export function useNearViewport(
  options: UseNearViewportOptions = {}
): UseNearViewportResult {
  const {
    rootMargin = '200px 0px',
    once = true,
    initialActive = false,
  } = options;

  const [isNear, setIsNear] = useState(initialActive);
  const nodeRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onceRef = useRef(once);
  onceRef.current = once;

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      cleanup();
      nodeRef.current = node;

      if (!node || initialActive) {
        if (initialActive) setIsNear(true);
        return;
      }

      if (typeof IntersectionObserver === 'undefined') {
        setIsNear(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry) return;

          if (entry.isIntersecting) {
            setIsNear(true);
            if (onceRef.current) {
              observer.disconnect();
            }
          } else if (!onceRef.current) {
            setIsNear(false);
          }
        },
        { root: null, rootMargin, threshold: 0 }
      );

      observerRef.current = observer;
      observer.observe(node);
    },
    [cleanup, initialActive, rootMargin]
  );

  useEffect(() => cleanup, [cleanup]);

  return { isNear, ref };
}
