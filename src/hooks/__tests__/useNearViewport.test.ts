import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNearViewport } from '../useNearViewport';

describe('useNearViewport', () => {
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

  it('starts as not near and becomes near when intersecting', () => {
    const { result } = renderHook(() => useNearViewport());

    expect(result.current.isNear).toBe(false);

    const el = document.createElement('div');
    act(() => {
      result.current.ref(el);
    });

    expect(observe).toHaveBeenCalledWith(el);

    act(() => {
      observerCallback(
        [
          {
            isIntersecting: true,
            target: el,
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

    expect(result.current.isNear).toBe(true);
  });

  it('is immediately near when initialActive is true', () => {
    const { result } = renderHook(() =>
      useNearViewport({ initialActive: true })
    );
    expect(result.current.isNear).toBe(true);
  });
});
