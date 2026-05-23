import { describe, it, expect } from 'vitest';
import {
  classifyCollectionType,
  determineCollectionStatus,
  extractGenreCategories,
  extractStudio,
  GENRE_MAP
} from '../../services/collectionHelpers';
import type { Movie } from '../../types';

// ─── Test Data Factories ──────────────────────────────────────────────────────

const createMockMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  title: 'Test Movie',
  original_title: 'Test Movie',
  overview: 'A test movie',
  poster_path: '/test.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2020-01-01',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  genre_ids: [28, 12],
  ...overrides
});

// ─── classifyCollectionType ───────────────────────────────────────────────────

describe('classifyCollectionType', () => {
  it('should classify 3 films as trilogy', () => {
    const actual = classifyCollectionType(3);
    expect(actual).toBe('trilogy');
  });

  it('should classify 4 films as quadrilogy', () => {
    const actual = classifyCollectionType(4);
    expect(actual).toBe('quadrilogy');
  });

  it('should classify 5 films as pentology', () => {
    const actual = classifyCollectionType(5);
    expect(actual).toBe('pentology');
  });

  it('should classify 6 films as hexalogy', () => {
    const actual = classifyCollectionType(6);
    expect(actual).toBe('hexalogy');
  });

  it('should classify 7 films as septology', () => {
    const actual = classifyCollectionType(7);
    expect(actual).toBe('septology');
  });

  it('should classify 8 films as octology', () => {
    const actual = classifyCollectionType(8);
    expect(actual).toBe('octology');
  });

  it('should classify 9 films as nonology', () => {
    const actual = classifyCollectionType(9);
    expect(actual).toBe('nonology');
  });

  it('should classify 10+ films as extended_series', () => {
    expect(classifyCollectionType(10)).toBe('extended_series');
    expect(classifyCollectionType(25)).toBe('extended_series');
  });

  it('should classify 1-2 films as incomplete_series', () => {
    expect(classifyCollectionType(1)).toBe('incomplete_series');
    expect(classifyCollectionType(2)).toBe('incomplete_series');
  });

  it('should classify 0 films as incomplete_series', () => {
    const actual = classifyCollectionType(0);
    expect(actual).toBe('incomplete_series');
  });
});

// ─── determineCollectionStatus ────────────────────────────────────────────────

describe('determineCollectionStatus', () => {
  it('should return incomplete for fewer than 3 films', () => {
    const inputFilms = [createMockMovie(), createMockMovie({ id: 2 })];
    const actual = determineCollectionStatus(inputFilms);
    expect(actual).toBe('incomplete');
  });

  it('should return ongoing for collections with recent releases (within 3 years)', () => {
    const currentYear = new Date().getFullYear();
    const inputFilms = [
      createMockMovie({ id: 1, release_date: '2018-01-01' }),
      createMockMovie({ id: 2, release_date: '2020-01-01' }),
      createMockMovie({ id: 3, release_date: `${currentYear}-06-01` })
    ];
    const actual = determineCollectionStatus(inputFilms);
    expect(actual).toBe('ongoing');
  });

  it('should return complete for collections with no recent releases', () => {
    const inputFilms = [
      createMockMovie({ id: 1, release_date: '2000-01-01' }),
      createMockMovie({ id: 2, release_date: '2002-01-01' }),
      createMockMovie({ id: 3, release_date: '2004-01-01' })
    ];
    const actual = determineCollectionStatus(inputFilms);
    expect(actual).toBe('complete');
  });

  it('should handle films with empty release dates gracefully', () => {
    const inputFilms = [
      createMockMovie({ id: 1, release_date: '' }),
      createMockMovie({ id: 2, release_date: '' }),
      createMockMovie({ id: 3, release_date: '' })
    ];
    const actual = determineCollectionStatus(inputFilms);
    expect(actual).toBe('complete');
  });
});

// ─── extractGenreCategories ───────────────────────────────────────────────────

