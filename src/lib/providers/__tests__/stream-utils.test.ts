import { describe, expect, it } from 'vitest';

import { convertCaptions, convertStreamToSource } from '../stream-utils';
import type { Stream } from '../engine';

describe('provider stream conversion', () => {
  it('preserves headers when converting HLS streams', () => {
    const stream: Stream = {
      id: 'hls',
      type: 'hls',
      playlist: 'https://cdn.example.test/master.m3u8',
      flags: [],
      captions: [],
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
    };

    expect(convertStreamToSource({ stream })).toEqual({
      type: 'hls',
      url: 'https://cdn.example.test/master.m3u8',
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
    });
  });

  it('preserves headers when converting file streams', () => {
    const stream: Stream = {
      id: 'file',
      type: 'file',
      flags: [],
      captions: [],
      qualities: {
        '720': {
          type: 'mp4',
          url: 'https://cdn.example.test/movie.mp4',
        },
      },
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
    };

    expect(convertStreamToSource({ stream })).toMatchObject({
      type: 'file',
      headers: { Origin: 'https://embed.example.test' },
      preferredHeaders: { Referer: 'https://embed.example.test' },
    });
  });

  it('normalizes caption language labels and preserves subtitle metadata', () => {
    const captions = convertCaptions([
      {
        id: 'caption-1',
        url: 'https://captions.example/en.vtt',
        type: 'vtt',
        language: 'English',
        hasCorsRestrictions: true,
        opensubtitles: true,
        display: 'English SDH',
        source: 'wyzie opensubs',
        encoding: 'utf-8',
        flagUrl: 'https://flags.example/en.svg',
        isHearingImpaired: true,
      },
    ]);

    expect(captions[0]).toMatchObject({
      id: 'caption-1',
      language: 'en',
      needsProxy: true,
      opensubtitles: true,
      display: 'English SDH',
      source: 'wyzie opensubs',
      encoding: 'utf-8',
      flagUrl: 'https://flags.example/en.svg',
      isHearingImpaired: true,
    });
  });
});
