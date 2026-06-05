import {
  makeProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  setM3U8ProxyUrl,
  setStreamProxyUrl,
  targets,
  type ProviderControls,
} from './engine';
import {
  hasExtension,
  isDesktopApp,
  makeExtensionFetcher,
} from './extension';

function configureM3U8Proxy(): void {
  const proxyUrl = import.meta.env.VITE_M3U8_PROXY_URL;
  if (proxyUrl) setM3U8ProxyUrl(proxyUrl);
}

function getDefaultProxyUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URL('/api/proxy', window.location.origin).toString();
}

/**
 * Factory function that creates the provider controls instance
 * configured for the current environment (browser, extension, or native).
 *
 * Uses the correct target and fetcher combination based on detected capabilities.
 */
export function getProviders(): ProviderControls {
  const proxyUrl = import.meta.env.VITE_CORS_PROXY_URL ?? getDefaultProxyUrl();
  configureM3U8Proxy();
  if (typeof window !== 'undefined') {
    setStreamProxyUrl(new URL('/api/media-proxy', window.location.origin).toString());
  }

  // Desktop app → native target (no CORS restrictions, MKV support)
  if (isDesktopApp()) {
    if (import.meta.env.DEV) console.log('[CINEFLIX Providers] Mode: NATIVE (desktop app)');
    return makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeStandardFetcher(fetch),
      target: targets.NATIVE,
      consistentIpForRequests: true,
    });
  }

  // Extension active → browser-extension target (all sources available)
  if (hasExtension()) {
    if (import.meta.env.DEV) console.log('[CINEFLIX Providers] Mode: BROWSER_EXTENSION (extension detected ✅)');
    return makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeExtensionFetcher(),
      target: targets.BROWSER_EXTENSION,
      consistentIpForRequests: true,
    });
  }

  // Browser only → CORS-limited mode with optional proxy fallback
  if (proxyUrl) {
    if (import.meta.env.DEV) console.log('[CINEFLIX Providers] Mode: BROWSER with proxy-backed streams');
    return makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeSimpleProxyFetcher(proxyUrl, fetch),
      target: targets.BROWSER,
      consistentIpForRequests: true,
      proxyStreams: true,
    });
  }

  // Browser only, no proxy → most limited mode (CORS-allowed sources only)
  if (import.meta.env.DEV) console.log('[CINEFLIX Providers] Mode: BROWSER (no extension, no proxy — CORS-limited ⚠️)');
  return makeProviders({
    fetcher: makeStandardFetcher(fetch),
    target: targets.BROWSER,
  });
}
