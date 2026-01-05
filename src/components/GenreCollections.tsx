import React, { useState, useEffect, useCallback } from 'react';
import ContentCarousel from './ContentCarousel';
import { getMovieGenres, getTVGenres, discoverMoviesByGenre, discoverTVShowsByGenre } from '../services/tmdb';
import { Movie, TVShow } from '../types';

interface GenreSection {
  id: number;
  name: string;
  type: 'movie' | 'tv';
  items: (Movie | TVShow)[];
  loading: boolean;
  page: number;
  hasMore: boolean;
}

interface GenreCollectionsProps {
  selectedGenres?: number[];
  contentType?: 'movie' | 'tv' | 'all';
}

const GenreCollections: React.FC<GenreCollectionsProps> = ({
  selectedGenres = [],
  contentType = 'all'
}) => {
  const [genreSections, setGenreSections] = useState<GenreSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6); // Start with 6 genres
  const [hasMore, setHasMore] = useState(false);

  const fetchGenresAndContent = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all genres for both movies and TV shows
      const [movieGenres, tvGenres] = await Promise.all([
        getMovieGenres(),
        getTVGenres()
      ]);

      // Determine which genres to display
      let genresToDisplay: { id: number; name: string; type: 'movie' | 'tv' }[] = [];

      // If specific genres are selected, filter to those
      if (selectedGenres.length > 0) {
        // Filter movie genres
        if (contentType === 'all' || contentType === 'movie') {
          const filteredMovieGenres = movieGenres.filter(g => selectedGenres.includes(g.id));
          genresToDisplay.push(...filteredMovieGenres.map(g => ({ ...g, type: 'movie' as const })));
        }

        // Filter TV genres
        if (contentType === 'all' || contentType === 'tv') {
          const filteredTVGenres = tvGenres.filter(g => selectedGenres.includes(g.id));
          genresToDisplay.push(...filteredTVGenres.map(g => ({ ...g, type: 'tv' as const })));
        }
      } else {
        // Show all genres (default behavior)
        if (contentType === 'all' || contentType === 'movie') {
          const topMovieGenres = movieGenres.slice(0, 8);
          genresToDisplay.push(...topMovieGenres.map(g => ({ ...g, type: 'movie' as const })));
        }

        if (contentType === 'all' || contentType === 'tv') {
          const topTVGenres = tvGenres.slice(0, 8);
          genresToDisplay.push(...topTVGenres.map(g => ({ ...g, type: 'tv' as const })));
        }
      }

      // Check if there are more genres than visible
      setHasMore(genresToDisplay.length > visibleCount);

      // CRITICAL OPTIMIZATION: Parallel loading instead of sequential
      // Load all genres in parallel using Promise.all()
      const sections = await Promise.all(
        genresToDisplay.map(async (genre) => {
          try {
            const items = genre.type === 'movie'
              ? await fetchMoviesByGenre(genre.id, 1)
              : await fetchTVShowsByGenre(genre.id, 1);

            return {
              id: genre.id,
              name: genre.name,
              type: genre.type,
              items: items,
              loading: false,
              page: 1,
              hasMore: items.length === 20
            };
          } catch (error) {
            console.error(`Error fetching ${genre.type} for genre ${genre.id}:`, error);
            // Return empty section on error to prevent breaking entire component
            return {
              id: genre.id,
              name: genre.name,
              type: genre.type,
              items: [],
              loading: false,
              page: 1,
              hasMore: false
            };
          }
        })
      );

      setGenreSections(sections);
    } catch (error) {
      console.error('Error fetching genres and content:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGenres, contentType, visibleCount]);

  useEffect(() => {
    fetchGenresAndContent();
  }, [fetchGenresAndContent]);

  const fetchMoviesByGenre = async (genreId: number, page: number): Promise<Movie[]> => {
    try {
      const response = await discoverMoviesByGenre(genreId, page);
      return response.results;
    } catch (error) {
      console.error(`Error fetching movies for genre ${genreId}:`, error);
      return [];
    }
  };

  const fetchTVShowsByGenre = async (genreId: number, page: number): Promise<TVShow[]> => {
    try {
      const response = await discoverTVShowsByGenre(genreId, page);
      return response.results;
    } catch (error) {
      console.error(`Error fetching TV shows for genre ${genreId}:`, error);
      return [];
    }
  };



  if (loading) {
    return (
      <div className="space-y-8">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="px-4 md:px-8">
            <div className="h-8 bg-gray-800 rounded animate-pulse mb-4 w-48"></div>
            <div className="flex space-x-4 overflow-hidden">
              {[...Array(6)].map((_, itemIndex) => (
                <div key={itemIndex} className="flex-shrink-0">
                  <div className="w-48 h-72 bg-gray-800 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {genreSections.slice(0, visibleCount).map((section) => (
        <GenreSection key={`${section.type}-${section.id}`} section={section} />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 6)}
            className="group relative px-8 py-4 bg-gradient-to-r from-netflix-red to-red-700 hover:from-red-700 hover:to-netflix-red text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Load More Genres
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </button>
        </div>
      )}
    </div>
  );
};

// Memoized GenreSection component to prevent unnecessary re-renders
const GenreSection = React.memo<{ section: GenreSection }>(
  ({ section }) => (
    <ContentCarousel
      title={`${section.name} ${section.type === 'movie' ? 'Movies' : 'TV Shows'}`}
      items={section.items}
      type={section.type}
    />
  ),
  (prevProps, nextProps) => {
    // Only re-render if section ID or items length changes
    return (
      prevProps.section.id === nextProps.section.id &&
      prevProps.section.items.length === nextProps.section.items.length &&
      prevProps.section.type === nextProps.section.type
    );
  }
);

GenreSection.displayName = 'GenreSection';

export default GenreCollections;
