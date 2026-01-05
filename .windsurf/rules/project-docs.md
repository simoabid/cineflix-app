---
trigger: always_on
---

CineFlix Project - Complete Architecture Documentation
Project Overview
CineFlix is a Netflix-style streaming web application built with React, TypeScript, Vite, and TailwindCSS. It integrates TMDB API for movie/TV metadata and multiple streaming services (Rivestream, SmashyStream, 111movies) for playback.

Technology Stack
Frontend: React 18.2, TypeScript 5.0
Routing: react-router-dom v6.8
Styling: TailwindCSS 3.3, Framer Motion 12.23
Build: Vite 4.4
API: Axios 1.6, TMDB API (key: 24cmw84f72jqw382377434839384u4j)
Icons: Lucide React 0.263
State: React hooks, localStorage for persistence
Application Entry Points
src/main.tsx
: React root render with StrictMode
src/App.tsx
: Router configuration with ErrorBoundary, Navbar, Footer wrapper
src/index.css
: Global styles and TailwindCSS imports
Routing Structure (
src/App.tsx
)
/ → HomePage
/new-popular → NewPopularPage
/movies → Movies
/tv-shows → TVShows
/collections → CollectionsPage
/collection/:id → CollectionDetailPage
/my-list → MyListPage
/movie/:id → DetailPage (type="movie")
/tv/:id → DetailPage (type="tv")
/watch/movie/:id → WatchPage (type="movie")
/watch/tv/:id → WatchPage (type="tv")
/search → SearchPage
* → HomePage (fallback)
Pages Deep Dive
pages/HomePage.tsx
 (458 lines)
Purpose: Main landing page with hero carousel and content rows
Features:
Auto-rotating hero carousel (12 trending movies, 10s intervals)
Fetches: trending, popular, top-rated, now-playing movies
Responsive hero (vertical poster mobile, horizontal backdrop desktop)
Logo integration via LogoImage component
Genre collections section
Share functionality, mute toggle
State: Hero movies, current index, autoplay control, muted state
Services: 
getTrendingMovies
, 
getPopularMovies
, 
getTopRatedMovies
, 
getNowPlayingMovies
, 
getMovieDetails
, 
getMovieCredits
pages/Movies.tsx
 (306 lines)
Purpose: Dedicated movies browsing with filtering
Features:
Hero carousel with trailers (5 featured movies)
Filter by genre, year, rating, search query
Genre-based content rows (cached)
Categories: Trending, Popular, Top Rated, Now Playing, Upcoming
State: Genre cache (Map), filters, view toggles
Services: All movie endpoints + 
getMovieGenres
, 
discoverMoviesByGenre
, 
getMovieVideos
pages/TVShows.tsx
 (294 lines)
Purpose: TV shows browsing (parallel to Movies)
Features: Same structure as Movies but for TV content
Categories: Trending, Popular, Top Rated, On the Air
Services: 
getTrendingTVShows
, 
getPopularTVShows
, 
getTopRatedTVShows
, 
getAiringTodayTVShows
, 
getTVGenres
, 
discoverTVShowsByGenre
pages/NewPopularPage.tsx
 (798 lines)
Purpose: Curated "New & Popular" content discovery
Features:
Hero section with 5-item rotation
Mixed movie/TV content sections
Sections: New Releases, Trending Now, Coming Soon, Top 10 Movies, Top 10 TV Shows, Recently Added
Content type filter (all/movies/tv)
Sort options (release_date, popularity, rating, title)
Time period filter (week/month/year)
Grid/Carousel view modes
State: Complex section management, hero navigation, filter states
pages/DetailPage.tsx
 (2482 lines - large file)
Purpose: Comprehensive movie/TV detail view
Features:
Full metadata display (title, overview, runtime, rating, genres)
Cast & crew with expandable lists
Person details modal with filmography
Video trailers modal
Similar & recommended content (enhanced algorithm)
TV: Seasons/episodes with watch tracking
External IDs integration
Keyword-based recommendations
Download actor images
State: Content, videos, credits, similar, seasons, person modals, expanded states
Services: 
getMovieDetails
, 
getTVShowDetails
, 
getMovieCredits
, 
getTVShowCredits
, 
getEnhancedSimilarMovies
, 
getEnhancedSimilarTVShows
, 
getPersonDetails
, 
getPersonMovieCredits
, 
getTVShowSeasons
, 
getTVShowSeasonDetails
pages/WatchPage.tsx
 (628 lines)
