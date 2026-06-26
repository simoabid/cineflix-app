import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

/**
 * Stops Lenis smooth scroll when isOpen is true, resumes when false.
 * Useful for modal overlays.
 * @param isOpen - Whether the modal or overlay is open
 */
export function useLenisToggle(isOpen: boolean): void {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) {
      return
    }

    if (isOpen) {
      lenis.stop()
    } else {
      lenis.start()
    }
  }, [isOpen, lenis])
}
