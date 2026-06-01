type FetchOptions = RequestInit & {
  baseURL?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  query?: Record<string, string | number | boolean | null | undefined>;
  responseType?: 'json' | 'text' | 'arrayBuffer';
};

export function makeUrl(url: string, data: Record<string, string>) {
  let parsedUrl = url;
  Object.entries(data).forEach(([key, value]) => {
    parsedUrl = parsedUrl.replace(`{${key}}`, encodeURIComponent(value));
  });
  return parsedUrl;
}

function resolveUrl(url: string, ops: FetchOptions = {}) {
  const baseURL = ops.baseURL ?? '';
  const combinedUrl = baseURL ? new URL(url, baseURL).toString() : url;
  const parsedUrl = new URL(combinedUrl, window.location.origin);

  Object.entries({ ...(ops.params ?? {}), ...(ops.query ?? {}) }).forEach(
    ([key, value]) => {
      if (value !== null && value !== undefined) {
        parsedUrl.searchParams.set(key, String(value));
      }
    },
  );

  return parsedUrl.toString();
}

export async function mwFetch<T = any>(
  url: string,
  ops: FetchOptions = {},
): Promise<T> {
  const response = await fetch(resolveUrl(url, ops), ops);
  if (!response.ok) {
    throw Object.assign(new Error(`Request failed with ${response.status}`), {
      status: response.status,
    });
  }
  if (ops.responseType === 'text') return response.text() as Promise<T>;
  if (ops.responseType === 'arrayBuffer') {
    return response.arrayBuffer() as Promise<T>;
  }
  return response.json() as Promise<T>;
}

export async function singularProxiedFetch<T = any>(
  proxyUrl: string,
  url: string,
  ops: FetchOptions = {},
): Promise<T> {
  const baseURL = ops.baseURL ?? '';
  const combinedUrl = baseURL ? new URL(url, baseURL).toString() : url;
  const destination = new URL(combinedUrl, window.location.origin);

  Object.entries({ ...(ops.params ?? {}), ...(ops.query ?? {}) }).forEach(
    ([key, value]) => {
      if (value !== null && value !== undefined) {
        destination.searchParams.set(key, String(value));
      }
    },
  );

  return mwFetch<T>(proxyUrl, {
    ...ops,
    baseURL: undefined,
    params: {
      destination: destination.toString(),
    },
    query: undefined,
  });
}

export async function proxiedFetch<T = any>(
  url: string,
  ops: FetchOptions = {},
): Promise<T> {
  const proxyUrl =
    typeof window === 'undefined'
      ? '/api/proxy'
      : new URL('/api/proxy', window.location.origin).toString();
  return singularProxiedFetch<T>(proxyUrl, url, ops);
}
