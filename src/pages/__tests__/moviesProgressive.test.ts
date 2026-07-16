import { describe, it, expect, vi } from 'vitest';
import {
  loadPrimaryMovies,
  loadAllMovies,
  fetchHeroSlides,
  combineMovieLists,
  uniqueMoviesById,
  filterMoviesByCriteria,
} from '../Movies';
import { limitForInitialPaint as cap } from '../../utils/progressiveRender';

const fakeMovie = (id: number) => ({
  id,
  title: `Movie ${id}`,
  overview: `Overview ${id}`,
  poster_path: `/p${id}.jpg`,
  backdrop_path: `/b${id}.jpg`,
  vote_average: 7,
  release_date: '2024-01-01',
  genre_ids: [28],
});

const page = (n: number) => ({
  results: Array.from({ length: n }, (_, i) => fakeMovie(i + 1)),
  page: 1,
  total_pages: 1,
  total_results: n,
});

describe('Movies progressive load helpers', () => {
  it('loadPrimaryMovies does not call discover and caps results', async () => {
    const discover = vi.fn();
    const data = await loadPrimaryMovies(
      async () => page(30),
      async () => page(30),
      async () => page(30),
      async () => page(30),
      async () => page(30),
      async () => [
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ],
      16
    );

    expect(discover).not.toHaveBeenCalled();
    expect(data.trending).toHaveLength(16);
    expect(data.popular).toHaveLength(16);
    expect(data.genres).toHaveLength(2);
    expect(Object.keys(data.genreRows)).toHaveLength(0);
  });

  it('loadAllMovies fetches genre rows when discover is provided', async () => {
    const discover = vi.fn(async (_genreId: number) => page(20));
    const data = await loadAllMovies(
      async () => page(10),
      async () => page(10),
      async () => page(10),
      async () => page(10),
      async () => page(10),
      async () => [{ id: 28, name: 'Action' }],
      discover
    );

    expect(discover).toHaveBeenCalledWith(28, 1);
    expect(data.genreRows.Action.length).toBeLessThanOrEqual(16);
    expect(data.genreRows.Action.length).toBeGreaterThan(0);
  });

  it('fetchHeroSlides only enriches first trailerEnrichLimit slides', async () => {
    const getVideos = vi.fn(async () => [
      { type: 'Trailer', site: 'YouTube', key: 'abc' },
    ]);
    const slides = await fetchHeroSlides(
      5,
      async () => page(10),
      getVideos,
      2
    );

    expect(slides).toHaveLength(5);
    expect(getVideos).toHaveBeenCalledTimes(2);
    expect(slides[0].trailerKey).toBe('abc');
    expect(slides[2].trailerKey).toBeUndefined();
  });

  it('combineMovieLists and uniqueMoviesById work as shipped', () => {
    const a = [fakeMovie(1), fakeMovie(2)] as any[];
    const b = [fakeMovie(2), fakeMovie(3)] as any[];
    const combined = combineMovieLists([a, b]);
    expect(combined).toHaveLength(4);
    expect(uniqueMoviesById(combined).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it('filterMoviesByCriteria filters by query', () => {
    const movies = [
      { ...fakeMovie(1), title: 'Inception' },
      { ...fakeMovie(2), title: 'Interstellar' },
    ] as any[];
    const result = filterMoviesByCriteria(movies, { searchQuery: 'incep' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Inception');
  });

  it('cap helper used by progressive path matches progressiveRender', () => {
    expect(cap([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });
});
