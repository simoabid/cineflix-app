import type { MetaOutput } from '@/lib/providers';

let metaDataCache: MetaOutput[] | null = null;
let token: string | null = null;

export function setCachedMetadata(data: MetaOutput[]) {
  metaDataCache = data;
}

export function getCachedMetadata(): MetaOutput[] {
  return metaDataCache ?? [];
}

export function setApiToken(newToken: string) {
  token = newToken;
}

export async function getApiToken(): Promise<string | null> {
  return token;
}
