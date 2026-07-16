import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import LazySection from '../LazySection';

describe('LazySection', () => {
  let observerCallback: IntersectionObserverCallback;
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observe = vi.fn();
    disconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
      takeRecords = () => [];
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows placeholder until intersecting', () => {
    render(
      <LazySection minHeight={300} aria-label="test-section">
        <div>Heavy content</div>
      </LazySection>
    );

    expect(screen.queryByText('Heavy content')).toBeNull();
    expect(
      screen.getByLabelText('test-section').getAttribute('data-lazy-active')
    ).toBe('false');
    expect(observe).toHaveBeenCalled();
  });

  it('mounts children and fires onActivate when intersecting', () => {
    const onActivate = vi.fn();

    render(
      <LazySection minHeight={300} onActivate={onActivate} aria-label="test-section">
        <div>Heavy content</div>
      </LazySection>
    );

    act(() => {
      observerCallback(
        [
          {
            isIntersecting: true,
            target: document.createElement('div'),
            intersectionRatio: 1,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: 0,
          },
        ],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByText('Heavy content')).toBeTruthy();
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText('test-section').getAttribute('data-lazy-active')
    ).toBe('true');
  });
});
