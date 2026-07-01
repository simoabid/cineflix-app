import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the PWA service worker and handles auto-updates.
 * Displays a reload prompt when a new version is available.
 */
export function useServiceWorker(): void {
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        // New content is available — auto-reload for seamless updates
        if (confirm('CINEFLIX has been updated. Reload to get the latest version?')) {
          updateSW(true)
        }
      },
      onOfflineReady() {
        console.log('[CINEFLIX PWA] Ready for offline use')
      },
      onRegisteredSW(swUrl, registration) {
        console.log('[CINEFLIX PWA] Service Worker registered:', swUrl)
        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        }
      }
    })
  }, [])
}
