import { FeatureMap, flagsAllowedInFeatures } from '../entrypoint/utils/targets';
import { Embed, Sourcerer } from './base';

export interface ProviderList {
  sources: Sourcerer[];
  embeds: Embed[];
}

function findDuplicates<T>(items: T[], keyFn: (item: T) => string | number): { key: string | number; items: T[] }[] {
  const groups = new Map<string | number, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return Array.from(groups.entries())
    .filter(([_, groupItems]) => groupItems.length > 1)
    .map(([key, groupItems]) => ({ key, items: groupItems }));
}

function formatDuplicateError(
  type: string,
  duplicates: { key: string | number; items: any[] }[],
  keyName: string,
): string {
  const duplicateList = duplicates
    .map(({ key, items }) => {
      const itemNames = items.map((item) => item.name || item.id).join(', ');
      return `  ${keyName} ${key}: ${itemNames}`;
    })
    .join('\n');

  return `${type} have duplicate ${keyName}s:\n${duplicateList}`;
}

export function getProviders(features: FeatureMap, list: ProviderList): ProviderList {
  const sources = list.sources.filter((v) => !v?.disabled);
  const embeds = list.embeds.filter((v) => !v?.disabled);
  const combined = [...sources, ...embeds];
  const duplicateIds = findDuplicates(combined, (v) => v.id);
  if (duplicateIds.length > 0) {
    throw new Error(formatDuplicateError('Sources/embeds', duplicateIds, 'ID'));
  }
  return {
    sources: sources.filter((s) => flagsAllowedInFeatures(features, s.flags)),
    embeds: embeds.filter((e) => flagsAllowedInFeatures(features, e.flags)),
  };
}
