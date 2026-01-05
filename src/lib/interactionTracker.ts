// Global interaction tracker for hover intent detection
// Safe to import from many places - only initializes once

type InteractionState = { 
  lastPointerMove: number; 
  lastWheel: number; 
};

const state: InteractionState = { 
  lastPointerMove: Date.now(), 
  lastWheel: 0 
};

let initialized = false;

export function initInteractionTracker(): void {
  if (initialized) return;
  initialized = true;
  
  // Track pointer movement globally
  document.addEventListener('pointermove', () => {
    state.lastPointerMove = Date.now();
  }, { passive: true });

  // Track wheel events globally (includes trackpad scrolling)
  document.addEventListener('wheel', () => {
    state.lastWheel = Date.now();
  }, { passive: true });
}

export function getInteractionState(): InteractionState {
  initInteractionTracker();
  return state;
} 