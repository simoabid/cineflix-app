import type { ProgressMediaItem } from '@/stores/progress';

export interface ProgressModificationOptions {
  action?: 'delete' | 'reset';
}

export interface ProgressModificationResult {
  modifiedIds: string[];
  hasChanges: boolean;
}

export function modifyProgressItems(
  items: Record<string, ProgressMediaItem>,
  progressIds: string[],
  options: ProgressModificationOptions,
): {
  modifiedProgressItems: Record<string, ProgressMediaItem>;
  result: ProgressModificationResult;
} {
  if (options.action !== 'delete' && options.action !== 'reset') {
    return {
      modifiedProgressItems: items,
      result: { modifiedIds: [], hasChanges: false },
    };
  }

  const modified = { ...items };
  const modifiedIds: string[] = [];
  progressIds.forEach((id) => {
    if (!modified[id]) return;
    modifiedIds.push(id);
    if (options.action === 'delete') {
      delete modified[id];
    } else {
      modified[id] = {
        ...modified[id],
        progress: undefined,
        episodes: {},
      };
    }
  });

  return {
    modifiedProgressItems: modified,
    result: {
      modifiedIds,
      hasChanges: modifiedIds.length > 0,
    },
  };
}
