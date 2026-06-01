import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxiedFetch } from '../fetch';

describe('frontend proxy fetch helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes proxied fetches through the local backend proxy', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('WEBVTT\n\n'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000' },
    });

    await proxiedFetch<string>('https://captions.example/subtitles/en.vtt', {
      responseType: 'text',
      headers: {
        'Accept-Charset': 'utf-8',
      },
    });

    const requestedUrl = fetchMock.mock.calls[0][0];
    expect(requestedUrl).toBe(
      'http://localhost:3000/api/proxy?destination=https%3A%2F%2Fcaptions.example%2Fsubtitles%2Fen.vtt',
    );
  });
});
