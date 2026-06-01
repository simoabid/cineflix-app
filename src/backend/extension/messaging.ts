export const RULE_IDS = {
  PREPARE_STREAM: 1,
  SET_DOMAINS_HLS: 2,
  SET_DOMAINS_HLS_AUDIO: 3,
} as const;

type ExtensionFetchPayload = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export async function sendExtensionRequest<T>(
  ops: ExtensionFetchPayload,
): Promise<{ success: true; response: { body: T; headers: Record<string, string>; status: number } } | null> {
  const response = await fetch(ops.url, {
    method: ops.method ?? 'GET',
    headers: ops.headers,
    body: ops.body as BodyInit | undefined,
  });
  const body = (await response.text()) as T;
  return {
    success: true,
    response: {
      body,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    },
  };
}

export async function setDomainRule(
  ..._args: unknown[]
): Promise<{ success: true } | null> {
  return { success: true };
}

export async function sendPage(): Promise<null> {
  return null;
}

export async function extensionInfo(): Promise<null> {
  return null;
}

export function isExtensionActiveCached(): boolean {
  return Boolean(window.chrome?.runtime?.id);
}

export async function isExtensionActive(): Promise<boolean> {
  return isExtensionActiveCached();
}
