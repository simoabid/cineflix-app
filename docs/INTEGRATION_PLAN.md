# P-Stream Integration Plan — Full-Stack AI Agent Guide

> **Purpose:** Guide an AI agent (like Codebuff/Claude/Cursor) to extract and integrate the `@p-stream/providers` scraping library and the React video player from the p-stream ecosystem into an existing React/Next.js project.
>
> **Target Project:** A React/Next.js app with an existing backend and a companion browser extension for CORS bypass.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Source Repository Structure](#2-source-repository-structure)
3. [Phase 1: Integrate Providers Library](#3-phase-1-integrate-providers-library)
4. [Phase 2: Integrate Video Player Store](#4-phase-2-integrate-video-player-store)
5. [Phase 3: Build Video Player Display & Components](#5-phase-3-build-video-player-display--components)
6. [Phase 4: Build Browser Extension](#6-phase-4-build-browser-extension)
7. [Phase 5: Wire Up Backend Endpoints](#7-phase-5-wire-up-backend-endpoints)
8. [File Extraction Map](#8-file-extraction-map)
9. [Configuration Reference](#9-configuration-reference)
10. [Testing the Integration](#10-testing-the-integration)
11. [AI Agent Prompt Cookbook](#11-ai-agent-prompt-cookbook)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YOUR APPLICATION                                   │
│                                                                           │
│  ┌────────────────────────────┐     ┌────────────────────────────────┐   │
│  │     MediaPlayer Page        │     │     Providers Module            │   │
│  │                              │     │                                │   │
│  │  ┌──────────────────────┐  │     │  makeProviders({               │   │
│  │  │   Player Component    │  │     │    fetcher, proxiedFetcher,    │   │
│  │  │                      │  │     │    target, ...                 │   │
│  │  │  ┌────────────────┐  │  │     │  }) → ProviderControls         │   │
│  │  │  │  VideoElement   │  │  │     │                                │   │
│  │  │  │  (HLS.js/MP4)   │  │  │     │  .runAll({ media, events })   │   │
│  │  │  └────────────────┘  │  │     │    → RunOutput { stream }       │   │
│  │  │                      │  │     └────────────────────────────────┘   │
│  │  │  ┌────────────────┐  │  │                                          │
│  │  │  │ PlayerControls │  │  │     ┌────────────────────────────────┐   │
│  │  │  │ (UI + State)   │  │  │     │     Player Store (Zustand)       │   │
│  │  │  └────────────────┘  │  │     │                                │   │
│  │  └──────────────────────┘  │     │  SourceSlice    PlayingSlice   │   │
│  │                            │     │  ProgressSlice  DisplaySlice   │   │
│  │  ┌──────────────────────┐  │     │  InterfaceSlice CastingSlice   │   │
│  │  │   ScrapingUI          │  │     │  Thumbnails    SkipSegments   │   │
│  │  │   (progress display)  │  │     └────────────────────────────────┘   │
│  │  └──────────────────────┘  │                                          │
│  └────────────────────────────┘     ┌────────────────────────────────┐   │
│                                      │     Extension Fetcher           │   │
│  ┌────────────────────────────┐     │     (communicates with          │   │
│  │     Backend Endpoints      │     │      browser extension)         │   │
│  │     (progress, bookmarks)  │     └────────────────────────────────┘   │
│  └────────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User clicks media → navigate to /media/{tmdbId}/{season}/{episode}
2. Page fetches TMDB metadata → DetailedMeta
3. Converts to ScrapeMedia + PlayerMeta
4. Calls providers.runAll({ media, events })
5. Providers run 40+ scrapers in rank order:
   a. Source scrapers search content sites
   b. Return embeds (embed URLs) or direct streams
   c. Embed scrapers extract stream URLs
   d. Stream validated for playability
6. RunOutput returned { sourceId, embedId?, stream }
7. Stream converted to SourceSliceSource (HLS or file qualities)
8. DisplayInterface loads the stream via HLS.js or <video>
9. User watches → progress tracked → UI state updated via Zustand
10. On error → retry next source; on close → save progress
```

---

## 2. Source Repository Structure

The source project (`p-stream`) contains everything needed. Here's the relevant file tree:

```
providers/                          ← The scraping engine (package @p-stream/providers)
├── src/
│   ├── index.ts                    ← Public API exports
│   ├── entrypoint/
│   │   ├── declare.ts              ← makeProviders() entrypoint
│   │   ├── builder.ts              ← buildProviders() builder
│   │   ├── controls.ts             ← ProviderControls interface
│   │   ├── providers.ts            ← Built-in registries
│   │   └── utils/
│   │       ├── targets.ts          ← Flags, targets, feature maps
│   │       ├── media.ts            ← ScrapeMedia types
│   │       ├── events.ts           ← Event types
│   │       └── meta.ts             ← Metadata helpers
│   ├── providers/
│   │   ├── base.ts                 ← Sourcerer, Embed types + factories
│   │   ├── streams.ts              ← Stream, FileBasedStream, HlsBasedStream
│   │   ├── captions.ts             ← Caption types + language utils
│   │   ├── get.ts                  ← ProviderList + duplicate checking
│   │   ├── all.ts                  ← Registry of all 45 sources + 70 embeds
│   │   └── sources/                ← 45 source scraper implementations
│   │       ├── dopebox/index.ts
│   │       ├── lookmovie/index.ts
│   │       ├── debrid/index.ts
│   │       └── ... (40+ more)
│   │   └── embeds/                 ← 70+ embed scraper implementations
│   │       ├── upcloud.ts
│   │       ├── vidcloud.ts
│   │       └── ... (50+ more)
│   ├── runners/
│   │   ├── runner.ts               ← runAllProviders() main pipeline
│   │   └── individualRunner.ts     ← Single scraper runners
│   ├── fetchers/
│   │   ├── types.ts                ← Fetcher, UseableFetcher types
│   │   ├── common.ts               ← makeFetcher(), makeFullUrl()
│   │   ├── standardFetch.ts        ← makeStandardFetcher()
│   │   ├── simpleProxy.ts          ← makeSimpleProxyFetcher()
│   │   ├── fetch.ts                ← FetchLike types
│   │   └── body.ts                 ← Body serialization
│   └── utils/
│       ├── context.ts              ← ScrapeContext types
│       ├── proxy.ts                ← Proxy setup, M3U8 proxy utilities
│       ├── errors.ts               ← NotFoundError
│       ├── valid.ts                ← Stream validation
│       ├── playlist.ts             ← HLS base64 encoding
│       ├── list.ts                 ← Reorder utilities
│       ├── tmdb.ts                 ← TMDB name fetcher
│       └── browser.ts              ← Browser detection

p-stream/src/                        ← The main React app (player lives here)
├── components/player/
│   ├── display/
│   │   ├── displayInterface.ts      ← DisplayInterface contract + events
│   │   ├── base.ts                  ← makeVideoElementDisplayInterface() ← YOU NEED TO CREATE THIS
│   │   └── chromecast.ts           ← Chromecast display
│   ├── hooks/
│   │   ├── usePlayer.ts            ← Main player hook
│   │   ├── usePlayerMeta.ts        ← Meta → PlayerMeta converter
│   │   ├── useInitializePlayer.ts  ← Display init hook
│   │   ├── useShouldShowControls.tsx
│   │   ├── useSkipTime.ts          ← Skip segments
│   │   └── useCaptions.ts
│   ├── internals/
│   │   ├── VideoContainer.tsx       ← Renders <video> + HLS.js
│   │   ├── AutoSkipSegments.tsx
│   │   ├── ProgressSaver.tsx
│   │   └── KeyboardEvents.tsx
│   ├── atoms/                       ← 30+ UI atoms (buttons, sliders, etc.)
│   ├── overlays/                    ← PauseOverlay, etc.
│   ├── settings/                    ← Settings panels (quality, captions, etc.)
│   ├── base/                        ← Layout wrappers (Container, TopControls, etc.)
│   ├── utils/
│   │   ├── captions.ts             ← Caption conversion utilities
│   │   └── convertRunoutputToSource.ts ← Stream → SourceSliceSource
│   └── Player.tsx                   ← Main Player compound component
├── stores/player/
│   ├── store.ts                    ← Zustand store (all slices combined)
│   ├── slices/
│   │   ├── types.ts                ← AllSlices + MakeSlice types
│   │   ├── source.ts               ← Core source/metadata/captions state
│   │   ├── playing.ts              ← Play/pause/loading state
│   │   ├── progress.ts             ← Time/duration/buffered
│   │   ├── display.ts              ← DisplayInterface lifecycle
│   │   ├── interface.ts            ← UI state (fullscreen, seeking, etc.)
│   │   ├── casting.ts              ← Chromecast state
│   │   ├── thumbnails.ts           ← Preview thumbnails
│   │   └── skipSegments.ts         ← SponsorBlock segments
│   └── utils/
│       └── qualities.ts            ← Quality selection logic
├── hooks/
│   └── useProviderScrape.tsx       ← Scraping orchestration hook
├── pages/
│   ├── PlayerView.tsx              ← Player page with state machine
│   └── parts/player/
│       ├── PlayerPart.tsx          ← Player layout component
│       ├── ScrapingPart.tsx        ← Scraping progress UI
│       ├── MetaPart.tsx            ← Metadata fetcher
│       ├── ResumePart.tsx          ← Resume prompt
│       └── ... (error parts)
├── backend/
│   ├── providers/
│   │   ├── providers.ts            ← getProviders() factory
│   │   └── fetchers.ts             ← Extension+proxy fetchers
│   └── extension/
│       └── messaging.ts            ← Extension message passing
└── setup/
    ├── config.ts                   ← Runtime configuration
    └── App.tsx                     ← Route setup (PlayerView routes)

pstream-extension/                   ← Browser extension for CORS bypass
├── manifest.json
├── src/
│   ├── background.ts               ← Background service worker
│   ├── popup.tsx                   ← Extension popup UI
│   ├── background/messages/
│   │   ├── makeRequest.ts          ← Proxied fetch handler
│   │   └── prepareStream.ts        ← DNR rule setup for stream domains
│   └── utils/
│       ├── declarativeNetRequest.ts ← DNR rule management
│       ├── fetcher.ts              ← Fetch with headers
│       └── storage.ts              ← Chrome storage wrapper
```

---

## 3. Phase 1: Integrate Providers Library

### 3.1 Install the Package

```bash
# From GitHub (recommended — gets latest scrapers)
npm install github:p-stream/providers#production

# Or from npm if published
npm install @p-stream/providers

# Required peer dependencies for your project
npm install cheerio fuse.js hls-parser iso-639-1 form-data cookie crypto-js nanoid
```

### 3.2 Complete Public API Reference

The library exports these types and functions:

```typescript
// === TYPES ===

// Stream types
Stream        // FileBasedStream | HlsBasedStream
FileBasedStream  // { type: 'file', qualities: Record<Qualities, { url }> }
HlsBasedStream   // { type: 'hls', playlist: string }
Qualities     // 'unknown' | '360' | '480' | '720' | '1080' | '4k'

// Scraper types
SourcererOutput  // { embeds: SourcererEmbed[], stream?: Stream[] }
EmbedOutput      // { stream: Stream[] }
RunOutput        // { sourceId: string, embedId?: string, stream: Stream }

// Context types
MovieScrapeContext  // { fetcher, proxiedFetcher, features, progress(), media: MovieMedia }
ShowScrapeContext   // { fetcher, proxiedFetcher, features, progress(), media: ShowMedia }
EmbedScrapeContext  // { fetcher, proxiedFetcher, features, progress(), url: string }

// Media types
ScrapeMedia     // MovieMedia | ShowMedia
MovieMedia      // { type: 'movie', title, releaseYear, tmdbId, imdbId? }
ShowMedia       // { type: 'show', title, releaseYear, tmdbId, imdbId?, episode, season }

// Event types
FullScraperEvents  // { init?, start?, update?, discoverEmbeds? }
UpdateEvent        // { id, percentage, status, error?, reason? }

// Target/Flag types
Targets        // 'browser' | 'browser-extension' | 'native' | 'any'
Flags          // 'cors-allowed' | 'ip-locked' | 'cf-blocked' | 'proxy-blocked' | 'mkv-required'

// Fetcher types
Fetcher              // Low-level: (url, defaultedOps) => Promise<FetcherResponse>
UseableFetcher       // Scraper-facing: <T>(url, ops?) => Promise<T>
FetcherOptions       // { baseUrl?, headers?, query?, method?, body?, readHeaders?, credentials? }

// Control interface
ProviderControls  // { runAll(), runSourceScraper(), runEmbedScraper(), getMetadata(), listSources(), listEmbeds() }

// === FUNCTIONS ===

// Main entrypoints
makeProviders(options: ProviderMakerOptions): ProviderControls
buildProviders(): ProviderBuilder

// Fetcher factories
makeStandardFetcher(fetch: FetchLike): Fetcher
makeSimpleProxyFetcher(proxyUrl: string, fetch: FetchLike): Fetcher

// Provider registries
getBuiltinSources(): Sourcerer[]
getBuiltinEmbeds(): Embed[]
getBuiltinExternalSources(): Sourcerer[]

// Constants
flags       // { CORS_ALLOWED, IP_LOCKED, CF_BLOCKED, PROXY_BLOCKED, MKV_REQUIRED }
targets     // { BROWSER, BROWSER_EXTENSION, NATIVE, ANY }

// Proxy utilities
setM3U8ProxyUrl(url: string): void
getM3U8ProxyUrl(): string
createM3U8ProxyUrl(url: string, features?, headers?): string
updateM3U8ProxyUrl(url: string): string

// Caption utilities
labelToLanguageCode(label: string): string | null

// Error classes
NotFoundError  // extends Error — thrown when no stream found (expected, not a failure)
```

### 3.3 Create Provider Factory

```typescript
// src/lib/providers/index.ts
import {
  makeProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  targets,
  type Fetcher,
} from "@p-stream/providers";

// Communicate with browser extension
function makeExtensionFetcher(): Fetcher {
  return async (url, ops) => {
    const result = await sendExtensionRequest({
      url,
      method: ops.method,
      headers: ops.headers,
      body: ops.body,
      // See Phase 4 for extension message passing implementation
    });
    if (!result?.success) throw new Error(`Extension error: ${result?.error}`);
    return {
      body: result.response.body,
      finalUrl: result.response.finalUrl,
      statusCode: result.response.statusCode,
      headers: new Headers(result.response.headers),
    };
  };
}

function hasExtension(): boolean {
  return Boolean(typeof window !== "undefined" && window.__EXTENSION_ACTIVE__);
}

function isDesktopApp(): boolean {
  return Boolean(typeof window !== "undefined" && window.__DESKTOP_APP__);
}

export function getProviders() {
  // Desktop app → native target (no restrictions, MKV support)
  if (isDesktopApp()) {
    return makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeExtensionFetcher(),
      target: targets.NATIVE,
      consistentIpForRequests: true,
    });
  }

  // Extension active → browser-extension target (all sources)
  if (hasExtension()) {
    return makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeExtensionFetcher(),
      target: targets.BROWSER_EXTENSION,
      consistentIpForRequests: true,
    });
  }

  // Browser only → CORS-limited, with proxy fallback
  return makeProviders({
    fetcher: makeStandardFetcher(fetch),
    proxiedFetcher: makeSimpleProxyFetcher("https://your-cors-proxy.com", fetch),
    target: targets.BROWSER,
  });
}
```

### 3.4 Create Scraping Hook

```typescript
// src/hooks/useScrape.ts
import { useState, useCallback } from "react";
import type {
  ScrapeMedia,
  RunOutput,
  FullScraperEvents,
} from "@p-stream/providers";
import { getProviders } from "@/lib/providers";

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status: "failure" | "pending" | "notfound" | "success" | "waiting";
  reason?: string;
  error?: any;
  percentage: number;
}

export interface ScrapingItems {
  id: string;
  children: string[];
}

export function useScrape() {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const [isScraping, setIsScraping] = useState(false);

  const buildEvents = useCallback(
    (sourceMetas: { id: string; name: string }[]): FullScraperEvents => ({
      init: (evt) => {
        setSources(
          evt.sourceIds.reduce<Record<string, ScrapingSegment>>((acc, id) => {
            const meta = sourceMetas.find((s) => s.id === id);
            acc[id] = {
              name: meta?.name ?? id,
              id,
              status: "waiting",
              percentage: 0,
            };
            return acc;
          }, {})
        );
        setSourceOrder(evt.sourceIds.map((id) => ({ id, children: [] })));
      },
      start: (id) => {
        setCurrentSource(id);
        setSources((prev) => {
          // Mark previous source as success if it was pending
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            if (updated[key].status === "pending") {
              updated[key] = { ...updated[key], status: "success" };
            }
          });
          if (updated[id]) updated[id] = { ...updated[id], status: "pending" };
          return updated;
        });
      },
      update: (evt) => {
        setSources((prev) => {
          if (!prev[evt.id]) return prev;
          return {
            ...prev,
            [evt.id]: {
              ...prev[evt.id],
              status: evt.status as ScrapingSegment["status"],
              percentage: evt.percentage,
              reason: evt.reason as string | undefined,
              error: evt.error,
            },
          };
        });
      },
      discoverEmbeds: (evt) => {
        setSources((prev) => {
          const updated = { ...prev };
          evt.embeds.forEach((embed, i) => {
            updated[embed.id] = {
              name: `${evt.sourceId} embed ${i + 1}`,
              id: embed.id,
              embedId: embed.embedScraperId,
              status: "waiting",
              percentage: 0,
            };
          });
          return updated;
        });
        setSourceOrder((prev) => {
          const source = prev.find((s) => s.id === evt.sourceId);
          if (source) {
            source.children = evt.embeds.map((e) => e.id);
          }
          return [...prev];
        });
      },
    }),
    []
  );

  const startScraping = useCallback(
    async (
      media: ScrapeMedia,
      options?: {
        sourceOrder?: string[];
        embedOrder?: string[];
        startFromSourceId?: string;
      }
    ): Promise<RunOutput | null> => {
      setIsScraping(true);
      setCurrentSource(undefined);
      setSources({});
      setSourceOrder([]);

      try {
        const providers = getProviders();
        const allSources = providers.listSources();
        const events = buildEvents(allSources);

        const output = await providers.runAll({
          media,
          sourceOrder: options?.sourceOrder,
          embedOrder: options?.embedOrder,
          events,
        });

        return output;
      } finally {
        setIsScraping(false);
      }
    },
    [buildEvents]
  );

  return {
    startScraping,
    sources,
    sourceOrder,
    currentSource,
    isScraping,
  };
}
```

### 3.5 Consuming the RunOutput

```typescript
// src/lib/providers/streamUtils.ts
import type { Stream } from "@p-stream/providers";

export type SourceQuality = "unknown" | "360" | "480" | "720" | "1080" | "4k";

export type SourceSliceSource =
  | { type: "file"; qualities: Partial<Record<SourceQuality, { type: "mp4"; url: string }>> }
  | { type: "hls"; url: string };

export interface CaptionListItem {
  id: string;
  language: string;
  url: string;
  type?: string;
  needsProxy: boolean;
}

/**
 * Convert provider RunOutput stream into our internal format
 */
export function convertStreamToSource(output: { stream: Stream }): SourceSliceSource {
  if (output.stream.type === "hls") {
    return {
      type: "hls",
      url: output.stream.playlist,
    };
  }
  if (output.stream.type === "file") {
    const qualities: SourceSliceSource["qualities"] = {};
    Object.entries(output.stream.qualities).forEach(([quality, file]) => {
      if (file.type === "mp4") {
        qualities[quality as SourceQuality] = { type: "mp4", url: file.url };
      }
    });
    return { type: "file", qualities };
  }
  throw new Error("Unknown stream type");
}

/**
 * Convert provider captions to our internal format
 */
export function convertCaptions(
  captions: Stream["captions"]
): CaptionListItem[] {
  return captions.map((c) => ({
    id: c.id,
    language: c.language,
    url: c.url,
    type: c.type,
    needsProxy: c.hasCorsRestrictions,
  }));
}

/**
 * Convert DetailedMeta to ScrapeMedia for the providers
 */
export function metaToScrapeMedia(meta: {
  type: "movie" | "show";
  title: string;
  tmdbId: string;
  imdbId?: string;
  releaseYear: number;
  season?: { number: number; tmdbId: string; title: string };
  episode?: { number: number; tmdbId: string; title: string };
}) {
  if (meta.type === "show") {
    if (!meta.episode || !meta.season) throw new Error("Missing show data");
    return {
      title: meta.title,
      releaseYear: meta.releaseYear,
      tmdbId: meta.tmdbId,
      imdbId: meta.imdbId,
      type: "show" as const,
      episode: { number: meta.episode.number, tmdbId: meta.episode.tmdbId },
      season: {
        number: meta.season.number,
        tmdbId: meta.season.tmdbId,
        title: meta.season.title,
      },
    };
  }
  return {
    title: meta.title,
    releaseYear: meta.releaseYear,
    tmdbId: meta.tmdbId,
    imdbId: meta.imdbId,
    type: "movie" as const,
  };
}
```

---

## 4. Phase 2: Integrate Video Player Store

### 4.1 Install Dependencies

```bash
npm install zustand immer react-router-dom react-use
```

### 4.2 Create Player Store

```typescript
// src/stores/player/slices/types.ts
import type { StateCreator } from "zustand";
import type { CastingSlice } from "./casting";
import type { DisplaySlice } from "./display";
import type { InterfaceSlice } from "./interface";
import type { PlayingSlice } from "./playing";
import type { ProgressSlice } from "./progress";
import type { SkipSegmentsSlice } from "./skipSegments";
import type { SourceSlice } from "./source";
import type { ThumbnailSlice } from "./thumbnails";

export type AllSlices = InterfaceSlice &
  PlayingSlice &
  ProgressSlice &
  SourceSlice &
  DisplaySlice &
  CastingSlice &
  ThumbnailSlice &
  SkipSegmentsSlice;

export type MakeSlice<Slice> = StateCreator<
  AllSlices,
  [["zustand/immer", never]],
  [],
  Slice
>;
```

```typescript
// src/stores/player/slices/source.ts
// Copy from p-stream/src/stores/player/slices/source.ts
// This is the MOST IMPORTANT slice — it manages:
// - Player status (IDLE → RESUME → SCRAPING → PLAYING → PLAYBACK_ERROR)
// - Metadata (title, tmdbId, season, episode)
// - Stream source (HLS URL or MP4 qualities)
// - Captions (selection, translation, external scraping)
// - Quality switching
// - Failed source/embed tracking for smart retry
// - Resume functionality

// Key types to extract:
export const playerStatus = {
  IDLE: "idle",
  RESUME: "resume",
  SCRAPING: "scraping",
  PLAYING: "playing",
  SCRAPE_NOT_FOUND: "scrapeNotFound",
  PLAYBACK_ERROR: "playbackError",
} as const;

export type PlayerStatus = (typeof playerStatus)[keyof typeof playerStatus];

export interface PlayerMeta {
  type: "movie" | "show";
  title: string;
  tmdbId: string;
  imdbId?: string;
  releaseYear: number;
  poster?: string;
  overview?: string;
  episodes?: PlayerMetaEpisode[];
  episode?: PlayerMetaEpisode;
  season?: { number: number; tmdbId: string; title: string };
}

export interface PlayerMetaEpisode {
  number: number;
  tmdbId: string;
  title: string;
  air_date?: string;
  overview?: string;
}

// Export the createSourceSlice function with ALL methods
// (setSource, setMeta, switchQuality, addFailedSource, etc.)
```

**Extract these files from p-stream (copy verbatim):**
- `stores/player/slices/types.ts`
- `stores/player/slices/source.ts`
- `stores/player/slices/playing.ts`
- `stores/player/slices/progress.ts`
- `stores/player/slices/display.ts`
- `stores/player/slices/interface.ts`
- `stores/player/slices/casting.ts`
- `stores/player/slices/thumbnails.ts`
- `stores/player/slices/skipSegments.ts`
- `stores/player/utils/qualities.ts`
- `stores/player/store.ts`

### 4.3 Create the Combined Store

```typescript
// src/stores/player/store.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createCastingSlice } from "./slices/casting";
import { createDisplaySlice } from "./slices/display";
import { createInterfaceSlice } from "./slices/interface";
import { createPlayingSlice } from "./slices/playing";
import { createProgressSlice } from "./slices/progress";
import { createSkipSegmentsSlice } from "./slices/skipSegments";
import { createSourceSlice } from "./slices/source";
import { createThumbnailSlice } from "./slices/thumbnails";
import type { AllSlices } from "./slices/types";

export const usePlayerStore = create(
  immer<AllSlices>((...a) => ({
    ...createInterfaceSlice(...a),
    ...createProgressSlice(...a),
    ...createPlayingSlice(...a),
    ...createSourceSlice(...a),
    ...createDisplaySlice(...a),
    ...createCastingSlice(...a),
    ...createThumbnailSlice(...a),
    ...createSkipSegmentsSlice(...a),
  }))
);
```

### 4.4 Create usePlayer Hook

```typescript
// src/hooks/usePlayer.ts
import { useCallback } from "react";
import { playerStatus, type PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { useInitializePlayer } from "./useInitializePlayer";

export function usePlayer() {
  const setStatus = usePlayerStore((s) => s.setStatus);
  const setMeta = usePlayerStore((s) => s.setMeta);
  const setSource = usePlayerStore((s) => s.setSource);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const status = usePlayerStore((s) => s.status);
  const meta = usePlayerStore((s) => s.meta);
  const reset = usePlayerStore((s) => s.reset);
  const { init } = useInitializePlayer();

  const playMedia = useCallback(
    (source: any, captions: any[], sourceId: string | null, startAt?: number) => {
      setSource(source, captions, startAt ?? 0);
      setSourceId(sourceId);
      setStatus(playerStatus.PLAYING);
      init();
    },
    [setSource, setSourceId, setStatus, init]
  );

  return {
    meta,
    reset,
    status,
    setStatus,
    setMeta,
    playMedia,
    setScrapeNotFound: () => setStatus(playerStatus.SCRAPE_NOT_FOUND),
    setScrapeStatus: () => setStatus(playerStatus.SCRAPING),
  };
}
```

---

## 5. Phase 3: Build Video Player Display & Components

### 5.1 Create DisplayInterface

```typescript
// src/components/player/display/displayInterface.ts
// Copy from p-stream/src/components/player/display/displayInterface.ts
// This is the contract that all video renderers must implement

export interface DisplayInterfaceEvents {
  play: void;
  pause: void;
  fullscreen: boolean;
  volumechange: number;
  time: number;
  duration: number;
  buffered: number;
  loading: boolean;
  qualities: string[];
  changedquality: string | null;
  audiotracks: AudioTrack[];
  changedaudiotrack: AudioTrack | null;
  playbackrate: number;
  error: DisplayError;
}

export interface DisplayInterface extends Listener<DisplayInterfaceEvents> {
  play(): void;
  pause(): void;
  load(ops: qualityChangeOptions): void;
  changeQuality(automatic: boolean, preferred: string | null): void;
  changeAudioTrack(track: AudioTrack): void;
  processVideoElement(video: HTMLVideoElement): void;
  processContainerElement(container: HTMLElement): void;
  toggleFullscreen(): void;
  togglePictureInPicture(): void;
  setSeeking(active: boolean): void;
  setVolume(vol: number): void;
  setTime(t: number): void;
  destroy(): void;
  startAirplay(): void;
  setPlaybackRate(rate: number): void;
  setMeta(meta: DisplayMeta): void;
  setCaption(caption: DisplayCaption | null): void;
  getType(): "web" | "casting";
  getCaptionList(): any[];
}
```

### 5.2 Create WebDisplay Implementation (HLS.js + HTMLVideoElement)

```typescript
// src/components/player/display/webDisplay.ts
import Hls from "hls.js";
import type { DisplayInterface, DisplayInterfaceEvents, DisplayError, qualityChangeOptions } from "./displayInterface";
import { TypedEmitter } from "@/utils/events"; // Simple typed event emitter

export class WebDisplay extends TypedEmitter<DisplayInterfaceEvents> implements DisplayInterface {
  private video: HTMLVideoElement | null = null;
  private container: HTMLElement | null = null;
  private hls: Hls | null = null;
  private currentTime = 0;
  private currentDuration = 0;
  private pollInterval: number | null = null;

  processVideoElement(video: HTMLVideoElement): void {
    this.video = video;
    this.attachVideoListeners();
  }

  processContainerElement(container: HTMLElement): void {
    this.container = container;
  }

  load(ops: qualityChangeOptions): void {
    if (!this.video) return;
    this.destroyHls();

    if (!ops.source) {
      this.video.src = "";
      return;
    }

    if (ops.source.type === "hls") {
      this.loadHlsStream(ops.source.url);
    } else if (ops.source.type === "mp4") {
      this.loadMp4Stream(ops.source.url);
    }

    // Start polling for time/duration updates
    this.startPolling();
  }

  private loadHlsStream(url: string): void {
    if (!this.video) return;
    if (Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.loadSource(url);
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.emit("qualities", this.hls!.levels.map((l, i) => `${i}:${l.height}p`));
      });
      this.hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          this.emit("error", {
            errorName: "HLS Error",
            type: "hls",
            message: data.type,
            hls: { details: data.details, fatal: data.fatal, type: data.type },
          });
        }
      });
    } else if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
      this.video.src = url; // Native Safari HLS
    }
  }

  private loadMp4Stream(url: string): void {
    if (!this.video) return;
    this.video.src = url;
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private attachVideoListeners(): void {
    if (!this.video) return;
    this.video.addEventListener("play", () => this.emit("play"));
    this.video.addEventListener("pause", () => this.emit("pause"));
    this.video.addEventListener("volumechange", () =>
      this.emit("volumechange", this.video!.volume)
    );
    this.video.addEventListener("waiting", () => this.emit("loading", true));
    this.video.addEventListener("playing", () => this.emit("loading", false));
    this.video.addEventListener("error", () =>
      this.emit("error", {
        errorName: "VideoError",
        type: "htmlvideo",
        message: this.video!.error?.message,
      })
    );
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = window.setInterval(() => {
      if (!this.video) return;
      if (this.video.currentTime !== this.currentTime) {
        this.currentTime = this.video.currentTime;
        this.emit("time", this.currentTime);
      }
      if (this.video.duration !== this.currentDuration) {
        this.currentDuration = this.video.duration;
        this.emit("duration", this.currentDuration);
      }
      if (this.video.buffered.length > 0) {
        const buffered = this.video.buffered.end(this.video.buffered.length - 1);
        this.emit("buffered", buffered);
      }
    }, 250); // 4x per second
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  play(): void { this.video?.play(); }
  pause(): void { this.video?.pause(); }
  setVolume(vol: number): void { if (this.video) this.video.volume = vol; }
  setTime(t: number): void { if (this.video) this.video.currentTime = t; }
  setSeeking(_active: boolean): void { /* optional: disable seeking */ }

  changeQuality(automatic: boolean, preferred: string | null): void {
    if (!this.hls) return;
    if (automatic) {
      this.hls.currentLevel = -1; // Auto
    } else if (preferred !== null) {
      const levelIndex = parseInt(preferred.split(":")[0]);
      if (!isNaN(levelIndex)) this.hls.currentLevel = levelIndex;
    }
  }

  changeAudioTrack(_track: AudioTrack): void {
    // Implement audio track switching if needed
  }

  toggleFullscreen(): void {
    if (!this.container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.container.requestFullscreen();
    }
  }

  togglePictureInPicture(): void {
    if (!this.video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      this.video.requestPictureInPicture();
    }
  }

  setPlaybackRate(rate: number): void { if (this.video) this.video.playbackRate = rate; }
  setMeta(_meta: any): void { /* optional */ }
  setCaption(_caption: any): void { /* see SubtitleView component */ }
  getType(): "web" { return "web"; }
  getCaptionList(): any[] { return []; }

  destroy(): void {
    this.stopPolling();
    this.destroyHls();
    this.video = null;
    this.container = null;
    this.removeAllListeners();
  }

  startAirplay(): void { this.video?.webkitShowPlaybackTargetPicker(); }
}
```

### 5.3 Create VideoContainer Component

```typescript
// src/components/player/VideoContainer.tsx
import { useEffect, useRef } from "react";
import { WebDisplay } from "./display/webDisplay";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";

function useDisplayInterface() {
  const display = usePlayerStore((s) => s.display);
  const setDisplay = usePlayerStore((s) => s.setDisplay);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const newDisplay = new WebDisplay();
      setDisplay(newDisplay);
    }
    return () => {
      if (display) {
        display.destroy();
        setDisplay(null);
      }
    };
  }, [setDisplay]);
}

