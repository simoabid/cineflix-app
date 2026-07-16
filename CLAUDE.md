# CLAUDE.md

Guidance for AI agents and developers working in this repository.

## Project Overview

**CINEFLIX** is a full-stack MERN streaming and discovery platform (Netflix-inspired UX). The tracked product surface is two packages:

| Package | Stack | Role |
|---------|--------|------|
| **`/` (root)** | React 18, TypeScript, Vite 8, Tailwind | SPA — browse, search, collections, auth UI, Smart Player |
| **`/backend`** | Express, TypeScript, MongoDB (Mongoose), Socket.IO | API, auth, user data, metadata/stream proxies, watch parties |

Root and backend each have their own `package.json` and install independently. `npm run dev` at the root runs both via `concurrently`.

> Other directories may exist on disk (mobile, extension, core scrapers, marketing site, etc.). They are **out of scope** for this document and often gitignored. Work only against **frontend (`/src`) + backend (`/backend`)** unless the user explicitly expands scope.

---

## Commands

```bash
# Development (frontend :3000 + backend :3001)
npm run dev

# Frontend only (Vite; proxies /api → localhost:3001)
npm run dev:frontend

# Backend only (tsx watch)
npm run dev:backend

# Production build (backend tsc, then Vite frontend)
npm run build

# Lint frontend (.ts/.tsx, max-warnings 0)
npm run lint

# Lint backend
cd backend && npm run lint

# Type-check
npx tsc --noEmit
cd backend && npx tsc --noEmit

# Tests (Vitest, jsdom, globals)
npm run test                          # single run
npm run test:ui                       # watch
npm run test:coverage                 # V8 coverage
npx vitest run src/path/to/File.test.ts
npx vitest run -t "test name pattern"
```

---

## Environment

### Frontend (root `.env` / `.env.example`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base. Empty in local dev (Vite `/api` proxy). Production e.g. `https://api.example.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (browser) |
| `VITE_EXTENSION_ID` | Optional browser extension ID for CORS bypass |
| `VITE_CORS_PROXY_URL` | Optional CORS proxy for client scrapers |
| `VITE_CINEPRO_URL` | Optional external stream resolver base (default `http://localhost:3005`) |
| `VITE_CINEPRO_ENABLED` | Toggle CinePro adapter |
| `VITE_CINEPRO_TIMEOUT` | CinePro request timeout (ms) |

**Never** put secrets in `VITE_*` vars — they ship in the client bundle.

### Backend (`backend/.env` / `backend/.env.example`)

**Required at startup** (`backend/src/config/env.ts`):

- `JWT_SECRET`
- `MONGODB_URI`
- `TMDB_API_KEY`

**Common optional:**