Purpose: Video playback page with streaming sources
Features:
Multiple streaming source aggregation (Rivestream, SmashyStream, 111movies, Vidjoy, VidSrc, etc.)
Stream/Download/Torrent tabs
TV: Season/episode selector
Watch progress tracking (localStorage)
Like/Add to list integration
Similar content recommendations
Fallback sources on API failure
State: Content, sources, selected source, season/episode, loading states
Services: 
rivestreamService.getAllContentData()
, SmashyStreamService.generateMovieSources(), Movies111Service.generateMovieSources(), myListService, watchService
pages/MyListPage.tsx
 (297 lines)
Purpose: Personal watchlist management
Features:
Multiple view modes (grid/list/compact)
Advanced filtering (type, status, genre, date, rating, runtime, tags, priority, liked)
Sort options (dateAdded, title, rating, runtime, releaseYear)
Bulk operations (remove, mark watched/unwatched, set priority, add/remove tags)
Search with notes/tags inclusion
Stats modal (total items, hours, completion rate, genre distribution)
Export modal (JSON, CSV formats)
Continue watching section
Recently added section
State: Items, filters, sort, search, selections, modal toggles
Service: myListService (comprehensive local storage management)
pages/CollectionsPage.tsx
 (1188 lines)
Purpose: Movie franchise/collection discovery
Features:
Comprehensive TMDB collection discovery (scans 200+ movies)
Progress tracking during discovery
Featured collection hero with rotation
Dynamic categories (Popular, Complete Series, Trilogies, Extended Universes, Superhero, Action, Sci-Fi, Fantasy)
Filter by length, status, genre
Search collections
Infinite scroll for "All Collections" view
Collection stats
Cache management (2-hour duration)
State: Collections, categories, filters, pagination, infinite scroll, hero rotation
Services: 
discoverAllCollections
, 
getCollectionsByCategory
, CollectionsService.enhanceCollectionsWithProgress()
pages/SearchPage.tsx
 (143 lines)
Purpose: Global search interface
Features: Query param-driven search, grid results display
Service: 
searchContent(query)
pages/CollectionDetailPage.tsx
 (35974 bytes - not fully read)
Purpose: Individual collection/franchise detail view
Expected: Timeline, movies list, stats, filtering within collection
Core Services
services/tmdb.ts
 (2057 lines)
Purpose: Central TMDB API client
API Key: 7b28648bb27efe6ee3ce7c316c535d8b
Base URL: https://api.themoviedb.org/3
Image Base: https://image.tmdb.org/t/p
Features:
Axios instance with API key injection
Image configuration management
Comprehensive endpoints (movies, TV, search, people, collections, videos, credits, recommendations, similar, seasons, external IDs)
Enhanced collection discovery with rate limiting (100ms delay)
Collection caching (2-hour duration)
Pagination support for collections
Logo fetching and caching integration
Fallback SVG placeholders for missing images
Keyword-based recommendation enhancement
Key Functions:
getImageUrl()
, 
getPosterUrl()
, 
getBackdropUrl()
, 
getLogoUrl()
getTrendingMovies()
, 
getPopularMovies()
, 
getTopRatedMovies()
, 
getNowPlayingMovies()
, 
getUpcomingMovies()
getTrendingTVShows()
, 
getPopularTVShows()
, 
getTopRatedTVShows()
, 
getAiringTodayTVShows()
getMovieDetails()
, 
getTVShowDetails()
 (with logo fetching)
getMovieCredits()
, 
getTVShowCredits()
getSimilarMovies()
, 
getSimilarTVShows()
, 
getEnhancedSimilarMovies()
, 
getEnhancedSimilarTVShows()
getMovieRecommendations()
, 
getTVShowRecommendations()
getTVShowSeasons()
, 
getTVShowSeasonDetails()
getPersonDetails()
, 
getPersonMovieCredits()
searchContent()
, 
discoverMoviesByGenre()
, 
discoverTVShowsByGenre()
discoverAllCollections()
 (comprehensive discovery with progress callbacks)
getCollectionsByCategory()
, 
getCollectionStats()
, 
clearCollectionsCache()
services/logoCache.ts
 (3940 bytes)
Purpose: LocalStorage-backed logo caching
Storage Key: cineflix_logo_cache
TTL: 7 days
Features: Get/set/clear logos, failure tracking, cache cleanup
services/myListService.ts
 (478 lines)
