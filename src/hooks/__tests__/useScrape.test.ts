import { describe, expect, it } from 'vitest';

import {
  buildScrapeOrder,
  filterEmbedOrder,
  getScrapeMediaKey,
} from '../useScrape';
import type { ScrapeMedia } from '@/lib/providers';

const movieMedia: ScrapeMedia = {
  type: 'movie',
  title: 'Example Movie',
  releaseYear: 2024,
  tmdbId: '100',
};

const showMedia: ScrapeMedia = {
  type: 'show',
  title: 'Example Show',
  releaseYear: 2024,
  tmdbId: '200',
  season: {
    number: 1,
    tmdbId: 'season-1',
    title: 'Season 1',
  },
  episode: {
    number: 2,
    tmdbId: 'episode-2',
  },
};

describe('useScrape ordering helpers', () => {
  it('uses stable media keys for movies and show episodes', () => {
    expect(getScrapeMediaKey(movieMedia)).toBe('movie-100');
    expect(getScrapeMediaKey(showMedia)).toBe('show-200-season-1-episode-2');
  });

  it('filters failed sources and can resume after a source id', () => {
    const order = buildScrapeOrder({
      mediaKey: 'movie-100',
      availableSourceIds: ['a', 'b', 'c', 'd'],
      failedSourcesPerMedia: {
        'movie-100': ['b'],
      },
      preferredSourceOrder: ['d', 'a'],
      startFromSourceId: 'a',
    });

    expect(order).toEqual(['c']);
  });

  it('filters failed embeds from a preferred embed order', () => {
    const order = filterEmbedOrder({
      mediaKey: 'movie-100',
      preferredEmbedOrder: ['upcloud', 'vidcloud', 'mixdrop'],
      failedEmbedsPerMedia: {
        'movie-100': {
          dopebox: ['vidcloud'],
          zoechip: ['mixdrop'],
        },
      },
    });

    expect(order).toEqual(['upcloud']);
  });
});
