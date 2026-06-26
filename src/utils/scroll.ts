import type Lenis from 'lenis'

/** Reference to the active Lenis instance, set by LenisProvider */
let lenisInstance: Lenis | null = null

export function setLenisInstance(instance: Lenis | null): void {
  lenisInstance = instance
}

export function getLenisInstance(): Lenis | null {
  return lenisInstance
}

/**
 * Scrolls an element into view with configurable options
 * @param selector - CSS selector string, Element, or null
 * @param options - Scroll options
 * @returns void (always returns, even if element not found)
 */
export function scrollToElement(
  selector: string | Element | null,
  options?: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number; // Additional offset in pixels (positive = scroll down more)
    delay?: number; // Delay in milliseconds before scrolling (useful when element needs to render)
    immediate?: boolean;
  },
): void {
  if (selector === null) {
    return;
  }

  const {
    behavior = "smooth",
    block = "start",
    inline = "nearest",
    offset = 0,
    delay = 0,
    immediate = false,
  } = options || {};

  const executeScroll = (): void => {
    let element: Element | null = null;

    if (typeof selector === "string") {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (!element) {
      return;
    }

    // Prefer Lenis if available
    if (lenisInstance) {
      lenisInstance.scrollTo(element as HTMLElement, {
        offset,
        immediate,
        duration: immediate ? 0 : 1.2,
      });
      return;
    }

    if (offset === 0) {
      // Use native scrollIntoView when no offset is needed
      element.scrollIntoView({ behavior: immediate ? 'auto' : behavior, block, inline });
      return;
    }

    // Custom scroll with offset
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const offsetPosition = absoluteElementTop - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: immediate ? 'auto' : behavior,
    });
  };

  if (delay > 0) {
    setTimeout(executeScroll, delay);
    return;
  }

  executeScroll();
}

/**
 * Scrolls to an element by hash (useful for hash navigation)
 * @param hash - Hash string (with or without #)
 * @param options - Scroll options
 * @returns void (always returns, even if element not found)
 */
export function scrollToHash(
  hash: string,
  options?: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number;
    delay?: number;
    immediate?: boolean;
  },
): void {
  const normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
  scrollToElement(normalizedHash, options);
}
