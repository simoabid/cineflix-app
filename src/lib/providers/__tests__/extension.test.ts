import { describe, expect, it } from 'vitest';

import {
  buildExtensionFetchPayload,
  buildPrepareStreamPayload,
  serializeExtensionBody,
} from '../extension';
import type { Stream } from '../engine';

describe('provider extension bridge', () => {
  it('resolves baseUrl and query before sending fetches to the extension', () => {
    const payload = buildExtensionFetchPayload('/player/index.php', {
      baseUrl: 'https://example.test/watch',
      method: 'GET',
      headers: { Referer: 'https://example.test/watch' },
      query: {
        id: 'abc 123',
        server: 'alpha',
      },
      readHeaders: ['Set-Cookie'],
    });

    expect(payload).toMatchObject({
      url: 'https://example.test/watch/player/index.php?id=abc+123&server=alpha',
      method: 'GET',
      headers: { Referer: 'https://example.test/watch' },
      readHeaders: ['Set-Cookie'],
    });
    expect(payload).not.toHaveProperty('baseUrl');
    expect(payload).not.toHaveProperty('query');
  });

  it('preserves duplicate URLSearchParams body entries', () => {
    const body = new URLSearchParams();
    body.append('server', 'a');
    body.append('server', 'b');

    expect(serializeExtensionBody(body)).toEqual([
      ['server', 'a'],
      ['server', 'b'],
    ]);
  });

  it('builds stream preparation payloads for HLS and file streams', () => {
    const hlsStream: Stream = {
      id: 'hls-test',
      type: 'hls',
      playlist: 'https://cdn.example.test/master.m3u8',
      flags: [],
      captions: [],
      preferredHeaders: { Referer: 'https://embed.example.test' },
      headers: { Origin: 'https://embed.example.test' },
    };

    expect(buildPrepareStreamPayload(hlsStream)).toEqual({
      targetDomains: ['cdn.example.test'],
      requestHeaders: {
        Referer: 'https://embed.example.test',
        Origin: 'https://embed.example.test',
      },
      responseHeaders: {},
    });

    const fileStream: Stream = {
      id: 'file-test',
      type: 'file',
      flags: [],
      captions: [],
      qualities: {
        '720': { type: 'mp4', url: 'https://video-a.example.test/movie.mp4' },
        '1080': { type: 'mp4', url: 'https://video-b.example.test/movie.mp4' },
      },
    };

    expect(buildPrepareStreamPayload(fileStream).targetDomains).toEqual([
      'video-a.example.test',
      'video-b.example.test',
    ]);
  });
});
