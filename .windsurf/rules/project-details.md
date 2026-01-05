---
trigger: always_on
---

Application Structure
Entry 
src/main.tsx
 bootstraps React with 
App.tsx
, which wires react-router-dom routes and wraps the UI with 
Navbar
, Footer, and ErrorBoundary.
Routing 
src/App.tsx
 defines pages: 
HomePage
, 
Movies
, 
TVShows
, 
NewPopularPage
, 
CollectionsPage
, CollectionDetailPage, 
DetailPage
 for both movie/TV detail, 
MyListPage
, 
WatchPage
, and 
SearchPage
, plus fallbacks.
Pages
pages/HomePage.tsx
 Fetches trending/popular/top-rated/now-playing movies from tmdb services, manages hero carousel autoplay, and renders carousels plus GenreCollections.
pages/Movies.tsx
 / 
pages/TVShows.tsx
 Parallel page structures fetching category lists, caching genre discoveries, enabling multi-criteria filtering via FilterBar, and rendering HeroCarousel + multiple 
ContentCarousel
 rows.
pages/NewPopularPage.tsx
 Builds composite sections (new releases, top 10, etc.) by mixing TMDB endpoints, with hero rotation, filter controls, and responsive view toggles.
pages/CollectionsPage.tsx
 Coordinates comprehensive collection discovery using services/tmdb aggregation helpers and CollectionsService, with filtering, stats, and infinite scrolling logic.
pages/CollectionDetailPage.tsx
 (large file) drives detailed franchise exploration, stats, and filtering on a single collection (not read fully but referenced for structure).
pages/DetailPage.tsx
 Central detail view for movies/TV: fetches metadata, credits, external IDs, related items, trailers, manages person modals, seasons/episodes expansion, and recommendation logic.
pages/MyListPage.tsx
 Works with myListService to manage locally stored watchlist data, including filtering, bulk actions, stats/export modals, and custom views.
pages/WatchPage.tsx
 Integrates playback experience: pulls TMDB metadata, uses useMyList, fetches stream/download/torrent sources from rivestreamService, SmashyStreamService, and Movies111Service, and renders subcomponents (video frame, source selectors, similar content).
pages/SearchPage.tsx
 Handles query param-driven search, showing results grid with poster fallbacks.
pages/Movies.tsx
, 
TVShows.tsx
, 
NewPopularPage.tsx
, 
HomePage.tsx
 rely on 
ContentCarousel
, HeroCarousel, FilterBar.
Components
Navigation/Layout 
components/Navbar.tsx
 manages menus, search modal, notifications, fullscreen, theme toggle; 
components/Footer.tsx
 provides rich footer UI.
Content Display 
components/ContentCarousel.tsx
, 
ContentCard.tsx
, 
HeroCarousel.tsx
, 
HoverPreviewCard.tsx
, 
FranchiseCard.tsx
, 
GenreCollections.tsx
, 
TimelineView.tsx
, etc. handle responsive presentation and interactions.
Actions 
components/AddToListButton.tsx
, 
LikeButton.tsx
 integrate with myListService.
Search UX 
components/SearchModal.tsx
, 
EnhancedSearch.tsx
 offer modal search, filters, and quick results (modal file ~49kB suggests advanced UX).
My List Suite components/MyList/* implements list management UI (headers, bulk actions, different layouts, stats/export modals).
Watch Page Suite components/WatchPage/* covers video frame, stream/download/torrent selectors, detailed info, similar content, with 
VideoPlayer.tsx
 providing iframe/embed handling.
Miscellaneous 
components/ErrorBoundary.tsx
 wraps app; 
components/LoadingSkeleton.tsx
, 
components/CollectionsLoading.tsx
 provide loading states; 
components/LogoImage.tsx
 fetches/animates TMDB logos.
Services & Hooks
services/tmdb.ts
 Central TMDB client using Axios, housing numerous endpoints (trending, details, recommendations, seasons, people, collections). Manages image config, caching, enhanced collection discovery with rate limiting, and integrates logoCache.
services/logoCache.ts
 LocalStorage-backed cache for content logos, supporting LogoImage usage.
Streaming integrations
services/rivestreamService.ts
 constructs multiple rivestream/third-party URLs and returns structured StreamSource, DownloadOption, TorrentSource.
services/smashystream.ts
, 
services/111movies.ts
 generate alternative streaming source lists from TMDB IDs.
services/watchService.ts
 manages local watch progress, sessions, bookmarks, ratings, and mock stream/download/torrent data (fallbacks).
Collections 
services/collectionsService.ts
 enhances discovered collection data with progress, recommendations, categorization, caching, and stats.
My List 
services/myListService.ts
 implements comprehensive local watchlist CRUD, liking, filtering, stats, bulk operations, and preference persistence.
Utilities 
hooks/useMyList.ts
 bridges service with React state; 
hooks/useHoverIntent.ts
 handles delayed hover interactions; 
hooks/useScreenSize.ts
 provides breakpoint info. 
utils/imageLoader.ts
 includes image error handling helpers.
Data Flow & State
Client-side data Heavy usage of TMDB REST API via 
services/tmdb.ts
. Results stored in component state and cached (local maps, localStorage). For lists/watch progress, localStorage is source of truth via services (myListService, watchService).
Routing react-router-dom v6 defines UI flow: navigation via 
Navbar
 links and programmatic useNavigate in detail/watch components.
UI State Managed per page with useState, useEffect, useMemo, useCallback. Extensive derived state for filters, hero carousels, modals.
Streaming 
WatchPage
 orchestrates multiple services to gather playback options, with fallbacks ensuring availability even on errors.