import { describe, it, expect } from 'vitest';
import { loadPrimaryTVShows } from '../TVShows';

const page = (n: number) => ({
  results: Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Show ${i + 1}`,
    overview: '',
    poster_path: null,
    backdrop_path: null,
    vote_average: 8,
    first_air_date: '2023-01-01',
  })),
  page: 1,
  total_pages: 1,
  total_results: n,
});

describe('TVShows progressive load helpers', () => {
  it('loadPrimaryTVShows caps rows and returns genres without discover', async () => {
    const data = await loadPrimaryTVShows(
      async () => page(25),
      async () => page(25),
      async () => page(25),
      async () => page(25),
      async () => [
        { id: 18, name: 'Drama' },
        { id: 35, name: 'Comedy' },
      ],
      16
    );

    expect(data.trending).toHaveLength(16);
    expect(data.popular).toHaveLength(16);
    expect(data.topRated).toHaveLength(16);
    expect(data.onAir).toHaveLength(16);
    expect(data.genres.map((g) => g.name)).toEqual(['Drama', 'Comedy']);
  });
});
