import {
  type Fetcher,
  makeSimpleProxyFetcher,
  setM3U8ProxyUrl,
} from '@/lib/providers';
import { makeExtensionFetcher as makeCineflixExtensionFetcher } from '@/lib/providers/extension';
import { getM3U8ProxyUrls, getProxyUrls } from '@/utils/proxyUrls';

function makeLoadbalancedList(getter: () => string[]) {
  let listIndex = -1;
  return () => {
    const values = getter();
    if (values.length === 0) return '';
    if (listIndex === -1 || listIndex >= values.length) {
      listIndex = Math.floor(Math.random() * values.length);
    }
    const value = values[listIndex];
    listIndex = (listIndex + 1) % values.length;
    return value;
  };
}

export const getLoadbalancedProxyUrl = makeLoadbalancedList(getProxyUrls);
export const getLoadbalancedM3U8ProxyUrl = makeLoadbalancedList(getM3U8ProxyUrls);

export function setupM3U8Proxy() {
  const proxyUrl = getLoadbalancedM3U8ProxyUrl();
  if (proxyUrl) setM3U8ProxyUrl(proxyUrl);
}

export function makeLoadBalancedSimpleProxyFetcher(): Fetcher {
  return async (url, ops) => {
    const proxyUrl = getLoadbalancedProxyUrl();
    if (!proxyUrl) throw new Error('No CORS proxy configured');
    const fetcher = makeSimpleProxyFetcher(proxyUrl, fetch);
    return fetcher(url, ops);
  };
}

export function makeExtensionFetcher(): Fetcher {
  return makeCineflixExtensionFetcher();
}
