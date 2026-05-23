# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CINEFLIX is a full-stack MERN streaming platform. Three separate packages share this repo:

- **`/` (root)** — React 18 + TypeScript + Vite frontend (SPA), proxied via Vite dev server
- **`/backend`** — Express + TypeScript API server with MongoDB (Mongoose), JWT auth, Socket.IO
- **`/mobile`** — React Native (Expo SDK 54) mobile app with NativeWind/Tailwind

The frontend and backend have independent `package.json` files and install separately. The root `npm run dev` runs both concurrently.

## Commands

```bash
# Development (runs frontend + backend concurrently)
npm run dev

# Frontend only (Vite, port 3000, proxies /api to localhost:3001)
npm run dev:frontend

# Backend only (tsx watch with hot reload, port 3001)
npm run dev:backend

# Build (builds backend first, then frontend via Vite)
npm run build

# Lint (ESLint, .ts/.tsx, zero warnings tolerated)
npm run lint

# Type-check frontend (no emit)
npx tsc --noEmit

# Type-check backend (no emit)
cd backend && npx tsc --noEmit

# Tests (Vitest, jsdom, globals enabled)
npm run test                          # single run
npm run test:ui                       # watch/interactive mode
npm run test:coverage                 # with V8 coverage

# Run a single test file
npx vitest run src/__tests__/SomeFile.test.ts

# Run tests matching a pattern
npx vitest run -t "test name pattern"

# Mobile (Expo)
cd mobile && npm start
cd mobile && npm run ios
cd mobile && npm run android
```

## Architecture

### Frontend (`/src`)

- **Pages** (`/src/pages`) — 15 route-level components registered in `App.tsx` via React Router
- **Components** (`/src/components`) — organized by feature: `browse/`, `DetailPage/`, `WatchPage/`, `Home/`, `MyList/`, `auth/`, `collections/`, `layout/`, `feedback/`
- **Services** (`/src/services`) — API/data layer. `tmdb.ts` is the TMDB API client (largest file). `api.ts` talks to the Express backend. `rivestreamService.ts` and `smashystream.ts` integrate streaming sources.
- **Contexts** (`/src/contexts`) — `AuthContext` (JWT auth state), `ToastContext` (notifications)
- **Hooks** (`/src/hooks`) — custom hooks: `useMyList`, `useWatchParty`, `useHoverIntent`, `useScreenSize`, `useAccountSettings`
- **Types** (`/src/types`) — shared TypeScript types (`index.ts`, `browse.ts`, `myList.ts`)
- **Path aliases** — `@/*` maps to `./src/*` (also `@/components/*`, `@/pages/*`, `@/services/*`, `@/types/*`, `@/utils/*`, `@/hooks/*`)

### Backend (`/backend`)

- Express server at `backend/src/server.ts`
- Controllers → Routes → Models pattern (`authController`, `myListController`, `collectionsController`, `preferencesController`, `watchedEpisodeController`)
- Mongoose models: `User`, `MyList`, `Collection`, `Preferences`, `WatchedEpisode`
- JWT auth via `authMiddleware.ts`
- Socket.IO for real-time watch parties (`backend/src/sockets/`)
- Swagger API docs at `/api-docs`
- Winston logging to `backend/logs/`

### External APIs

- **TMDB API v3** — movie/TV metadata (routed through backend `tmdbRoutes.ts` with caching)
- **RiveStream, SmashyStream, 111movies** — streaming source providers

## TypeScript

All three packages have `strict: true`. The frontend additionally enforces `noUnusedLocals` and `noUnusedParameters`.

## Tailwind Theme

Custom color tokens are defined in `tailwind.config.js` — use `netflix-*`, `brand-*`, `glass-*`, and `surface-*` color scales instead of raw hex values. Custom animations: `fade-in`, `slide-up`, `shimmer`, `fade-in-up`, `stagger-fade`.

## Test Coverage Thresholds

Coverage applies to `src/services/**`, `src/hooks/**`, `src/utils/**`: 80% statements, 70% branches, 80% functions, 80% lines.

## CI Pipeline (`.github/workflows/ci.yml`)

Runs on push/PR to `main`/`master`:
1. **Frontend**: lint → type-check → test → Vite build
2. **Backend**: type-check → tsc build
3. **Docker**: build image (push only, after both pass)

## Commit Conventions

Prefix with type: `feat:`, `fix:`, `ui:`, `refactor:`, `docs:`, `perf:`, `auth:`, `api:`.

## Conventions from Agent Rules

- **Mobile-first, responsive design** is mandatory; WCAG 2.1 AA contrast; min 44x44px touch targets
- **Semantic HTML** — use `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` over generic divs
- **Animate compositor-friendly properties only** — `transform`, `opacity`, `clip-path`; avoid animating `width`, `height`, `top`, `left`
- **Backend**: prefer `type` over `interface` (except public APIs); functional patterns over classes; `async/await` over raw Promises
- **No `console.log`** in production code — use Winston (backend) or proper logging
- **No hardcoded secrets** — always use environment variables
