import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProviders } from '../factory';

describe('provider factory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses proxy-backed provider coverage in the browser fallback mode', () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000' },
      __CINEFLIX_EXTENSION_ACTIVE__: false,
      __CINEFLIX_DESKTOP_APP__: false,
    });

    const sourceIds = getProviders().listSources().map((source) => source.id);

    expect(sourceIds).toContain('vidlink');
    expect(sourceIds).toContain('ridomovies');
  });

  it('registers vetted archived P-Stream movie sources and embeds', () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000' },
      __CINEFLIX_EXTENSION_ACTIVE__: false,
      __CINEFLIX_DESKTOP_APP__: false,
    });

    const providers = getProviders();
    const sourceIds = providers.listSources().map((source) => source.id);
    const embedIds = providers.listEmbeds().map((embed) => embed.id);

    expect(sourceIds).toEqual(
      expect.arrayContaining(['tasf', 'vidjoy', 'remotestream']),
    );
    expect(embedIds).toEqual(expect.arrayContaining(['vidjoy-stream1']));
  });
});
