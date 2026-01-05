












import React from 'react';
import { Sparkles } from 'lucide-react';

type Particle = {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
};

/**
 * Props for CollectionsLoading component
 *
 * @property isSlowNetwork - If true, display an additional slow network notice (does not change skeleton behavior).
 * @property noData - If true, show a friendly "no data" message instead of the full skeleton grid.
 * @property particleCount - Number of animated background particles to render (useful for testing).
 * @property categoriesCount - Number of category skeletons to render.
 * @property cardsPerCategory - Number of collection cards rendered per category.
 */
export interface CollectionsLoadingProps {
  isSlowNetwork?: boolean;
  noData?: boolean;
  particleCount?: number;
  categoriesCount?: number;
  cardsPerCategory?: number;
}

/**
 * Generate particle positions and timings for the hero animated background.
 * Exported for unit testing.
 *
 * @param count - How many particles to generate
 * @returns Array of Particle descriptors
 */
export function generateParticles(count: number): Particle[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }).map(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${2 + Math.random() * 2}s`,
  }));
}

/**
 * Safely parse JSON stored in localStorage.
 *
 * This helper defensively reads a key from localStorage and attempts to parse it as JSON.
 * If localStorage is unavailable, the key is missing, or parsing fails, the provided fallback is returned.
 *
 * Exported so callers can use the same defensive parsing strategy across the app.
 *
 * @template T - Expected return type
 * @param key - localStorage key to read
 * @param fallback - Value to return when parsing fails or key is absent
 * @returns Parsed value from localStorage or the fallback
 */
export function parseJSONFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    // Defensive: Log and return fallback to avoid throwing during render
    // eslint-disable-next-line no-console
    console.error(`parseJSONFromLocalStorage: failed to parse key "${key}"`, err);
    return fallback;
  }
}

/**
 * Generate a poster grid JSX for a single card placeholder.
 *
 * @param posterIndexOffset - Offset used to compute animation delays for posters to vary animations
 * @param keyBase - Base key string to ensure stable keys in lists
 * @returns JSX element representing the poster collage skeleton
 */
export function PosterCollageSkeleton({
  posterIndexOffset,
  keyBase,
}: {
  posterIndexOffset: number;
  keyBase: string;
}): React.ReactElement {
  return (
    <div className="aspect-[3/4] bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden">
      <div className="grid grid-cols-2 h-full gap-1 p-1">
        {Array.from({ length: 4 }).map((_, posterIndex) => (
          <div
            key={`${keyBase}-poster-${posterIndex}`}
            className="bg-gray-600 rounded animate-pulse"
            style={{ animationDelay: `${(posterIndex + posterIndexOffset) * 0.2}s` }}
          />
        ))}
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
    </div>
  );
}

/**
 * Generate a single collection card skeleton element.
 *
 * @param cardIndex - Index of the card (used for animation delay)
 * @returns JSX element representing a single card
 */
export function generateCardSkeleton(cardIndex: number): React.ReactElement {
  return (
    <div
      key={cardIndex}
      className="group relative animate-pulse"
      style={{ animationDelay: `${cardIndex * 0.1}s` }}
    >
      <div className="relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-red-500/30 transition-all duration-300">
        <PosterCollageSkeleton posterIndexOffset={cardIndex} keyBase={`card-${cardIndex}`} />

        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-700 rounded w-3/4 animate-pulse" />

          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
            <div className="h-4 bg-gray-700 rounded w-12 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500/30 rounded-full animate-pulse"
                style={{ width: `${Math.random() * 100}%` }}
              />
            </div>
            <div className="h-3 bg-gray-700 rounded w-20 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate category skeleton blocks with card placeholders.
 * Exported for unit testing.
 *
 * @param categoriesCount - Number of categories to generate
 * @param cardsPerCategory - Number of cards per category
 * @returns Array of JSX elements representing categories
 */
export function generateCategorySkeletons(categoriesCount: number, cardsPerCategory: number): React.ReactElement[] {
  const categories: React.ReactElement[] = [];

  for (let categoryIndex = 0; categoryIndex < Math.max(0, Math.floor(categoriesCount)); categoryIndex++) {
    const cards: React.ReactElement[] = [];
    for (let cardIndex = 0; cardIndex < Math.max(0, Math.floor(cardsPerCategory)); cardIndex++) {
      cards.push(generateCardSkeleton(cardIndex));
    }

    categories.push(
      <div key={categoryIndex} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-500/30 rounded animate-pulse" />
          <div className="h-8 bg-gray-700 rounded w-48 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {cards}
        </div>
      </div>
    );
  }

  return categories;
}

/**
 * CollectionsLoading
 *
 * A full-page loading skeleton used while collections/franchises data is being fetched.
 * The component preserves the existing visual design while consolidating generation logic into helpers.
 *
 * Props:
 * - isSlowNetwork: optional flag to surface a slow network hint for users.
 * - noData: optional flag to show a friendly "no data" message (useful for deterministic states in tests).
 * - particleCount, categoriesCount, cardsPerCategory: tuning props primarily for tests; default values preserve current behavior.
 */
const CollectionsLoading: React.FC<CollectionsLoadingProps> = ({
  isSlowNetwork = false,
  noData = false,
  particleCount = 20,
  categoriesCount = 4,
  cardsPerCategory = 10,
}: CollectionsLoadingProps) => {
  const particles = generateParticles(particleCount);
  const categorySkeletons = generateCategorySkeletons(categoriesCount, cardsPerCategory);

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      {/* Hero Section Skeleton */}
      <div className="relative h-[70vh] bg-[#0A0A1F] overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: p.left,
                top: p.top,
                animationDelay: p.animationDelay,
                animationDuration: p.animationDuration,
              }}
            >
              <Sparkles className="w-4 h-4 text-red-500/30" />
            </div>
          ))}
        </div>

        {/* Hero content skeleton */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-[#0A0A1F]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="space-y-4">
            {/* Title skeleton with shimmer */}
            <div className="relative overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg w-96 animate-pulse" />
            </div>

            {/* Description skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-full max-w-2xl animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-3/4 max-w-2xl animate-pulse" />
            </div>

            {/* Stats skeleton */}
            <div className="flex gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
              </div>
            </div>

            {/* Buttons skeleton */}
            <div className="flex gap-4 mt-8">
              <div className="h-12 bg-red-600/30 rounded w-40 animate-pulse" />
              <div className="h-12 bg-gray-700/30 rounded w-36 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Loading indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="relative">
            {/* Main thick spinner */}
            <div className="h-20 w-20 netflix-spinner-thick" />

            {/* Ripple effects */}
            <div className="h-20 w-20 netflix-ripple" />
            <div className="h-20 w-20 netflix-ripple" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="ml-6 space-y-2 loading-text">
            <div className="text-xl font-semibold text-white">Loading Collections</div>
            <div className="text-gray-400">Discovering amazing franchises...</div>
            <div className="flex gap-2 mt-3">
              <div className="netflix-dot" />
              <div className="netflix-dot" />
              <div className="netflix-dot" />
            </div>
          </div>
        </div>

        {/* Slow network hint */}
        {isSlowNetwork && (
          <div className="mb-6 p-3 bg-yellow-900/30 text-yellow-200 rounded-md text-center">
            Slow network detected — content may take longer to load.
          </div>
        )}

        {/* Filter bar skeleton */}
        {!noData && (
          <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-900/50 rounded-lg">
            <div className="h-10 bg-gray-700 rounded w-32 animate-pulse" />
            <div className="h-10 bg-gray-700 rounded w-28 animate-pulse" />
            <div className="h-10 bg-gray-700 rounded w-36 animate-pulse" />
            <div className="h-10 bg-gray-700 rounded w-24 animate-pulse" />
          </div>
        )}

        {/* Categories skeleton or no-data message */}
        <div className="space-y-12">
          {noData ? (
            <div className="text-center text-gray-300 py-12">
              <div className="text-2xl font-semibold mb-2">No Collections Found</div>
              <div className="text-gray-400">We couldn't find any collections at this time. Try adjusting filters or check back later.</div>
            </div>
          ) : (
            categorySkeletons
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionsLoading;