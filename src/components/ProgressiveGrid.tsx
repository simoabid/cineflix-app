import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  DEFAULT_GRID_BATCH,
  DEFAULT_GRID_INITIAL,
  hasMoreProgressive,
  nextProgressiveCount,
  progressiveSlice,
} from '../utils/progressiveRender';

type ProgressiveGridProps<T> = {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => React.ReactNode;
  readonly getKey: (item: T, index: number) => string | number;
  readonly className?: string;
  readonly initialCount?: number;
  readonly batchSize?: number;
  /** Accessible label for the load-more sentinel */
  readonly loadMoreLabel?: string;
};

/**
 * Renders a grid/list in batches. Mounts a bottom sentinel that expands
 * the window when near the viewport — avoids hydrating hundreds of cards.
 */
function ProgressiveGridInner<T>({
  items,
  renderItem,
  getKey,
  className = '',
  initialCount = DEFAULT_GRID_INITIAL,
  batchSize = DEFAULT_GRID_BATCH,
  loadMoreLabel = 'Load more results',
}: ProgressiveGridProps<T>): React.ReactElement {
  const [count, setCount] = useState(() =>
    Math.min(initialCount, items.length)
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset window when the item set identity/length changes substantially
  useEffect(() => {
    setCount(Math.min(initialCount, items.length));
  }, [items, initialCount]);

  const expand = useCallback(() => {
    setCount((prev) => nextProgressiveCount(prev, items.length, batchSize));
  }, [items.length, batchSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreProgressive(count, items.length)) return;

    if (typeof IntersectionObserver === 'undefined') {
      expand();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          expand();
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [count, items.length, expand]);

  const visible = progressiveSlice(items, count);

  return (
    <>
      <div className={className}>
        {visible.map((item, index) => (
          <React.Fragment key={getKey(item, index)}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
      {hasMoreProgressive(count, items.length) && (
        <div
          ref={sentinelRef}
          className="h-8 w-full"
          aria-label={loadMoreLabel}
          data-progressive-sentinel="true"
          data-revealed={count}
          data-total={items.length}
        />
      )}
    </>
  );
}

const ProgressiveGrid = ProgressiveGridInner as <T>(
  props: ProgressiveGridProps<T>
) => React.ReactElement;

export default ProgressiveGrid;