describe('extractGenreCategories', () => {
  it('should extract genres from genre_ids', () => {
    const inputFilms = [
      createMockMovie({ genre_ids: [28, 12] }),
      createMockMovie({ id: 2, genre_ids: [28, 878] })
    ];
    const actual = extractGenreCategories(inputFilms);
    expect(actual).toContain('Action');
    expect(actual).toContain('Adventure');
    expect(actual).toContain('Science Fiction');
  });

  it('should extract genres from genres objects (detail endpoint)', () => {
    const inputFilms = [
      createMockMovie({
        genre_ids: [],
        genres: [
          { id: 28, name: 'Action' },
          { id: 18, name: 'Drama' }
        ]
      })
    ];
    const actual = extractGenreCategories(inputFilms);
    expect(actual).toContain('Action');
    expect(actual).toContain('Drama');
  });

  it('should deduplicate genres from both fields', () => {
    const inputFilms = [
      createMockMovie({
        genre_ids: [28],
        genres: [{ id: 28, name: 'Action' }]
      })
    ];
    const actual = extractGenreCategories(inputFilms);
    const actionCount = actual.filter(g => g === 'Action').length;
    expect(actionCount).toBe(1);
  });

  it('should return empty array for films with no genres', () => {
    const inputFilms = [createMockMovie({ genre_ids: [], genres: [] })];
    const actual = extractGenreCategories(inputFilms);
    expect(actual).toEqual([]);
  });

  it('should skip unknown genre IDs', () => {
    const inputFilms = [createMockMovie({ genre_ids: [99999] })];
    const actual = extractGenreCategories(inputFilms);
    expect(actual).toEqual([]);
  });
});

// ─── extractStudio ────────────────────────────────────────────────────────────

describe('extractStudio', () => {
  it('should return the most common studio', () => {
    const inputFilms = [
      createMockMovie({
        id: 1,
        production_companies: [
          { id: 1, name: 'Warner Bros.', logo_path: null, origin_country: 'US' },
          { id: 2, name: 'Legendary', logo_path: null, origin_country: 'US' }
        ]
      }),
      createMockMovie({
        id: 2,
        production_companies: [
          { id: 1, name: 'Warner Bros.', logo_path: null, origin_country: 'US' }
        ]
      }),
      createMockMovie({
        id: 3,
        production_companies: [
          { id: 1, name: 'Warner Bros.', logo_path: null, origin_country: 'US' },
          { id: 3, name: 'New Line Cinema', logo_path: null, origin_country: 'US' }
        ]
      })
    ];
    const actual = extractStudio(inputFilms);
    expect(actual).toBe('Warner Bros.');
  });

  it('should return "Various Studios" when no production companies exist', () => {
    const inputFilms = [
      createMockMovie({ production_companies: undefined }),
      createMockMovie({ id: 2, production_companies: [] })
    ];
    const actual = extractStudio(inputFilms);
    expect(actual).toBe('Various Studios');
  });

  it('should handle single film with single studio', () => {
    const inputFilms = [
      createMockMovie({
        production_companies: [
          { id: 1, name: 'Marvel Studios', logo_path: null, origin_country: 'US' }
        ]
      })
    ];
    const actual = extractStudio(inputFilms);
    expect(actual).toBe('Marvel Studios');
  });
});

// ─── GENRE_MAP ────────────────────────────────────────────────────────────────

describe('GENRE_MAP', () => {
  it('should contain all major TMDB genres', () => {
    expect(GENRE_MAP[28]).toBe('Action');
    expect(GENRE_MAP[35]).toBe('Comedy');
    expect(GENRE_MAP[18]).toBe('Drama');
    expect(GENRE_MAP[27]).toBe('Horror');
    expect(GENRE_MAP[878]).toBe('Science Fiction');
  });

  it('should have 19 genre entries', () => {
    expect(Object.keys(GENRE_MAP).length).toBe(19);
  });
});
