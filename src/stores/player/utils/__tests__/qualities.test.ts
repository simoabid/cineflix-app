import { describe, expect, it } from 'vitest';

import { selectQuality, type SourceSliceSource } from '../qualities';

describe('selectQuality', () => {
  it('carries stream-level headers onto selected file qualities', () => {
    const source: SourceSliceSource = {
      type: 'file',
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
      qualities: {
        '720': {
          type: 'mp4',
          url: 'https://cdn.example.test/movie.mp4',
        },
      },
    };

    expect(
      selectQuality(source, {
        automaticQuality: true,
        lastChosenQuality: null,
      }).stream,
    ).toEqual({
      type: 'mp4',
      url: 'https://cdn.example.test/movie.mp4',
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
    });
  });
});
