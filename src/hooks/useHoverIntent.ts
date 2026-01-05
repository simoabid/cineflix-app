import { useRef, useState, useCallback } from 'react';
import { getInteractionState } from '../lib/interactionTracker';

export interface UseHoverIntentOptions {
  /** Delay in ms before showing popup after hover */
  hoverDelay?: number;
  /** Time window in ms to consider pointer movement as "recent" */
  pointerMoveThreshold?: number;
  /** Time window in ms to consider wheel event as "recent" */
  wheelThreshold?: number;
}

const DEFAULT_OPTIONS: Required<UseHoverIntentOptions> = {
  hoverDelay: 180,
  pointerMoveThreshold: 120,
  wheelThreshold: 250,
};

export function useHoverIntent(options?: UseHoverIntentOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { hoverDelay, pointerMoveThreshold, wheelThreshold } = opts;

  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Cancel pending show and hide immediately on global wheel events
  // Cancel pending show on global wheel events is handled by check in onPointerEnter
  // Removed redundant global listener that caused performance issues with many cards

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const onPointerEnter = useCallback(() => {
    const state = getInteractionState();
    const now = Date.now();
    const pointerMovedRecently = now - state.lastPointerMove < pointerMoveThreshold;
    const wheeledRecently = now - state.lastWheel < wheelThreshold;

    // If scroll just happened and pointer hasn't moved recently, 
    // assume this hover is scroll-induced - don't schedule show
    if (wheeledRecently && !pointerMovedRecently) {
      return;
    }

    // Schedule showing the popup after delay
    timerRef.current = window.setTimeout(() => {
      // Re-check conditions at timer expiry in case user scrolled during delay
      const currentState = getInteractionState();
      const currentTime = Date.now();
      const stillPointerMovedRecently = currentTime - currentState.lastPointerMove < pointerMoveThreshold;
      const stillWheeledRecently = currentTime - currentState.lastWheel < wheelThreshold;

      // Abort if conditions still indicate scroll-induced hover
      if (stillWheeledRecently && !stillPointerMovedRecently) {
        timerRef.current = null;
        return;
      }

      timerRef.current = null;
      setVisible(true);
    }, hoverDelay);
  }, [hoverDelay, pointerMoveThreshold, wheelThreshold]);

  const onPointerLeave = useCallback(() => {
    cancel();
  }, [cancel]);

  // Keyboard accessibility handlers - show immediately for focus
  const onFocus = useCallback(() => {
    // Cancel any pending timer and show immediately for accessibility
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(true);
  }, []);

  const onBlur = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    cancel,
  };
} 