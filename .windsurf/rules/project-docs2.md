---
trigger: always_on
---

Interactive Elements
components/AddToListButton.tsx
 (2883 bytes): Add/remove from watchlist with icon toggle
components/LikeButton.tsx
 (3426 bytes): Like/unlike content
components/SearchModal.tsx
 (49545 bytes): Full-featured search modal with filters, recent searches, trending
components/EnhancedSearch.tsx
 (11944 bytes): Advanced search component
components/FilterBar.tsx
 (7205 bytes): Multi-criteria filter UI
My List Components (
components/MyList/
)
MyListHeader.tsx
 (7193 bytes): Header with stats, view/sort controls
FilterBar.tsx
 (11422 bytes): Comprehensive filter UI
GridView.tsx
 (11471 bytes): Grid layout for list items
ListView.tsx
 (12010 bytes): List layout
CompactView.tsx
 (10528 bytes): Compact layout
BulkActions.tsx
 (7238 bytes): Bulk operation controls
QuickActions.tsx
 (6500 bytes): Continue watching and recent additions
StatsModal.tsx
 (12659 bytes): Detailed statistics modal
ExportModal.tsx
 (13613 bytes): Export functionality
EmptyState.tsx
 (7412 bytes): Empty list placeholder
ListContent.tsx
 (1038 bytes): Content router for view modes
Watch Page Components (
components/WatchPage/
)
VideoFrame.tsx
 (5765 bytes): iframe wrapper for video player
VideoPlayer.tsx
 (21401 bytes): Advanced video player with controls
StreamSources.tsx
 (34453 bytes): Stream source selector with quality indicators
DownloadOptions.tsx
 (17178 bytes): Download options display
TorrentSources.tsx
 (14938 bytes): Torrent source list with health indicators
MovieDetails.tsx
 (12623 bytes): Metadata display
SeasonsEpisodesSection.tsx
 (14338 bytes): TV season/episode selector
SimilarContent.tsx
 (12046 bytes): Related content recommendations
UserRating.tsx
 (2320 bytes): Rating input component
Collections Components
CollectionsHero.tsx
 (15937 bytes): Featured collection hero
CollectionsFilter.tsx
 (9726 bytes): Collection filtering UI
CollectionsLoading.tsx
 (7379 bytes): Loading state with progress
Utility Components
components/LoadingSkeleton.tsx
 (3605 bytes): Generic loading skeleton
components/EpisodesList.tsx
 (10707 bytes): TV episodes list with watch tracking
components/MovieCard.tsx
 (1647 bytes): Simple movie card
Hooks
hooks/useMyList.ts
 (4419 bytes): React hook for watchlist operations (add, remove, check if in list)
hooks/useHoverIntent.ts
 (3577 bytes): Delayed hover detection for preview cards
hooks/useScreenSize.ts
 (921 bytes): Responsive breakpoint detection
Types (
src/types/
)
types/index.ts
 (8600 bytes): Core types (Movie, TVShow, Video, ApiResponse, Content, Genre, Collection, Credits, Person, etc.)
types/myList.ts
 (2724 bytes): MyList types (MyListItem, FilterOptions, SortOption, ListStats, BulkOperation, CustomCollection, ListPreferences)
Utilities
utils/imageLoader.ts
 (2628 bytes): Image error handling, fallback logic
Configuration
tailwind.config.js
: Custom colors (netflix-red: #E50914, netflix-black: #141414, netflix-darkgray: #2F2F2F, netflix-lightgray: #B3B3B3)
vite.config.ts
: Vite + React plugin setup
tsconfig.json
: TypeScript strict mode, ES2020 target
package.json
: Scripts (dev, build, preview, deploy via gh-pages)
Key Features Summary
TMDB Integration: Comprehensive movie/TV metadata with 200+ collection discovery
Multi-Source Streaming: Aggregates 10+ streaming services with fallbacks
Personal Watchlist: Full CRUD with filtering, sorting, bulk operations, stats
Watch Tracking: Progress, sessions, bookmarks, ratings
Advanced Search: Modal with filters, recent searches, trending
Collections: Franchise discovery with timeline, stats, filtering
Responsive Design: Mobile-first with breakpoint-specific layouts
Performance: Caching (logos, collections, genres), lazy loading, intersection observers
Accessibility: Keyboard shortcuts (Cmd+K search, F11 fullscreen), ARIA labels
Offline-First: LocalStorage for watchlist, progress, preferences
Data Flow
TMDB API → 
services/tmdb.ts
 → Component state → UI
User Actions → myListService/watchService → LocalStorage → UI update
Streaming → Multiple services → 
WatchPage
 → Source selector → Video player
Navigation → react-router-dom → Page components → Fetch data → Render
State Management Pattern
No Redux/Context: Pure React hooks (useState, useEffect, useMemo, useCallback)
Persistence: LocalStorage via service classes
Caching: In-memory Maps + LocalStorage with TTL
Optimistic Updates: Immediate UI updates, background sync
Performance Optimizations
Genre caching (Map-based)
Collection discovery caching (2-hour TTL)
Logo caching (7-day TTL)
Lazy loading with intersection observers
Debounced search
Memoized computations
Staggered animations
Rate limiting for API calls (100ms delay)
Notable Patterns
Service Layer: Separation of business logic from components
Compound Components: MyList suite, WatchPage suite
Render Props: Intersection observer for animations
Custom Hooks: Reusable logic (useMyList, useHoverIntent, useScreenSize)
Error Boundaries: Graceful error handling
Fallback Data: Mock sources when APIs fail
This documentation captures the complete architecture of the CineFlix project as of the analysis date.

Feedback submitted