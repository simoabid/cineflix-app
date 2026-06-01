# Hover Intent System

A robust hover-popup behavior implementation that prevents unwanted popups during trackpad/mouse wheel scrolling while maintaining proper hover and keyboard accessibility.

## Overview

The hover intent system consists of two main components:

1. **Global Interaction Tracker** (`src/lib/interactionTracker.ts`) - Monitors pointer movement and wheel events globally
2. **Hover Intent Hook** (`src/hooks/useHoverIntent.ts`) - Provides smart hover detection logic

## Key Features

- **Scroll-Aware**: Prevents popups when scrolling with trackpad or mouse wheel
- **Intent Detection**: Only shows popups for deliberate hover actions
- **Keyboard Accessible**: Immediately shows popups on keyboard focus
- **Performance Optimized**: Single global event listeners, no duplicate handlers
- **Configurable**: Tunable timing constants for different use cases

## Implementation

### Basic Usage

```tsx
import { useHoverIntent } from '../hooks/useHoverIntent';

function MyCard({ title, image }) {
  const { visible, onPointerEnter, onPointerLeave, onFocus, onBlur } = useHoverIntent();

  return (
    <div
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={0}
    >
      <img src={image} alt={title} />
      {visible && (
        <div className="popup">
          {/* Your popup content */}
        </div>
      )}
    </div>
  );
}
```

### Custom Configuration

```tsx
const { visible, onPointerEnter, onPointerLeave, onFocus, onBlur } = useHoverIntent({
  hoverDelay: 200,           // ms to wait before showing popup
  pointerMoveThreshold: 100, // ms window for "recent" pointer movement
  wheelThreshold: 300        // ms window for "recent" wheel events
});
```

## Tuning Constants

### `hoverDelay` (default: 180ms)
- Time to wait before showing popup after hover
- **Lower values**: Faster popup appearance, more responsive feel
- **Higher values**: Reduces flicker during micro-movements, calmer UX
- **Recommended range**: 100-300ms

### `pointerMoveThreshold` (default: 120ms)
- Time window to consider pointer movement as "recent"
- **Lower values**: Stricter intent detection, may miss some valid hovers
- **Higher values**: More lenient, may show popups during slow scrolls
- **Recommended range**: 80-200ms

### `wheelThreshold` (default: 250ms)
- Time window to consider wheel events as "recent"
- **Lower values**: Faster recovery after scrolling stops
- **Higher values**: Longer protection against scroll-induced hovers
- **Recommended range**: 200-400ms

## How It Works

### Scroll Detection Logic

1. **On Pointer Enter**: Check if recent wheel event occurred without recent pointer movement
2. **If scroll-induced**: Abort hover, don't schedule popup
3. **If intentional**: Schedule popup after `hoverDelay`
4. **At timer expiry**: Re-check conditions and abort if still scroll-induced

### Global Event Handling

- **Wheel events**: Immediately cancel pending popups and hide visible ones
- **Pointer movement**: Tracked globally for efficient intent detection
- **Single listeners**: No duplicate event handlers across multiple components

## Testing Instructions

### Manual Testing

#### Trackpad Scroll Test
1. Open page and place cursor in center
2. Perform two-finger scroll with trackpad
3. **Expected**: No popups should appear as content scrolls under cursor

#### Intentional Hover Test
1. Physically move mouse pointer to a card
2. **Expected**: Popup appears after ~180ms delay

#### Scroll-then-Hover Test
1. Scroll content with trackpad/wheel
2. Immediately try to hover without moving pointer
3. **Expected**: No popup until pointer is moved

#### Keyboard Accessibility Test
1. Use Tab key to navigate to a card
2. **Expected**: Popup appears immediately on focus

### Cross-Platform Testing

Test on different devices and input methods:
- **macOS**: Trackpad scrolling, Magic Mouse
- **Windows**: Precision touchpad, mouse wheel
- **Linux**: Touchpad and mouse wheel combinations

### Performance Testing

- Monitor for memory leaks during rapid hover/scroll combinations
- Verify single global listeners (check in DevTools)
- Test with many cards on page (100+ elements)

## Acceptance Criteria

✅ **Trackpad Scroll**: No popups during two-finger trackpad scrolling
✅ **Mouse Hover**: Popup appears after delay when physically moving mouse
✅ **Scroll Recovery**: No immediate popup after scrolling until pointer moves
✅ **Keyboard Focus**: Popup appears on keyboard navigation (Tab/focus)
✅ **Performance**: Single global event listeners, no memory leaks
✅ **Accessibility**: Proper ARIA support and keyboard navigation

## Troubleshooting

### Popups Still Appear During Scrolling
- Increase `wheelThreshold` (try 300-400ms)
- Decrease `pointerMoveThreshold` (try 80-100ms)

### Popups Too Slow to Appear
- Decrease `hoverDelay` (try 100-150ms)
- Check for console errors in interaction tracker

### Poor Keyboard Experience
- Verify `tabIndex={0}` is set on hoverable elements
- Ensure `onFocus` and `onBlur` handlers are attached

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support  
- **Safari**: Full support (iOS trackpad gestures included)
- **Touch Devices**: Automatically disabled via `shouldShowHover` logic

## Implementation Notes

- Use `onPointerEnter/Leave` instead of `onMouseEnter/Leave` for broader device support
- Global tracker auto-initializes on first use, safe to import anywhere
- Hook cleans up timers and listeners automatically on unmount
- Wheel events are marked `passive: true` for performance 