- `PORT` (default `3001`)
- `NODE_ENV`
- `CORS_ALLOWED_ORIGINS` (comma-separated; include Vite origin, e.g. `http://localhost:3000`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `OMDB_API_KEY`
- `VIDROCK_PASSPHRASE`
- `LOG_LEVEL`

---

## Architecture

```
Browser (Vite :3000)
  ├─ Discovery UI (home, movies, TV, browse, collections, search, detail)
  ├─ Auth UI → httpOnly cookie JWT → /api/*
  ├─ Smart Player (/watch/movie|tv/:id)
  │    ├─ Client provider engine (P-Stream–style scrapers in src/lib/providers)
  │    ├─ CinePro adapter (optional HTTP stream resolver)
  │    ├─ Extension-aware fetchers when available
  │    └─ Classic iframe sources (RiveStream, SmashyStream, 111movies, …)
  └─ Zustand player + app stores, HLS.js / native video

Express (:3001)
  ├─ Auth, My List, preferences, user collections, watched episodes
  ├─ Proxies: TMDB, OMDb, Vidrock, generic proxy, media proxy (SSRF-hardened)
  └─ Socket.IO watch parties (authenticated)
```

### Data flow (watch)

1. User opens `/watch/movie/:id` or `/watch/tv/:id` → `SmartPlayerPage`
2. Metadata from TMDB (via backend `/api/tmdb` when configured)
3. `useScrape` orchestrates:
   - optional **CinePro** server streams (`src/services/cinepro-adapter/`)
   - **client provider engine** (`getProviders().runAll(...)`)
4. Streams map into the Zustand player store → `PStreamPlayer` / display layer
5. On failure → next source / classic iframe fallback
6. Progress may persist via progress store + My List API

---

## Frontend (`/src`)

### Entry & routing

- **Entry:** `src/main.tsx` → `src/App.tsx`
- **Router:** React Router v6 in `App.tsx`
- **Providers:** `ErrorBoundary`, `HelmetProvider`, `AuthProvider`, `ToastProvider`, `LenisProvider`, `SmartPlayerProvider`
- **Layout chrome:** `Navbar`, `Footer` around `<main>` routes

#### Public routes

| Path | Page |
|------|------|
| `/` | `HomePage` |
| `/movies` | `Movies` |
| `/tv-shows` | `TVShows` |
| `/browse` | `BrowsePage` |
| `/new-popular` | `NewPopularPage` |
| `/collections` | `CollectionsPage` |
| `/collection/:id` | `CollectionDetailPage` |
| `/movie/:id`, `/tv/:id` | `DetailPage` |
| `/watch/movie/:id`, `/watch/tv/:id` | **`SmartPlayerPage`** (primary watch UX) |
| `/search` | `SearchPage` |
| `/login`, `/signup` | Auth pages |

#### Protected routes (`ProtectedRoute` + `AuthContext`)

| Path | Page |
|------|------|
| `/my-list` | `MyListPage` |
| `/continue-watching` | `ContinueWatchingPage` |
| `/account` | `AccountPage` |

Unknown paths fall through to `HomePage`.  
`WatchPage.tsx` / `WatchRedirect.tsx` may still exist as legacy; **live watch routes use `SmartPlayerPage`**.

### Directory map

| Path | Role |
|------|------|
| `src/pages/` | Route-level screens |
| `src/components/` | UI by feature (`browse/`, `DetailPage/`, `Home/`, `MyList/`, `WatchPage/`, `player/`, `auth/`, `layout/`, `overlays/`, …) |
| `src/components/player/` | Smart Player UI: atoms, base chrome, display (web/HLS/Chromecast), hooks, overlays, internals |
| `src/contexts/` | `AuthContext`, `ToastContext`, `SmartPlayerContext` |
| `src/hooks/` | App hooks (`useScrape`, `useMyList`, `useWatchParty`, `useHoverIntent`, `useSmartPlayer`, …) |
| `src/services/` | HTTP/data clients (`api.ts`, `tmdb.ts`, classic stream services, `cinepro-adapter/`, analytics, …) |
| `src/stores/` | Zustand stores (player slices, progress, cinepro, bookmarks, volume, …) |
| `src/lib/providers/` | Client streaming engine (P-Stream–compatible): factory, extension bridge, sources/embeds runners |
| `src/backend/` | **Frontend-side** helpers for the player ecosystem (metadata, fetch helpers, extension messaging) — **not** the Express server |
| `src/types/`, `src/utils/`, `src/assets/` | Shared types, utilities, locales |

### Path aliases (`tsconfig` + Vite)

- `@/*` → `src/*`
- `@/components/*`, `@/pages/*`, `@/services/*`, `@/types/*`, `@/utils/*`, `@/hooks/*`, `@/stores/*`, `@/lib/*`
- `@providers` / `@p-stream/providers` → `src/lib/providers`

### Streaming stack (frontend)

**Dual-mode player:**

1. **Smart / native** — client scrapers + optional CinePro HTTP adapter + HLS/MP4 in-app player  
2. **Classic** — sandboxed iframe embeds (`rivestreamService`, `smashystream`, `111movies`, … via `SmartPlayerContext` / related UI)

**Key modules:**

- `src/pages/SmartPlayerPage.tsx` — full-screen watch route
- `src/hooks/useScrape.ts` — scrape orchestration + progress UI state
- `src/lib/providers/factory.ts` — builds `ProviderControls` for browser / extension / desktop targets
- `src/lib/providers/engine/` — sources, embeds, runners, fetchers
- `src/services/cinepro-adapter/` — client, mapper, health polling for optional external resolver
- `src/stores/player/` — Zustand + Immer slices (source, playing, progress, display, casting, skip segments, …)
- `src/stores/cinepro/` — CinePro connection + provider toggles

### Auth (frontend)

- `AuthContext` + `src/services/api.ts` use `credentials: 'include'`
- JWT lives in **httpOnly cookie** (`auth_token`) — not localStorage
- Email/password + Google OAuth flows; account profile/password update

### Other product features

- TMDB-powered discovery, fuzzy search (Fuse.js), collections discovery
- Hover-intent preview cards, logo caching, continue watching
- My List (filters, bulk ops, stats) via backend
- Watch parties (Socket.IO client hooks)
- PWA (`vite-plugin-pwa` + Workbox), i18n (`i18next`), analytics, SEO (`react-helmet-async`)
- Smooth scroll (Lenis), gamepad support hooks

### Dev server

- Vite: `localhost:3000`, `open: true`
- Proxy: `/api` → `http://localhost:3001`

---

## Backend (`/backend`)

### Entry

- `backend/src/server.ts` — Express app, Helmet CSP, CORS, global rate limit, routes, Socket.IO HTTP server
- Health: `GET /health`
- Swagger UI: `/api/docs` and `/api/docs.json` — **non-production only**

### Layering

```
routes → controllers → models (Mongoose)
         middleware (auth)
         config (env, database, swagger)
         utils (logger, publicDestination/SSRF)
         sockets (watchParty)
```

### HTTP API surface

| Mount | Auth | Purpose |
|-------|------|---------|
| `/api/auth` | Mixed | register, login, logout, Google/GitHub, me, profile, password, password-reset |
| `/api/my-list` | `protect` | Watchlist CRUD, likes, stats, search, bulk, progress, continue-watching |
| `/api/collections` | `protect` | User collections CRUD + items |
| `/api/preferences` | `protect` | Get/save user preferences |
| `/api/watched-episodes` | `protect` | Per-show episode watched state |
| `/api/tmdb/*` | Public proxy | Server-side TMDB (key never in browser) |
| `/api/omdb` | Public proxy | OMDb ratings |
| `/api/vidrock` | `protect` | Vidrock helpers |
| `/api/proxy` | `protect` + limiter | General SSRF-safe proxy |
| `/api/media-proxy` | `protect` + limiter | Media/stream proxy |

Auth middleware (`authMiddleware.ts`) reads **only** the `auth_token` httpOnly cookie.

### Models

- `User` — email, bcrypt password (cost 12), name, avatar
- `MyList` — per-user content items (status, progress, tags, likes, …)
- `Collection` — user-defined collections
- `Preferences` — view/playback/privacy/locale settings
- `WatchedEpisode` — TV episode completion

### Realtime

- `backend/src/sockets/watchParty.ts` — create/join parties, playback sync, chat (sanitized), host migration; connections authenticated with JWT

### Security posture (do not regress)

- Helmet + CSP tailored for embeds/fonts/images
- CORS allowlist from `CORS_ALLOWED_ORIGINS`
- Global rate limit + tighter limits on auth and proxies
- SSRF guards on proxy destinations (`publicDestination.ts`)
- Secrets and third-party API keys server-side only
- Swagger disabled in production
- Winston logging → `backend/logs/` (no `console.log` for production diagnostics)

---

## TypeScript

| Package | Notes |
|---------|--------|
| Frontend | `strict: true`, `noUnusedLocals`, `noUnusedParameters` |
| Backend | `strict: true`, emits to `backend/dist`, looser unused checks |

Prefer `type` over `interface` on the backend except for public/shared API shapes. Prefer functional modules over classes. Always `async/await` with explicit error handling.

---

## Tailwind / UI

Multi-theme system (p-stream–compatible) via `tailwindcss-themer`:

- **Theme definitions:** root `themes/` (`default.ts` = **CINEFLIX brand**, `list/*`, `all.ts`)
- **Default theme:** CINEFLIX red (`#E50914`) accents + dark-blue surfaces (`#0A0A1F` / `#13132B`). Absolute default for all users (`theme: null` → `.theme-default`).
- **Former p-stream default** lives as selectable **`dark-slate`** (`themes/list/dark-slate.ts`).
- **Runtime:** `src/stores/theme` — `ThemeProvider` applies `.theme-{id}`; persists in localStorage (`__CINEFLIX::theme`)
- **Settings:** Account → Appearance (`ThemePicker`)
- **Brand logo:** `BrandLogo` component — CSS-mask on `public/cineflix-logo.png` so fill follows `text-type-logo` / theme accent. Do not use PNG-embedded “SVG converter” files for theming.
- **Semantic color tokens (use these — never hardcode brand hex):**
  - Surfaces: `bg-background-main`, `bg-background-secondary`, `bg-modal-background`
  - Brand CTAs: `bg-buttons-purple`, `hover:bg-buttons-purpleHover`, `text-type-logo` (values are red under default theme)
  - Text: `text-type-emphasis`, `text-type-secondary`, `text-type-dimmed`, `text-type-danger`
  - Search: `bg-search-background`, `text-search-text`
- **Legacy bridge (temporary):** `netflix-*` / `brand-*` / `surface-*` may still exist in Tailwind config — do not add new usages
- **Animations:** `fade-in`, `slide-up`, `shimmer`, `fade-in-up`, `stagger-fade`
- Prefer design tokens over raw hex

UI rules:

- Mobile-first responsive layouts
- WCAG 2.1 AA contrast; touch targets ≥ 44×44px
- Semantic HTML (`header`, `nav`, `main`, `section`, `footer`)
- Animate compositor-friendly properties only (`transform`, `opacity`, `clip-path`)

---

## Testing

- **Runner:** Vitest + jsdom; setup at `src/__tests__/setup.ts`
- **Include:** `src/**/*.{test,spec}.{ts,tsx}`
- **Exclude:** `backend` (no Vitest suite in backend package today)
- **Coverage include:** `src/services/**`, `src/hooks/**`, `src/utils/**`
- **Thresholds:** 80% statements / functions / lines; 70% branches

When changing services, hooks, or utils: add or update tests; run `npm run test` (or targeted file) before claiming done.

---

## CI / Docker

**`.github/workflows/ci.yml`** (push/PR to `main`/`master`):

1. **Frontend:** `npm ci` → lint → `tsc --noEmit` → `test:coverage` → Vite build  
2. **Backend:** `npm ci` → lint → `tsc --noEmit` → `tsc` build  
3. **Docker:** image build smoke test on push only (after frontend + backend pass)

**Dockerfile:** multi-stage — build frontend + backend, run Node production image as non-root, serve backend (static frontend assets from `dist/`), healthcheck on `/health`, `EXPOSE 3001`.

---

## Commit Conventions

```
<type>: <short description>
```

Common types: `feat`, `fix`, `ui`, `refactor`, `docs`, `perf`, `auth`, `api`, `security`, `test`, `chore`, `ci`.

---

## Agent Conventions

1. **Scope:** Default to frontend + backend only. Do not refactor or document sibling/gitignored subprojects unless asked.
2. **No secrets:** Never hardcode API keys, JWT secrets, or OAuth secrets. Use env vars; keep third-party keys on the backend.
3. **Auth model:** Cookie-only JWT. Do not reintroduce localStorage bearer tokens.
4. **Logging:** Backend → Winston. Avoid `console.log` in production paths (dev-only diagnostics OK if intentional).
5. **Immutability:** Prefer new objects/arrays over in-place mutation (especially React state and Zustand updates).
6. **API shape:** Keep backend responses consistent: `{ success, data?, error?, message? }`.
7. **Watch path:** Prefer extending `SmartPlayerPage` / provider engine / cinepro-adapter over resurrecting legacy `WatchPage` routing unless explicitly requested.
8. **Security:** Preserve rate limits, `protect` middleware, and SSRF checks on any proxy work.
9. **Verify:** After non-trivial changes run the relevant type-check, lint, and tests for the package you touched.