function VideoElement() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const display = usePlayerStore((s) => s.display);

  useEffect(() => {
    if (display && videoRef.current) {
      display.processVideoElement(videoRef.current);
    }
  }, [display, videoRef]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full bg-black"
      autoPlay
      playsInline
      preload="metadata"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// Initialize source when it changes
function useInitializeSource() {
  const source = usePlayerStore((s) => s.source);
  const display = usePlayerStore((s) => s.display);
  const progress = usePlayerStore((s) => s.progress);

  useEffect(() => {
    if (display && source) {
      // Determine which quality/url to load
      const loadable = selectQuality(source, { automaticQuality: true, lastChosenQuality: null });
      display.load({
        source: loadable.stream,
        startAt: progress.time,
        automaticQuality: true,
        preferredQuality: null,
      });
    }
  }, [display, source]);
}

function selectQuality(source: any, prefs: any) {
  // Simplified — see qualities.ts from p-stream for the full implementation
  if (source.type === "hls") return { stream: source, quality: null };
  if (source.type === "file") {
    const qualities = Object.keys(source.qualities);
    const best = qualities.includes("1080") ? "1080"
      : qualities.includes("720") ? "720"
      : qualities[0];
    return { stream: source.qualities[best], quality: best };
  }
  throw new Error("Unknown source type");
}

export function VideoContainer() {
  const status = usePlayerStore((s) => s.status);
  useDisplayInterface();
  useInitializeSource();

  if (status !== playerStatus.PLAYING) return null;
  return (
    <div ref={(el) => {
      if (el) {
        const display = usePlayerStore.getState().display;
        display?.processContainerElement(el);
      }
    }} className="relative w-full h-full">
      <VideoElement />
    </div>
  );
}
```

### 5.4 Create PlayerControls Component

```typescript
// src/components/player/PlayerControls.tsx
import { usePlayerStore } from "@/stores/player/store";
import { playerStatus } from "@/stores/player/slices/source";

export function PlayerControls() {
  const status = usePlayerStore((s) => s.status);
  const mediaPlaying = usePlayerStore((s) => s.mediaPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const display = usePlayerStore((s) => s.display);

  if (status !== playerStatus.PLAYING) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-600 rounded cursor-pointer mb-4"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          display?.setTime(pct * progress.duration);
        }}
      >
        <div
          className="h-full bg-red-600 rounded transition-all"
          style={{ width: `${progress.duration > 0 ? (progress.time / progress.duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={() => mediaPlaying.isPaused ? display?.play() : display?.pause()}
            className="text-white hover:text-gray-300">
            {mediaPlaying.isPaused ? "▶" : "⏸"}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button onClick={() => display?.setVolume(mediaPlaying.volume > 0 ? 0 : 1)}>
              {mediaPlaying.volume > 0 ? "🔊" : "🔇"}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={mediaPlaying.volume}
              onChange={(e) => display?.setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>

          {/* Time */}
          <span className="text-sm text-gray-300">
            {formatTime(progress.time)} / {formatTime(progress.duration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen */}
          <button onClick={() => display?.toggleFullscreen()}
            className="text-white hover:text-gray-300">
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Create Main Player Component

```typescript
// src/components/player/Player.tsx
import { useEffect, useCallback } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrape, type ScrapingSegment } from "@/hooks/useScrape";
import { VideoContainer } from "./VideoContainer";
import { PlayerControls } from "./PlayerControls";
import { playerStatus, type PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { convertStreamToSource, convertCaptions, metaToScrapeMedia } from "@/lib/providers/streamUtils";

interface PlayerProps {
  meta: PlayerMeta;
  onBack?: () => void;
}

export function Player({ meta, onBack }: PlayerProps) {
  const { playMedia, status, setScrapeNotFound, setMeta } = usePlayer();
  const { startScraping, sources, sourceOrder, currentSource, isScraping } = useScrape();
  const sourceId = usePlayerStore((s) => s.sourceId);

  // When meta changes, set it in the store and start scraping
  useEffect(() => {
    if (meta) {
      setMeta(meta, playerStatus.SCRAPING);
    }
  }, [meta, setMeta]);

  // When status is SCRAPING, start scraping
  useEffect(() => {
    if (status === playerStatus.SCRAPING) {
      const scrapeMedia = metaToScrapeMedia(meta);
      startScraping(scrapeMedia).then((output) => {
        if (output) {
          playMedia(
            convertStreamToSource(output),
            convertCaptions(output.stream.captions),
            output.sourceId
          );
        } else {
          setScrapeNotFound();
        }
      });
    }
  }, [status, meta, startScraping, playMedia, setScrapeNotFound]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Scraping progress overlay */}
      {isScraping && status !== playerStatus.PLAYING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <h2 className="text-xl font-bold mb-4">Finding Sources...</h2>
            <div className="space-y-2">
              {Object.values(sources).map((seg: ScrapingSegment) => (
                <div key={seg.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    seg.status === "success" ? "bg-green-500"
                    : seg.status === "failure" ? "bg-red-500"
                    : seg.status === "pending" ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-500"
                  }`} />
                  <span className="text-sm">{seg.name}</span>
                  {seg.status === "pending" && (
                    <span className="text-xs text-gray-400">{seg.percentage}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Player */}
      <VideoContainer />
      <PlayerControls />

      {/* Back button */}
      {onBack && status !== playerStatus.PLAYING && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 text-white bg-black/50 px-4 py-2 rounded"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
```

---

## 6. Phase 4: Build Browser Extension

### 6.1 Extension Manifest

Create a Chrome Extension Manifest V3 to setup a background service worker, CORS bypass rules via declarativeNetRequest, and an externally_connectable permission for your web app to message the extension.

The extension does two things:
1. **CORS bypass** — Uses `declarativeNetRequest` rules to add CORS headers to requests made to scraper domains
2. **Request proxy** — Receives fetch requests from the web app via `chrome.runtime.sendMessage`, makes the actual HTTP request, and returns the response

### 6.2 Extension Message Protocol

```typescript
// Web app → Extension message format
interface ExtensionRequest {
  url: string;
  method?: "GET" | "POST" | "HEAD";
  headers?: Record<string, string>;
  body?: any;
}

interface ExtensionResponse<T = any> {
  success: boolean;
  response?: {
    body: T;
    statusCode: number;
    finalUrl: string;
    headers: Record<string, string>;
  };
  error?: string;
}

// Messages sent via chrome.runtime.sendMessage
const response = await chrome.runtime.sendMessage(extensionId, {
  type: "MAKE_REQUEST",
  data: { url: "https://example.com/api", method: "GET" }
});
```

---

## 7. Phase 5: Wire Up Backend Endpoints

The providers library and player don't require a backend — they work standalone. But for persistence, create these endpoints:

### Essential Endpoints

```typescript
// POST /api/player/progress
// Save playback progress
{
  "mediaId": "tmdb-12345",
  "episodeId": "ep-678",
  "progress": 3600,   // seconds watched
  "duration": 5400,   // total duration
  "completed": false
}

// GET /api/player/progress/:mediaId
// Resume playback position
Response: {
  "progress": 3600,
  "duration": 5400,
  "completed": false
}

// POST /api/user/preferences
// Save source ordering, theme, etc.
{
  "sourceOrder": ["dopebox", "lookmovie", "debrid"],
  "embedOrder": ["upcloud", "mixdrop"],
  "lastSuccessfulSource": "dopebox"
}
```

### Backend Table Schema (Prisma example)

```prisma
model WatchProgress {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String
  mediaId   String   // tmdb-12345
  episodeId String?  // null for movies
  progress  Float    // seconds watched
  duration  Float    // total duration
  completed Boolean  @default(false)
  updatedAt DateTime @updatedAt

  @@unique([userId, mediaId, episodeId])
  @@index([userId])
}

model UserPreference {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  userId              String   @unique
  sourceOrder         String[] // ordered list of source IDs
  embedOrder          String[] // ordered list of embed IDs
  lastSuccessfulSource String?
  theme               String?  @default("classic")
  language            String?  @default("en")
}
```

---

## 8. File Extraction Map

### Files to Copy Verbatim from p-stream

These files can be copied directly with minimal changes:

| Source File | Target File | Changes Needed |
|---|---|---|
| `stores/player/slices/types.ts` | `src/stores/player/slices/types.ts` | None |
| `stores/player/slices/source.ts` | `src/stores/player/slices/source.ts` | Fix imports (remove `@/` → your path) |
| `stores/player/slices/playing.ts` | `src/stores/player/slices/playing.ts` | Fix imports |
| `stores/player/slices/progress.ts` | `src/stores/player/slices/progress.ts` | Fix imports |
| `stores/player/slices/display.ts` | `src/stores/player/slices/display.ts` | Fix imports |
| `stores/player/slices/interface.ts` | `src/stores/player/slices/interface.ts` | Fix imports |
| `stores/player/slices/casting.ts` | `src/stores/player/slices/casting.ts` | Fix imports |
| `stores/player/slices/thumbnails.ts` | `src/stores/player/slices/thumbnails.ts` | Fix imports |
| `stores/player/slices/skipSegments.ts` | `src/stores/player/slices/skipSegments.ts` | Fix imports |
| `stores/player/utils/qualities.ts` | `src/stores/player/utils/qualities.ts` | Fix imports |
| `stores/player/store.ts` | `src/stores/player/store.ts` | Fix imports |
| `components/player/display/displayInterface.ts` | `src/components/player/display/displayInterface.ts` | Fix imports |
| `components/player/utils/captions.ts` | `src/components/player/utils/captions.ts` | Fix imports |
| `components/player/utils/convertRunoutputToSource.ts` | `src/lib/providers/streamUtils.ts` | Adapt types |

### Files to Create from Scratch

| File | Based On | Effort |
|---|---|---|
| `src/lib/providers/index.ts` | `backend/providers/providers.ts` + `fetchers.ts` | ⭐ |
| `src/hooks/useScrape.ts` | `hooks/useProviderScrape.tsx` | ⭐⭐ |
| `src/hooks/usePlayer.ts` | `components/player/hooks/usePlayer.ts` | ⭐ |
| `src/hooks/usePlayerMeta.ts` | `components/player/hooks/usePlayerMeta.ts` | ⭐ |
| `src/components/player/display/webDisplay.ts` | Create from scratch with HLS.js | ⭐⭐⭐ |
| `src/components/player/VideoContainer.tsx` | `internals/VideoContainer.tsx` | ⭐⭐ |
| `src/components/player/Player.tsx` | `PlayerPart.tsx` + custom logic | ⭐⭐⭐ |
| `src/components/player/PlayerControls.tsx` | Various atoms | ⭐⭐ |
| `src/pages/MediaPlayerPage.tsx` | `PlayerView.tsx` | ⭐⭐ |

---

## 9. Configuration Reference

### Environment Variables

```bash
# TMDB API Key (required — powers metadata lookup)
VITE_TMDB_READ_API_KEY=your_tmdb_api_key_here

# CORS Proxy Server URL (required for browser-only mode)
VITE_CORS_PROXY_URL=https://your-proxy.com

# M3U8 Proxy URL (for proxied HLS streams)
VITE_M3U8_PROXY_URL=https://your-m3u8-proxy.com

# Backend API URL (for progress/bookmarks)
VITE_BACKEND_URL=https://api.your-app.com

# Extension ID (for CORS bypass communication)
VITE_EXTENSION_ID=abcdefghijklmnopabcdefghijklmn
```

### Target Configuration Matrix

| Deployment | Target | Fetcher | Proxied Fetcher | Sources | Notes |
|---|---|---|---|---|---|
| Browser only | `BROWSER` | `makeStandardFetcher(fetch)` | CORS proxy | CORS-allowed only | Most limited |
| + Extension | `BROWSER_EXTENSION` | `makeStandardFetcher(fetch)` | Extension fetcher | All sources | Recommended |
| Desktop app | `NATIVE` | `makeStandardFetcher(fetch)` | Native fetcher | All + MKV | Electron/Tauri |
| Mobile app | `NATIVE` | Platform fetch | Platform fetch | All | React Native/Flutter |

### Player Status State Machine

```
IDLE → RESUME (if progress > 80%) → SCRAPING → PLAYING
  ↓           ↓                        ↓            ↓
  (set meta)  (restart)          SCRAPE_NOT_FOUND  PLAYBACK_ERROR
                                     ↓                ↓
                                  (scrape again)   (resume from next source)
```

---

## 10. Testing the Integration

### 10.1 Test Providers Standalone

```typescript
// test/providers.test.ts
import { makeProviders, makeStandardFetcher, targets } from "@p-stream/providers";

async function testProviders() {
  const providers = makeProviders({
    fetcher: makeStandardFetcher(fetch),
    target: targets.BROWSER_EXTENSION,
    consistentIpForRequests: true,
  });

  // Test listing sources
  const sources = providers.listSources();
  console.log(`Loaded ${sources.length} sources`);

  // Test scraping (use a real TMDB ID)
  const output = await providers.runAll({
    media: {
      type: "movie",
      title: "The Matrix",
      releaseYear: 1999,
      tmdbId: "603", // The Matrix
    },
    events: {
      update: (evt) => console.log(`[${evt.id}] ${evt.percentage}% - ${evt.status}`),
    },
  });

  if (output) {
    console.log(`Found stream from: ${output.sourceId}`);
    console.log(`Stream type: ${output.stream.type}`);
  } else {
    console.log("No stream found");
  }
}
```

### 10.2 Test Player Integration

```typescript
// test/player.test.tsx
import { render, screen } from "@testing-library/react";
import { Player } from "@/components/player/Player";
import { PlayerProvider } from "@/test/utils";

test("renders player in idle state", () => {
  render(
    <PlayerProvider>
      <Player meta={mockMeta} />
    </PlayerProvider>
  );
  // Player should show scraping UI initially
  expect(screen.getByText(/Finding Sources/i)).toBeInTheDocument();
});
```

### 10.3 Type Check

```bash
npx tsc --noEmit
```

### 10.4 Manual Integration Test Checklist

- [ ] Providers library initializes without errors
- [ ] `listSources()` returns 40+ sources
- [ ] `listEmbeds()` returns 70+ embeds
- [ ] Provider targets filter sources correctly (BROWSER vs EXTENSION)
- [ ] Scraping hook fires init/start/update/discoverEmbeds events
- [ ] Successful scrape returns `RunOutput` with valid stream
- [ ] Stream conversion produces correct `SourceSliceSource`
- [ ] Player store initializes with IDLE status
- [ ] `setMeta()` transitions to SCRAPING
- [ ] `playMedia()` transitions to PLAYING
- [ ] WebDisplay creates HLS.js instance for HLS streams
- [ ] WebDisplay creates native video for MP4 streams
- [ ] Video plays, pauses, seeks correctly
- [ ] Quality switching works
- [ ] Fullscreen toggles
- [ ] Volume control works
- [ ] Error state triggers PLAYBACK_ERROR
- [ ] Extension fetcher communicates with extension

---

## 11. AI Agent Prompt Cookbook

Use these prompts with an AI coding agent (like Codebuff, Cursor, or Claude) to execute each phase.

### Prompt 1: Install and Configure Providers

```
I'm integrating the @p-stream/providers library into my React project. The library is at
github:p-stream/providers#production in my package.json.

Please:
1. Install the package and its dependencies
2. Create src/lib/providers/index.ts with a getProviders() function:
   - Desktop app → NATIVE target
   - Extension active → BROWSER_EXTENSION target with makeExtensionFetcher()
   - Browser only → BROWSER target with makeSimpleProxyFetcher()
3. Create src/lib/providers/streamUtils.ts with:
   - convertStreamToSource() — converts RunOutput.stream → SourceSliceSource
   - convertCaptions() — converts Stream.captions → CaptionListItem[]
   - metaToScrapeMedia() — converts PlayerMeta → ScrapeMedia
4. Create src/hooks/useScrape.ts with:
   - useScrape() hook wrapping providers.runAll()
   - Event handlers: init, start, update, discoverEmbeds
   - Source segment tracking with status/pending/success/failure states
```

### Prompt 2: Copy Player Store

```
I need to integrate the Zustand player store from p-stream into my project.
The source project has these files under stores/player/:

- store.ts
- slices/types.ts, source.ts, playing.ts, progress.ts, display.ts,
  interface.ts, casting.ts, thumbnails.ts, skipSegments.ts
- utils/qualities.ts

Please:
1. Create each file in src/stores/player/ matching the source structure
2. Replace @/ path imports with my project's path alias
3. Install zustand and immer as dependencies
4. Create src/hooks/usePlayer.ts with playMedia(), reset(), and status management
5. Create src/hooks/usePlayerMeta.ts to convert metadata formats
6. Create src/hooks/useInitializePlayer.ts for display initialization
```

### Prompt 3: Build WebDisplay + VideoContainer

```
Create the video rendering layer for my player.

Please:
1. Create src/components/player/display/displayInterface.ts — copy from p-stream
2. Create src/components/player/display/webDisplay.ts — implement DisplayInterface:
   - HLS.js support for HLS streams (load, switch quality, error handling)
   - Native HTMLVideoElement for MP4 streams
   - Event emission: play, pause, time, duration, buffered, loading, qualities, error
   - Polling at 250ms for time/duration/buffered
   - Fullscreen, PiP, volume, playback rate controls
   - Clean destroy()
3. Create src/components/player/VideoContainer.tsx — the React wrapper:
   - Initializes WebDisplay via useEffect
   - Renders <video> element
   - Monitors source changes via usePlayerStore
4. Install hls.js and ensure proper typing
```

### Prompt 4: Build Player UI Components

```
Build the player UI components for my React app.

Please:
1. Create src/components/player/PlayerControls.tsx:
   - Play/pause button
   - Skip back 10s / skip forward 10s buttons
   - Volume slider with mute toggle
   - Progress bar (clickable to seek)
   - Time display (current / duration)
   - Fullscreen toggle
   - Quality selector dropdown
   - Caption/subtitle selector if available
   - Playback speed selector (0.5x - 2x)
2. Style with Tailwind CSS
3. All actions should call methods on the display interface from usePlayerStore
4. Use React state + usePlayerStore for reactive updates
```

### Prompt 5: Build MediaPlayer Page

```
Create the main MediaPlayer page that ties everything together.

Please:
1. Create src/pages/MediaPlayerPage.tsx:
   - Extract :tmdbId, :season?, :episode? from URL params via react-router
   - Fetch TMDB metadata (title, year, poster, season/episode data)
   - Convert to PlayerMeta format
   - Render <Player> component
   - Handle loading, error, and not-found states
   - Handle onboarding redirect if needed
2. The page should follow this state machine:
   IDLE → fetch metadata → set meta → SCRAPING → scrape providers → PLAYING
   On error → show error UI with retry option
3. Add the route to your App.tsx or router config
```

### Prompt 6: Build Browser Extension

```
Create a Chrome extension that enables CORS bypass for my streaming app.

The extension needs:
1. manifest.json (Manifest V3):
   - Host permissions for streaming site domains
   - declarativeNetRequest permission
   - externally_connectable for my web app domain
2. src/background.ts — service worker that:
   - Handles chrome.runtime.onMessageExternal for MAKE_REQUEST type
   - Makes HTTP fetch requests and returns response
   - Manages declarativeNetRequest rules for CORS headers
3. src/utils/declarativeNetRequest.ts:
   - addRules() — adds CORS headers to target domains
   - removeRules() — cleanup
4. Version check and permission management
```

### Prompt 7: End-to-End Integration

```
Now I need to verify the full integration works end-to-end.

Please:
1. Create a test page at /debug/player that:
   - Has an input field for TMDB ID and media type
   - On submit, fetches metadata, creates PlayerMeta, and opens the player
2. Create a test at /debug/providers that:
   - Lists all available sources and embeds
   - Has a "Test Scrape" button for a given TMDB ID
   - Shows real-time scraping progress
   - Displays the resulting stream URL
3. Check that:
   - Providers load without errors
   - Player store initializes correctly
   - Video element renders when status is PLAYING
   - Controls are interactive
```

---

## Quick Start: Minimal Integration (15 min)

If you want the absolute minimum to test the integration works:

```bash
# 1. Install providers
npm install github:p-stream/providers#production

# 2. Create a test script
cat > test-providers.mjs << 'EOF'
import { makeProviders, makeStandardFetcher, targets } from '@p-stream/providers';

const providers = makeProviders({
  fetcher: makeStandardFetcher(fetch),
  target: targets.BROWSER_EXTENSION,
  consistentIpForRequests: true,
});

console.log('Sources:', providers.listSources().length);
console.log('Embeds:', providers.listEmbeds().length);

// Test scrape The Matrix (TMDB ID: 603)
const output = await providers.runAll({
  media: { type: 'movie', title: 'The Matrix', releaseYear: 1999, tmdbId: '603' },
  events: { update: (e) => console.log(`[${e.id}] ${e.percentage}% - ${e.status}`) },
});

if (output) {
  console.log('✅ Stream found from:', output.sourceId);
  console.log('Type:', output.stream.type);
} else {
  console.log('❌ No stream found');
}
EOF

# 3. Run it
node test-providers.mjs
```

---

> **End of Integration Plan**
>
> This document is designed to be fed directly to an AI coding agent. Each phase has executable prompts and code examples. Start with Phase 1 and work through sequentially. The providers library is standalone and can be tested independently before building the player UI.
