import type { Stream } from './engine';
import { makeFullUrl } from './engine/fetchers/common';
import type {
  DefaultedFetcherOptions,
  Fetcher,
  FetcherResponse,
} from './engine/fetchers/types';

const EXTENSION_REQUEST_TIMEOUT_MS = 30_000;
const PREPARE_STREAM_RULE_ID = 10_000;

let requestCounter = 0;

export type ExtensionBodyType =
  | 'string'
  | 'object'
  | 'URLSearchParams'
  | 'FormData';

export interface ExtensionFetchPayload {
  url: string;
  method: DefaultedFetcherOptions['method'];
  headers: Record<string, string>;
  readHeaders: string[];
  body?: unknown;
  bodyType?: ExtensionBodyType;
  credentials?: DefaultedFetcherOptions['credentials'];
}

export interface ExtensionPrepareStreamPayload {
  targetDomains: string[];
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

interface ExtensionBaseResponse {
  success: boolean;
  error?: string;
}

interface ExtensionMakeRequestResponse extends ExtensionBaseResponse {
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    finalUrl: string;
    body: unknown;
  };
}

function isBrowserFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export function getExtensionBodyType(body: unknown): ExtensionBodyType | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return 'string';
  if (body instanceof URLSearchParams) return 'URLSearchParams';
  if (isBrowserFormData(body)) return 'FormData';
  return 'object';
}

export function serializeExtensionBody(body: unknown): unknown {
  if (body === undefined || body === null) return undefined;
  if (body instanceof URLSearchParams) return Array.from(body.entries());
  if (isBrowserFormData(body)) return Array.from(body.entries());
  return body;
}

export function buildExtensionFetchPayload(
  url: string,
  ops: DefaultedFetcherOptions,
): ExtensionFetchPayload {
  return {
    url: makeFullUrl(url, ops),
    method: ops.method,
    headers: ops.headers,
    readHeaders: ops.readHeaders,
    body: serializeExtensionBody(ops.body),
    bodyType: getExtensionBodyType(ops.body),
    credentials: ops.credentials,
  };
}

function makeFilteredHeaders(
  headers: Record<string, string>,
  readHeaders: string[],
): Headers {
  if (readHeaders.length === 0) return new Headers(headers);

  const lowercasedReadHeaders = readHeaders.map((h) => h.toLowerCase());
  return new Headers(
    Object.entries(headers).filter(([key]) =>
      lowercasedReadHeaders.includes(key.toLowerCase()),
    ),
  );
}

function sendExtensionMessage<Response>(
  type: string,
  payload: unknown,
  timeoutMs = EXTENSION_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('CINEFLIX extension bridge is not available outside the browser'));
  }

  requestCounter += 1;
  const requestId = `cineflix-req-${requestCounter}-${Date.now()}`;

  return new Promise<Response>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`Extension request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function handler(event: MessageEvent) {
      // C-3: Validate origin to prevent spoofing from cross-origin frames
      if (event.origin !== window.location.origin) return;
      if (event.source !== window) return;
      const data = event.data as Record<string, unknown>;
      if (!data || data.direction !== 'extension-to-cineflix') return;
      if (data.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener('message', handler);
      // M-2: Resolve with the raw response data, not an unsafe cast
      resolve(data.response as Response);
    }

    window.addEventListener('message', handler);
    // C-2: Restrict postMessage to same origin instead of '*'
    window.postMessage(
      {
        direction: 'cineflix-to-extension',
        requestId,
        type,
        payload,
      },
      window.location.origin,
    );
  });
}

export function hasExtension(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.__CINEFLIX_EXTENSION_ACTIVE__)
  );
}

export function isDesktopApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.__CINEFLIX_DESKTOP_APP__)
  );
}

export function makeExtensionFetcher(): Fetcher {
  return async (url, ops) => {
    const payload = buildExtensionFetchPayload(url, ops);
    const result = await sendExtensionMessage<ExtensionMakeRequestResponse>(
      'MAKE_REQUEST',
      payload,
    );

    if (!result?.success || !result.response) {
      throw new Error(`Extension fetch error: ${result?.error ?? 'Unknown error'}`);
    }

    const { body, finalUrl, statusCode, headers } = result.response;
    // M-2: Validate response shape at runtime before constructing FetcherResponse
    if (typeof statusCode !== 'number' || typeof finalUrl !== 'string') {
      throw new Error('Extension returned a malformed response: missing statusCode or finalUrl');
    }
    return {
      body,
      finalUrl,
      statusCode,
      headers: makeFilteredHeaders(headers as Record<string, string>, ops.readHeaders),
    };
  };
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function uniqueDomains(domains: Array<string | null>): string[] {
  return Array.from(new Set(domains.filter((domain): domain is string => !!domain)));
}

export function buildPrepareStreamPayload(
  stream: Stream,
): ExtensionPrepareStreamPayload {
  const targetDomains =
    stream.type === 'hls'
      ? uniqueDomains([extractDomain(stream.playlist)])
      : uniqueDomains(
          Object.values(stream.qualities).map((quality) =>
            extractDomain(quality.url),
          ),
        );

  return {
    targetDomains,
    requestHeaders: {
      ...(stream.preferredHeaders ?? {}),
      ...(stream.headers ?? {}),
    },
    responseHeaders: {},
  };
}

export async function prepareStreamWithExtension(stream: Stream): Promise<void> {
  if (!hasExtension()) return;

  const payload = buildPrepareStreamPayload(stream);
  if (payload.targetDomains.length === 0) return;

  const result = await sendExtensionMessage<ExtensionBaseResponse>(
    'PREPARE_STREAM',
    {
      ruleId: PREPARE_STREAM_RULE_ID,
      ...payload,
    },
  );

  if (!result?.success) {
    throw new Error(`Extension stream preparation failed: ${result?.error ?? 'Unknown error'}`);
  }
}