Purpose: Watchlist management (localStorage)
Storage Keys: cineflix_my_list, cineflix_collections, cineflix_list_preferences
Features:
Add/remove items with metadata
Like/unlike content
Update item status (notStarted, inProgress, completed, dropped)
Priority levels (low, medium, high)
Custom tags
Personal notes and ratings
Progress tracking (percentage)
Filtering (type, status, genre, date, rating, runtime, year, tags, priority, liked)
Sorting (dateAdded, title, rating, runtime, releaseYear)
Search (title, overview, notes, tags)
Bulk operations (remove, mark watched/unwatched, set priority, add/remove tags)
Statistics (total items, movies/TV breakdown, hours, completion rate, average rating, genre distribution, monthly additions)
Custom collections
Continue watching list
Recently added list
Preferences (view mode, sort defaults)
Runtime estimation
services/watchService.ts
 (370 lines)
Purpose: Watch progress and session tracking
Storage Keys: watch_progress_{type}_{id}, watching_sessions, rating_{type}_{id}, bookmarks_{type}_{id}
Features:
Watch progress (currentTime, duration, percentage, lastWatched)
Watching sessions (start/end, watch time, quality, device, IP)
Content ratings (1-10 scale with reviews)
Bookmarked scenes (timestamp, title, description, thumbnail)
Mock stream/download/torrent sources (fallback data)
Analytics (total watch time, average session, most watched type)
Data cleanup (remove old sessions)
services/rivestreamService.ts
 (513 lines)
Purpose: Streaming source aggregation
Endpoints:
Rivestream Standard: https://rivestream.org/embed
Rivestream Aggregator: https://rivestream.org/embed/agg
Rivestream Torrent: https://rivestream.org/embed/torrent
Rivestream Download: https://rivestream.org/download
CinemaOS: https://cinemaos.tech/player/{tmdb_id}[/{season}/{episode}]
Beech: https://beech-api.vercel.app/?id={id}[&type=tv&season={s}&episode={e}]
Vidjoy: https://vidjoy.pro/embed/{type}/{tmdb_id}[/{season}/{episode}]
VidSrc: https://vidsrc.wtf/api/{version}/{type}/?id={tmdb_id}[&s={s}&e={e}]
VidFast: https://vidfast.pro/{type}/{id}[/{season}/{episode}]?autoPlay=true
Features:
URL builders for each service
Quality indicators (480p-4K)
Reliability ratings (Fast, Stable, Premium)
Ad-free flags
Subtitle support
Download options with file sizes
Torrent sources with seeders/leechers
services/smashystream.ts
 (4745 bytes)
Purpose: SmashyStream source generation
Features: TMDB ID-based URL generation for movies/TV
services/111movies.ts
 (2841 bytes)
Purpose: 111movies source generation
Features: Similar to SmashyStream
services/collectionsService.ts
 (9321 bytes)
Purpose: Collection enhancement and organization
Features:
Progress tracking per collection
Recommended collections based on viewing history
Continue watching collections
Category organization
Stats calculation
Key Components
Navigation & Layout
components/Navbar.tsx
 (421 lines): Fixed navbar with scroll effects, search modal trigger (Cmd+K), notifications dropdown, user menu, theme toggle, fullscreen toggle (F11), mobile menu, responsive design
components/Footer.tsx
 (18294 bytes): Rich footer with links, social media, newsletter signup
components/ErrorBoundary.tsx
 (1324 bytes): Error catching wrapper
Content Display
components/ContentCarousel.tsx
 (159 lines): Horizontal scrolling carousel with navigation arrows, intersection observer for animations, staggered card loading
components/ContentCard.tsx
 (5686 bytes): Individual content card with hover effects, poster display, metadata overlay
components/HeroCarousel.tsx
 (6227 bytes): Full-screen hero slider with autoplay, navigation
components/HoverPreviewCard.tsx
 (8953 bytes): Advanced hover preview with delayed expansion
components/FranchiseCard.tsx
 (10240 bytes): Collection/franchise card display
components/GenreCollections.tsx
 (3759 bytes): Genre-based collection rows
components/TimelineView.tsx
 (13153 bytes): Timeline visualization for collections
components/LogoImage.tsx
 (5863 bytes): Smart logo display with fallback to text, on-demand fetching, caching via logoCache
Interactive Elements
components/AddToListButton.tsx
 (2883 bytes): 