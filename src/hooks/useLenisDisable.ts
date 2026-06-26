import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

/**
 * Stops Lenis smooth scroll while mounted, and restarts it on unmount.
 * Useful for fullscreen views like video players.
 */
export function useLenisDisable(): void {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) {
      return
    }

    lenis.stop()

    return () => {
      lenis.start()
    }
  }, [lenis])
}
