# P-Stream Ecosystem — Comprehensive Architecture Documentation

> **Project Status:** Archived open-source project
> **Ecosystem:** 5 interconnected sub-projects forming a complete streaming media platform

---

## Table of Contents

1. [Ecosystem Overview](#1-ecosystem-overview)
2. [Providers Sub-Project (v3.2.0)](#2-providers-sub-project)
   - [2.1 Architecture Overview](#21-architecture-overview)
   - [2.2 Core Types & Base Classes](#22-core-types--base-classes)
   - [2.3 Source Scrapers](#23-source-scrapers)
   - [2.4 Embed Scrapers](#24-embed-scrapers)
   - [2.5 Runner System](#25-runner-system)
   - [2.6 Fetcher System](#26-fetcher-system)
   - [2.7 Entrypoint & Builder API](#27-entrypoint--builder-api)
   - [2.8 Targets, Flags & Feature System](#28-targets-flags--feature-system)
   - [2.9 Utility Modules](#29-utility-modules)
   - [2.10 Dev CLI](#210-dev-cli)
   - [2.11 Complete Source/Embed Registry](#211-complete-sourceembed-registry)
3. [P-Stream Video Player](#3-p-stream-video-player)
   - [3.1 Architecture Overview](#31-architecture-overview)
   - [3.2 PlayerView Page](#32-playerview-page)
   - [3.3 PlayerPart Component](#33-playerpart-component)
   - [3.4 Player Hooks](#34-player-hooks)
   - [3.5 Display Interface](#35-display-interface)
   - [3.6 Player Store (Zustand + Immer)](#36-player-store-zustand--immer)
   - [3.7 Store Slices Deep Dive](#37-store-slices-deep-dive)
   - [3.8 Quality Management System](#38-quality-management-system)
   - [3.9 Provider Scraping Integration](#39-provider-scraping-integration)
   - [3.10 Player Lifecycle](#310-player-lifecycle)
4. [Cross-Project Integration](#4-cross-project-integration)

---

## 1. Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        P-Stream Ecosystem                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  p-stream     │◄──►│  providers   │◄──►│  extension   │       │
│  │  (Frontend)   │    │  (Scraper)   │    │  (CORS Bypass)│       │
│  │  React/Zustand│    │  TS Library  │    │  Chrome Ext  │       │
│  └──────┬───────┘    └──────────────┘    └──────────────┘       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐                            │
│  │  backend     │    │  pstream-docs│                            │
│  │  Nitro/Prisma│    │  Astro/      │                            │
│  │  PostgreSQL  │    │  Starlight   │                            │
│  └──────────────┘    └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**User Flow:** Search content → TMDB discovers metadata → `providers` engine scrapes 40+ sources in ranked order → CORS bypass via extension if needed → streams play in custom video player → progress/bookmarks sync to backend

---

## 2. Providers Sub-Project

### 2.1 Architecture Overview

**Stack:** Pure TypeScript library, built with Vite\
**Version:** 3.2.0\
**Role:** The scraping engine — discovers stream URLs from 40+ web sources and 50+ embed providers

**Layered Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                  Entrypoint (public API)                     │
│  makeProviders() / buildProviders() / ProviderControls      │
├─────────────────────────────────────────────────────────────┤
│                    Runner System                             │
│  runAllProviders() / scrapeIndividualSource/Embed()          │
├─────────────────────────────────────────────────────────────┤
│                 Source Scrapers (40+)                        │
│  Dopebox, Lookmovie, FShareTV, Cuevana3, Debrid, etc.       │
│          │                                                   │
│          ▼                                                   │
│                 Embed Scrapers (50+)                         │
│  UpCloud, VidCloud, MixDrop, StreamTape, Dood, etc.          │
├─────────────────────────────────────────────────────────────┤
│                    Fetcher System                            │
│  Standard Fetch / Simple Proxy / Native / Node Fetch         │
├─────────────────────────────────────────────────────────────┤
│                    Utilities                                 │
│  Proxy, Playlist, Validation, TMDB, Browser Detection, etc.  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Core Types & Base Classes

#### Stream Types (`providers/src/providers/streams.ts`)

Two fundamental stream types:

```typescript
// MP4 file with multiple quality options
type FileBasedStream = {
  type: 'file';
  qualities: Partial<Record<Qualities, StreamFile>>;
  // Common fields:
  id: string;              // unique per output
  flags: Flags[];          // CORS, IP-locked, etc.
  captions: Caption[];     // available subtitles
  thumbnailTrack?: { type: 'vtt'; url: string };
  headers?: Record<string, string>;        // required headers
  preferredHeaders?: Record<string, string>; // optional headers
  skipValidation?: boolean;
};

// HLS stream (m3u8 playlist)
type HlsBasedStream = {
  type: 'hls';
  playlist: string;
  proxyDepth?: 0 | 1 | 2;
  // ... same common fields
};

type Qualities = 'unknown' | '360' | '480' | '720' | '1080' | '4k';
```

#### Caption Types (`providers/src/providers/captions.ts`)

```typescript
type Caption = {
  type: 'srt' | 'vtt';
  id: string;
  url: string;
  hasCorsRestrictions: boolean;
  language: string;           // ISO language code
  opensubtitles?: boolean;
  flagUrl?: string;           // Wyzie fields
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
};
```

Features `labelToLanguageCode()` — a comprehensive mapping of ~50+ language labels to ISO codes with ISO639-1 fallback, and `removeDuplicatedLanguages()` for deduplication.

#### Scraper Base Types (`providers/src/providers/base.ts`)

**Source Scraper (`Sourcerer`):**

```typescript
type SourcererOptions = {
  id: string;           // unique identifier (e.g., 'dopebox')
  name: string;         // display name
  rank: number;         // priority (higher = first)
  disabled?: boolean;
  externalSource?: boolean; // built-in but not default
  flags: Flags[];
  scrapeMovie?: (ctx: MovieScrapeContext) => Promise<SourcererOutput>;
  scrapeShow?: (ctx: ShowScrapeContext) => Promise<SourcererOutput>;
};

type SourcererOutput = {
  embeds: SourcererEmbed[];  // discovered embed URLs
  stream?: Stream[];         // direct streams (rare)
};

type SourcererEmbed = {
  embedId: string;  // references an embed scraper ID
  url: string;       // the embed page URL to scrape
};
```

**Embed Scraper (`Embed`):**

```typescript
type EmbedOptions = {
  id: string;
  name: string;
  rank: number;
  disabled?: boolean;
  flags: Flags[];
  scrape: (ctx: EmbedScrapeContext) => Promise<EmbedOutput>;
};

type EmbedOutput = {
  stream: Stream[];
};
```

**Factory Functions:** `makeSourcerer()` and `makeEmbed()` create properly typed scraper objects with auto-detected media types and default values.

#### Scrape Context (`providers/src/utils/context.ts`)

```typescript
type ScrapeContext = {
  proxiedFetcher: UseableFetcher;       // CORS-proxied fetch
  fetcher: UseableFetcher;              // direct fetch
  progress(val: number): void;          // report progress 0-100
  features: FeatureMap;                 // target capabilities
};

type EmbedScrapeContext = ScrapeContext & { url: string };
type MovieScrapeContext = ScrapeContext & { media: MovieMedia };
type ShowScrapeContext = ScrapeContext & { media: ShowMedia };
```

#### Media Types (`providers/src/entrypoint/utils/media.ts`)

```typescript
type ScrapeMedia = 
  | { type: 'movie'; title: string; releaseYear: number; tmdbId: string; imdbId?: string }
  | { type: 'show'; title: string; releaseYear: number; tmdbId: string; imdbId?: string;
      episode: { number: number; tmdbId: string };
      season: { number: number; tmdbId: string; title: string; episodeCount?: number } };
```

### 2.3 Source Scrapers

Source scrapers are top-level providers that either return direct streams or discover embed URLs. They typically:

1. Receive TMDB metadata (title, year, season/episode)
2. Search the source website for matching content
3. Return either direct `Stream[]` or `SourcererEmbed[]` pointing to embed scrapers

#### Architecture Pattern

Most sources follow this pattern:

```typescript
const comboScraper = makeSourcerer({
  id: 'lookmovie',
  name: 'LookMovie',
  rank: 170,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: async (ctx) => { /* ... */ },
  scrapeShow: async (ctx) => { /* ... */ },
});
```

**Key Sources (from `providers/src/providers/all.ts`):**

| Source | Rank | Language | Notes |
|--------|------|----------|-------|
| FSOnline | 200 | English | High-priority English source |
| Dopebox | 197 | English | Uses UpCloud embeds |
| Cuevana3 | 185 | Spanish | |
| Ridoo Movies | 183 | Multi | |
| HDRezka | 180 | Russian | |
| WarezCDN | 178 | Multi | |
| SoaperTV | 170 | English | |
| LookMovie | 170 | English | |
| AutoEmbed | 165 | Multi | Generic embed discovery |
| Debrid | 450 | N/A | Real-Debrid / Torrentio / Comet (highest rank) |
| VidLink | - | English | |
| VidRock | - | English | |
| WatchAnimeWorld | - | Anime | |
| *40+ total sources* | | | |

#### Source Deep Dive: Dopebox (`providers/src/providers/sources/dopebox/index.ts`)

A well-structured source demonstrating the full pattern:

1. **Search** — Fetches TMDB name via `fetchTMDBName()`, then searches Dopebox's internal API using Fuse.js fuzzy matching
2. **Season/Episode Resolution** — For shows, resolves `getSeasons()` → `getEpisodes()` with nested calls
3. **Player Discovery** — `getMoviePlayers()` / `getEpisodePlayers()` return `MediaPlayer[]` with URLs
4. **Embed Mapping** — Maps players (e.g., "UpCloud") to registered embed scrapers via ID matching
5. **Error Handling** — Throws descriptive errors: `'Could not find movie'`, `'Could not find season'`

```typescript
// Simplified flow:
searchMedia → Fuse match → getSeasons (for shows) → getEpisodes → getPlayers → map to embeds
```

#### Source Deep Dive: Debrid (`providers/src/providers/sources/debrid/index.ts`)

The Debrid source is unique — it uses **Torrentio** (Stremio addon) and **Comet** (alternative) to find cached torrent streams via Real-Debrid or TorBox:

1. **Authentication** — Reads token from localStorage (`__MW::preferences`)
2. **Service Selection** — Supports `real-debrid` and `torbox`
3. **Dual Scraping** — Fetches from both Torrentio and Comet in parallel
4. **Quality Selection** — Scores streams by container (mp4 > mkv), audio (aac), codec (h265)
5. **Best Stream** — Per quality tier: prefers mp4+aac, then mp4, then best-scored

```typescript
// Scoring algorithm
function scoreStream(stream): number {
  let score = 0;
  if (stream.container === 'mp4') score += 10;
  if (stream.audio === 'aac') score += 5;
  if (stream.codec === 'h265') score += 2;
  if (stream.container === 'mkv') score -= 2;
  if (stream.complete) score += 1;
  return score;
}
```

### 2.4 Embed Scrapers

Embed scrapers take an embed URL and extract `Stream[]` from it. They parse the embed page HTML/JavaScript to find video sources.

#### Architecture Pattern

```typescript
const upcloudScraper = makeEmbed({
  id: 'upcloud',
  name: 'UpCloud',
  rank: 201,
  flags: [],
  scrape: async (ctx) => {
    // Parse ctx.url HTML, extract m3u8/mp4 sources
    return { stream: [...] };
  },
});
```

**Key Embeds (from `providers/src/providers/all.ts`):**

| Embed | Rank | Notes |
|-------|------|-------|
| Server Mirrors | 500+ | Multi-server fallback |
| UpCloud | 201 | Popular embed |
| VidCloud | 201 | Same domain as UpCloud |
| MixDrop | 190 | |
| Ridoo | 183 | |
| Dood | 175 | |
| StreamTape | 170 | |
| StreamWish (x4) | Various | English, Japanese, Latino, Spanish |
| VidHide (x3) | Various | English, Latino, Spanish |
| Vidsrcsu (x12) | Various | Multiple server implementations |
| WarezCDN (x3) | Various | HLS, MP4, Player variants |
| MP4Hydra (x2) | Various | |
| SuperVideo | - | |
| VOE | - | |
| FileMoon | - | |
| FileLions | - | |
| Dropload | - | |
| *50+ total embeds* | | |

#### Embed Deep Dive: VidCloud (`providers/src/providers/embeds/vidcloud.ts`)

A thin wrapper demonstrating embed composition — VidCloud delegates entirely to UpCloud since they share the same embed domain (`rabbitstream.net`):

```typescript
const vidCloudScraper = makeEmbed({
  id: 'vidcloud',
  name: 'VidCloud',
  rank: 201,
  disabled: true,  // Note: disabled by default
  async scrape(ctx) {
    const result = await upcloudScraper.scrape(ctx);
    return { stream: result.stream.map(s => ({ ...s, flags: [] })) };
  },
});
```

### 2.5 Runner System

The runner system orchestrates the execution of scrapers, handling ordering, validation, error recovery, and event reporting.

#### Main Runner (`providers/src/runners/runner.ts`)

**`runAllProviders()` — The Core Scraping Pipeline:**

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Init    │───►│ Source 1 │───►│  Has     │───►│  Return  │
│  Event   │    │  Scrape  │    │ Stream?  │    │  Stream  │
└──────────┘    └────┬─────┘    └────┬─────┘    └──────────┘
                     │               │ No
                     ▼               ▼
              ┌──────────────┐  ┌──────────┐    ┌──────────┐
              │ Discover     │  │ Source 2 │◄───│  Error   │
              │ Embeds       │  │  Scrape  │    │  Report  │
              └──────┬───────┘  └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │ Embed 1  │───►│  Has     │───►│  Return  │
              │  Scrape  │    │ Stream?  │    │  Stream  │
              └──────────┘    └──────────┘    └──────────┘
                     │               │ No
                     ▼               ▼
              ┌──────────┐    ┌──────────┐
              │ Embed 2  │───►│  Next    │
              │  Scrape  │    │ Source   │
              └──────────┘    └──────────┘
```

**Key Behaviors:**
- **Ordering:** Sources/embeds are reordered by user preference, then by rank (decending)
- **Error Recovery:** If a source fails (throws `NotFoundError` or other), it logs the error via events and continues to the next source
- **Embed Cascading:** If a source returns embeds, each embed is tried in order
- **Stream Validation:** After scraping, streams are validated for playability before returning
- **Event System:** `init`, `start`, `update`, `discoverEmbeds` events fire throughout the pipeline

**Event Types (`providers/src/entrypoint/utils/events.ts`):**

```typescript
type FullScraperEvents = {
  init?: (evt: { sourceIds: string[] }) => void;
  start?: (id: string) => void;
  update?: (evt: { id: string; percentage: number; status: 'success'|'failure'|'notfound'|'pending'; error?: unknown; reason?: string }) => void;
  discoverEmbeds?: (evt: { sourceId: string; embeds: Array<{ id: string; embedScraperId: string }> }) => void;
};
```

**Output Type:**

```typescript
type RunOutput = {
  sourceId: string;       // which source succeeded
  embedId?: string;       // which embed (if any)
  stream: Stream;         // the winning stream
};
```

#### Individual Runner (`providers/src/runners/individualRunner.ts`)

Provides `scrapeIndividualSource()` and `scrapeIndividualEmbed()` for running a single scraper. Validates streams, filters by features, applies proxy configuration, and filters out disabled embeds.

### 2.6 Fetcher System

The fetcher system provides a layered abstraction over HTTP requests, supporting multiple environments.

#### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    UseableFetcher (to scrapers)               │
│  fetcher(url, ops?) → T (body)                               │
│  fetcher.full(url, ops?) → FetcherResponse (full response)   │
├──────────────────────────────────────────────────────────────┤
│                    Fetcher (internal)                         │
│  fetcher(url, defaultedOps) → FetcherResponse                │
├──────────────────────────────────────────────────────────────┤
│            Implementations                                    │
│  Standard Fetch → makeStandardFetcher(native fetch)          │
│  Simple Proxy → makeSimpleProxyFetcher(proxyUrl, fetch)      │
└──────────────────────────────────────────────────────────────┘
```

#### Types (`providers/src/fetchers/types.ts`)

```typescript
type FetcherOptions = {
  baseUrl?: string;                     // prepended to URL
  headers?: Record<string, string>;
  query?: Record<string, string>;       // appended as URL params
  method?: 'HEAD' | 'GET' | 'POST';
  readHeaders?: string[];               // headers to extract from response
  body?: Record<string, any> | string | FormData | URLSearchParams;
  credentials?: 'include' | 'same-origin' | 'omit';
};

type FetcherResponse<T = any> = {
  statusCode: number;
  headers: Headers;
  finalUrl: string;
  body: T;
};
```

#### Standard Fetcher (`providers/src/fetchers/standardFetch.ts`)

- URL construction via `makeFullUrl()` (handles baseUrl, query params)
- Body serialization via `serializeBody()` (JSON, FormData, URLSearchParams)
- 15s timeout with AbortController
- Response parsing: JSON for `application/json`, ArrayBuffer for binary, text otherwise
- Header extraction with `extraHeaders` support (for proxy relayed headers)

#### Simple Proxy Fetcher (`providers/src/fetchers/simpleProxy.ts`)

- Wraps requests through a proxy server
- Maps restricted headers (cookie, referer, origin, user-agent) to proxy-safe headers (X-Cookie, X-Referer, etc.)
- 20s timeout
- Response header mapping for Set-Cookie relay
- `X-Final-Destination` header for final URL tracking

#### Fetcher Factory (`providers/src/fetchers/common.ts`)

`makeFetcher()` wraps a low-level `Fetcher` into a `UseableFetcher` that scrapers use, providing both direct response access (`full()`) and body-only convenience calls.

### 2.7 Entrypoint & Builder API

The public API for consumers (like the main `p-stream` app).

#### Declarative API (`providers/src/entrypoint/declare.ts`)

```typescript
function makeProviders(options: ProviderMakerOptions): ProviderControls

type ProviderMakerOptions = {
  fetcher: Fetcher;
  proxiedFetcher?: Fetcher;
  target: Targets;                        // browser, extension, native, any
  consistentIpForRequests?: boolean;
  externalSources?: 'all' | string[];     // enable non-default sources
  proxyStreams?: boolean;                 // temporary proxy all streams
};
```

**Example usage:**
```typescript
const providers = makeProviders({
  fetcher: myFetcher,
  target: targets.BROWSER_EXTENSION,
  consistentIpForRequests: true,
});
```

#### Builder API (`providers/src/entrypoint/builder.ts`)

A fluent builder for more control:

```typescript
const providers = buildProviders()
  .setTarget(targets.BROWSER)
  .setFetcher(myFetcher)
  .addSource('dopebox')          // by ID, from built-ins
  .addSource(myCustomScraper)     // or directly
  .addEmbed('upcloud')
  .addBuiltinProviders()          // all built-in sources/embeds
  .enableConsistentIpForRequests()
  .build();
```

#### ProviderControls (`providers/src/entrypoint/controls.ts`)

```typescript
interface ProviderControls {
  runAll(runnerOps: RunnerOptions): Promise<RunOutput | null>;
  runSourceScraper(ops: SourceRunnerOptions): Promise<SourcererOutput>;
  runEmbedScraper(ops: EmbedRunnerOptions): Promise<EmbedOutput>;
  getMetadata(id: string): MetaOutput | null;
  listSources(): MetaOutput[];
  listEmbeds(): MetaOutput[];
}
```

#### Provider Registry (`providers/src/entrypoint/providers.ts`)

- `getBuiltinSources()` — returns all non-disabled, non-external sources
- `getBuiltinExternalSources()` — returns non-disabled external sources (used only when explicitly enabled)
- `getBuiltinEmbeds()` — returns all non-disabled embeds
- `gatherAllSources()` / `gatherAllEmbeds()` — the full registries from `providers/all.ts`

### 2.8 Targets, Flags & Feature System

The feature system controls which sources/embeds/streams are compatible with the current deployment environment.

#### Flags (`providers/src/entrypoint/utils/targets.ts`)

```typescript
const flags = {
  CORS_ALLOWED: 'cors-allowed',       // Works in any browser
  IP_LOCKED: 'ip-locked',             // Must match request IP
  CF_BLOCKED: 'cf-blocked',           // Blocked on Cloudflare IPs
  PROXY_BLOCKED: 'proxy-blocked',     // Extension-only
  MKV_REQUIRED: 'mkv-required',       // Native player required
};
```

#### Targets

```typescript
const targets = {
  BROWSER: 'browser',                 // Standard browser (CORS restricted)
  BROWSER_EXTENSION: 'browser-extension',  // With CORS-bypass extension
  NATIVE: 'native',                   // Native app (no restrictions)
  ANY: 'any',                         // Any environment
};
```

#### Target Feature Maps

| Target | Requires | Disallowed |
|--------|----------|------------|
| `browser` | `CORS_ALLOWED` | `MKV_REQUIRED` |
| `browser-extension` | *(none)* | `MKV_REQUIRED` |
| `native` | *(none)* | *(none)* |
| `any` | *(none)* | `MKV_REQUIRED` |

#### `flagsAllowedInFeatures()`

Checks if all required flags are present AND no disallowed flags are present. Used throughout the system to filter sources, embeds, and streams.

### 2.9 Utility Modules

#### Proxy System (`providers/src/utils/proxy.ts`)

Handles stream proxy configuration:

- **`requiresProxy(stream)`** — Determines if a stream needs proxying (no CORS_ALLOWED flag, or has custom headers)
- **`setupProxy(stream)` — Wraps stream URLs through `DEFAULT_PROXY_URL` with base64-encoded payload containing type, original URL, headers, and depth options. Adds headers back as empty and sets CORS_ALLOWED
- **`createM3U8ProxyUrl()`** — Creates proxied URLs for HLS streams via the configured M3U8 proxy
- **`setM3U8ProxyUrl()` / `getM3U8ProxyUrl()`** — Runtime proxy URL configuration

#### Playlist Handler (`providers/src/utils/playlist.ts`)

**`convertPlaylistsToDataUrls()`** — For streams needing CORS bypass, fetches the HLS playlist, recursively fetches variant playlists (resolving relative URLs), and encodes everything as base64 `data:` URIs. This allows playing HLS streams that have CORS-restricted segments through a proxy.

```typescript
// Flow: fetch master.m3u8 → parse → fetch each variant.m3u8 → encode as data: URI
```

#### Stream Validation (`providers/src/utils/valid.ts`)

**`isValidStream()`** — Checks basic validity (non-empty playlist for HLS, at least one quality for file)

**`validatePlayableStream()`** — Performs live HTTP validation:

1. For HLS: HEAD/GET the playlist URL with proper headers, 20s timeout
2. For Files: HEAD/GET each quality URL with `Range: bytes=0-1`, 20s timeout
3. Detects error responses (403, `error_wrong_ip`, `Access Denied`)
4. Removes invalid qualities from file-based streams
5. Skips validation for known-working scrapers (`warezcdnembedMp4`, `streamtape`)

#### TMDB Helper (`providers/src/utils/tmdb.ts`)

**`fetchTMDBName()`** — Fetches the canonical name from TMDB API using the provided TMDB ID. Supports movies and TV shows with language parameter.

#### Browser Detection (`providers/src/utils/browser.ts`)

Detects Chrome/Brave, Firefox, Safari from user agent.

#### Error Handling (`providers/src/utils/errors.ts`)

```typescript
class NotFoundError extends Error {
  constructor(reason?: string);
  // Used to signal "no stream found" (expected) vs actual failures
}
```

#### List Reordering (`providers/src/utils/list.ts`)

**`reorderOnIdList()`** — Sorts an array of scrapers by a custom order (user preferences), falling back to rank sorting for unlisted items.

### 2.10 Dev CLI

**Location:** `providers/src/dev-cli/index.ts`

An interactive CLI for testing scrapers during development, built with `commander` and `enquirer`:

- **Interactive mode** — Prompts for fetcher type (native/node-fetch/browser), source selection (from live registry), TMDB ID, media type, season/episode
- **Command-line mode** — `--fetcher`, `--source-id`, `--tmdb-id`, `--type`, `--season`, `--episode`, `--url` flags
- **Rank management** — `--rank` flag launches a rank management interface
- **Proxy support** — Respects `HTTPS_PROXY` environment variable for debugging behind proxies
- **Scraper execution** — Runs the selected scraper with the configured options and outputs results

### 2.11 Complete Source/Embed Registry

All sources and embeds are registered in `providers/src/providers/all.ts`:

**Sources (45):**
`fsOnlineScraper`, `dopeboxScraper`, `cuevana3Scraper`, `ridooMoviesScraper`, `hdRezkaScraper`, `warezcdnScraper`, `insertunitScraper`, `soaperTvScraper`, `autoembedScraper`, `myanimeScraper`, `tugaflixScraper`, `ee3Scraper`, `fsharetvScraper`, `zoechipScraper`, `mp4hydraScraper`, `embedsuScraper`, `slidemoviesScraper`, `vidapiClickScraper`, `coitusScraper`, `streamboxScraper`, `nunflixScraper`, `EightStreamScraper`, `wecimaScraper`, `animeflvScraper`, `animekaiScraper`, `FedAPIScraper`, `FedAPIDBScraper`, `pirxcyScraper`, `vidsrcvipScraper`, `rgshowsScraper`, `vidifyScraper`, `zunimeScraper`, `vidnestScraper`, `animetsuScraper`, `lookmovieScraper`, `turbovidSourceScraper`, `pelisplushdScraper`, `primewireScraper`, `movies4fScraper`, `debridScraper`, `cinehdplusScraper`, `fullhdfilmizleScraper`, `vidlinkScraper`, `vidrockScraper`, `watchanimeworldScraper`

**Embeds (70+):**
`upcloudScraper`, `vidCloudScraper`, `mixdropScraper`, `serverMirrorEmbed`, `ridooScraper`, `closeLoadScraper`, `doodScraper`, `streamvidScraper`, `streamtapeScraper`, plus multi-server variants for `warezcdn`, `autoembed` (EN/HI/BN/TA/TE), `turbovid`, `mp4hydra` (x2), `vidsrcsu` (x12), `viper`, `streamwish` (x4), `streamtapeLatino`, `cinemaos`, `vidify`, `zunime`, `Animetsu`, `Vidnest`, `myanimesub`, `myanimedub`, `filemoon`, `vidhide` (x3), `filelions`, `dropload`, `supervideo`, `voe`, `animekai`

---

## 3. P-Stream Video Player

### 3.1 Architecture Overview

**Stack:** React 18 + TypeScript + Zustand (with Immer middleware) + HLS.js\
**Location:** `p-stream/src/` — primarily `components/player/`, `stores/player/`, `pages/PlayerView.tsx`

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PlayerView Page                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                        PlayerPart                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │ │
│  │  │  Top     │  │ Bottom   │  │  Center  │  │  Overlays    │   │ │
│  │  │ Controls │  │ Controls │  │ Controls │  │  (Pause,     │   │ │
│  │  │          │  │          │  │          │  │   Settings,  │   │ │
│  │  │ - Back   │  │ - Pause  │  │ - Spinner │  │   Episodes,  │   │ │
│  │  │ - Title  │  │ - Skip   │  │ - AutoPlay│  │   Subtitles) │   │ │
│  │  │ - Info   │  │ - Volume │  │ - Casting │  │              │   │ │
│  │  │ - Bookmrk│  │ - Time   │  │   Notif.  │  │              │   │ │
│  │  └──────────┘  │ - ProgBar│  └──────────┘  └──────────────┘   │ │
│  │                 │ - Caption│                                    │ │
│  │                 │ - Setngs │  ┌──────────────────────────┐      │ │
│  │                 │ - Fulls. │  │   Side Overlays:         │      │ │
│  │                 │ - Chrom. │  │   Volume, Speed, Sub     │      │ │
│  │                 │ - Airplay│  │   Delay Popouts          │      │ │
│  │                 └──────────┘  └──────────────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Meta    │  │  Resume  │  │ Scraping │  │  Source  │ ← State    │
│  │  Part    │  │  Part    │  │  Part    │  │  Select  │   Machine  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Player Store (Zustand + Immer):**

```
┌──────────────────────────────────────────────────────────────────────┐
│                      usePlayerStore (AllSlices)                       │
├────────────┬──────────┬───────────┬────────┬─────────┬──────────────┤
│  Source    │ Playing  │ Progress  │ Display│ Casting │ Interface    │
│  Slice     │ Slice    │ Slice     │ Slice  │ Slice   │ Slice        │
├────────────┼──────────┼───────────┼────────┼─────────┼──────────────┤
│ - status   │ - isPld  │ - time    │ - disp │ - inst  │ - fullscreen │
│ - source   │ - isPsd  │ - duration│ - set  │ - plyr  │ - hovering   │
│ - meta     │ - isLdg  │ - buffered│ Display│ - cntrlr│ - seeking    │
│ - caption  │ - vol    │           │        │         │ - overlays   │
│ - quality  │ - rate   │           │        │         │ - timeFormat │
└────────────┴──────────┴───────────┴────────┴─────────┴──────────────┘
```

### 3.2 PlayerView Page

**File:** `p-stream/src/pages/PlayerView.tsx`

The top-level orchestrator for the entire video player experience. Acts as a state machine controller.

#### Lifecycle States (from `playerStatus`):

```
IDLE → RESUME (if progress > 80%) → SCRAPING → PLAYING
         ↓                              ↓           ↓
     (restart)                   SCRAPE_NOT_FOUND  PLAYBACK_ERROR
                                       ↓               ↓
                                 ScrapeErrorPart  PlaybackErrorPart
```

#### Key Responsibilities:

1. **Route Params Extraction** — Parses `:media`, `:season?`, `:episode?` from URL
2. **Meta Resolution** — `handleMetaReceived()` converts `DetailedMeta` → `PlayerMeta`, checks resume threshold
3. **Scraping Orchestration** — Manages `ScrapingPart` component, handles resume-from-source logic
4. **Stream Loading** — `playAfterScrape()` converts `RunOutput` → source, captions, and triggers playback
5. **Error Recovery** — `handleResumeScraping()` allows retrying from a specific failed source ID
6. **Watch Party** — Auto-opens watch party menu if URL contains `?watchparty` parameter
7. **Onboarding Gate** — Checks if onboarding is needed before showing the player

```typescript
// Core state machine: status transitions drive which UI is shown
status === 'idle'             → <MetaPart />           (fetching TMDB metadata)
status === 'resume'           → <ResumePart />          (ask to resume or restart)
status === 'scraping'         → <ScrapingPart />        (running providers)
status === 'scrapeNotFound'   → <ScrapeErrorPart />     (all sources failed)
status === 'playbackError'    → <PlaybackErrorPart />   (stream failed to play)
status === 'playing'          → Player controls shown   (video is playing)
```

### 3.3 PlayerPart Component

**File:** `p-stream/src/pages/parts/player/PlayerPart.tsx`

The main layout component that composes all player UI elements. Uses compound component pattern via `Player.*` namespace.

#### UI Composition:

**Top Controls** (visible on hover):
- Back button, Title, Episode display, Info button, Bookmark button, BrandPill

**Bottom Controls** (visible on hover):
- Left: Play/Pause, Skip Back/Forward, Volume, Time
- Right: Episodes list, Skip Episode, PiP, AirPlay, Chromecast, Captions, Settings, Fullscreen/Widescreen

**Center Controls:**
- Loading spinner, Auto-play start button, Casting notification, Mobile skip buttons

**Overlays:**
- `PauseOverlay` — shown when paused
- `BlackOverlay` — dims video when controls are shown
- `EpisodesRouter` — episode navigation
- `SettingsRouter` — settings panels
- `SubtitleView` — subtitle display

**Popouts:**
- Volume change indicator
- Subtitle delay indicator
- Speed change indicator
- TIDB submission success

**Special Features:**
- `SkipSegmentButton` — SponsorBlock-style segment skipping (intro, recap, etc.)
- `ThumbsFeedback` — visual feedback when skipping segments
- `NextEpisodeButton` — auto-play next episode
- `UnreleasedEpisodeOverlay` — for unaired episodes
- `WatchPartyStatus` — real-time sync status

**Mobile Adaptations:**
- Touch-to-fullscreen with shift detection (Shift + Fullscreen = Widescreen)
- Simplified mobile control layout
- Conditional PiP disabling for iOS PWA

### 3.4 Player Hooks

#### `usePlayer()` (`p-stream/src/components/player/hooks/usePlayer.ts`)

The central hook that connects the UI to the player store. Provides:

- **`status`** — current player status (IDLE → RESUME → SCRAPING → PLAYING)
- **`playMedia(source, captions, sourceId, startAt?)`** — main playback trigger: sets source, captions, status, and initializes the display
- **`setMeta(m, newStatus?)`** — update metadata
- **`reset()`** — full reset
- **`setScrapeStatus()` / `setScrapeNotFound()`** — scraping state management
- **`shouldStartFromBeginning`** — override for resume behavior

#### `usePlayerMeta()` (`p-stream/src/components/player/hooks/usePlayerMeta.ts`)

Converts `DetailedMeta` (from TMDB) into `PlayerMeta` (internal format) and derives `ScrapeMedia` for the providers engine.

- **`setPlayerMeta(detailedMeta, episodeId?)`** — Converts and sets metadata, auto-detects movie vs series
- **`scrapeMedia`** — memoized `ScrapeMedia` derived from current meta
- Handles episode resolution for series (finds episode by ID within season data)

#### `useInitializePlayer()` (`p-stream/src/components/player/hooks/useInitializePlayer.ts`)

Initializes the display interface (`WebDisplay`) after a source is set. Called by `playMedia()`.

#### `useSkipTime()` (`p-stream/src/components/player/hooks/useSkipTime.ts`)

Manages SponsorBlock-style skip segments (intro, recap, credits, sponsor segments). Returns segments relevant to the current playback position.

### 3.5 Display Interface

**File:** `p-stream/src/components/player/display/displayInterface.ts`

The `DisplayInterface` is an abstraction over the video rendering layer, supporting both web and casting displays.

```typescript
interface DisplayInterface extends Listener<DisplayInterfaceEvents> {
  play(): void;
  pause(): void;
  load(ops: qualityChangeOptions): void;     // load new source
  changeQuality(automatic: boolean, preferred: SourceQuality | null): void;
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
  getType(): 'web' | 'casting';
  getCaptionList(): CaptionListItem[];
  getSubtitleTracks(): MediaPlaylist[];     // HLS.js subtitle tracks
  setSubtitlePreference(lang: string): Promise<void>;
}
```

#### Events Emitted:

| Event | Payload | Description |
|-------|---------|-------------|
| `play` | `void` | Video started playing |
| `pause` | `void` | Video paused |
| `fullscreen` | `boolean` | Fullscreen state changed |
| `volumechange` | `number` | Volume level (0-1) |
| `time` | `number` | Current playback time (seconds) |
| `duration` | `number` | Video duration (seconds) |
| `buffered` | `number` | Amount buffered (seconds) |
| `loading` | `boolean` | Buffering state |
| `qualities` | `SourceQuality[]` | Available quality levels |
| `changedquality` | `SourceQuality \| null` | Quality changed |
| `audiotracks` | `AudioTrack[]` | Available audio tracks |
| `changedaudiotrack` | `AudioTrack \| null` | Audio track changed |
| `needstrack` | `boolean` | Needs subtitle/audio track selection |
| `canairplay` | `boolean` | AirPlay availability |
| `playbackrate` | `number` | Playback speed changed |
| `error` | `DisplayError` | Playback error occurred |

#### Display Types:

- **`'web'`** — Standard browser video player (likely using HLS.js for HLS streams and native `<video>` for MP4)
- **`'casting'`** — Chromecast display interface

#### Error Structure:

```typescript
type DisplayError = {
  stackTrace?: string;
  message?: string;
  key?: string;
  errorName: string;
  type: 'hls' | 'htmlvideo' | 'global';
  hls?: { details: string; fatal: boolean; level?: number; ... };
};
```

### 3.6 Player Store (Zustand + Immer)

**File:** `p-stream/src/stores/player/store.ts`

```typescript
const usePlayerStore = create(
  immer<AllSlices>((...a) => ({
    ...createInterfaceSlice(...a),
    ...createProgressSlice(...a),
    ...createPlayingSlice(...a),
    ...createSourceSlice(...a),
    ...createDisplaySlice(...a),
    ...createCastingSlice(...a),
    ...createThumbnailSlice(...a),
    ...createSkipSegmentsSlice(...a),
  })),
);
```

All 8 slices are composed into a single store using Zustand's `create()` with Immer middleware for immutable updates with mutable syntax.

### 3.7 Store Slices Deep Dive

#### Source Slice (`source.ts`)

The most complex slice — manages the entire streaming state.

**State:**
```typescript
{
  status: playerStatus;              // IDLE | RESUME | SCRAPING | PLAYING | SCRAPE_NOT_FOUND | PLAYBACK_ERROR
  source: SourceSliceSource | null;  // the loaded stream source
  sourceId: string | null;           // which source provider succeeded
  embedId: string | null;           // which embed provider (if any)
  qualities: SourceQuality[];        // available quality options
  audioTracks: AudioTrack[];
  currentQuality: SourceQuality | null;
  currentAudioTrack: AudioTrack | null;
  captionList: CaptionListItem[];
  caption: {
    selected: Caption | null;
    asTrack: boolean;                // use as native track vs overlay
    translateTask: TranslateTask | null;  // active Google Translate task
  };
  meta: PlayerMeta | null;           // current media metadata
  failedSourcesPerMedia: Record<string, string[]>;  // per-media failed source tracking
  failedEmbedsPerMedia: Record<string, Record<string, string[]>>;  // per-media per-source failed embeds
  resumeFromSourceId: string | null;
}
```

**Critical Methods:**

| Method | Description |
|--------|-------------|
| `setSource(stream, captions, startAt)` | Sets source, auto-selects quality, triggers external subtitle scraping |
| `setMeta(meta, status?)` | Updates metadata, auto-clears failed sources/embeds on media change |
| `addFailedSource(sourceId)` | Tracks failed sources per media key for smart retry |
| `addFailedEmbed(sourceId, embedId)` | Tracks failed embeds per source per media |
| `switchQuality(quality)` | Switches quality — for file sources reloads, for HLS delegates to display |
| `redisplaySource(startAt)` | Reloads current source (used after quality change or error recovery) |
| `translateCaption(caption, lang)` | Full pipeline: download → Google Translate → set translated caption |
| `addExternalSubtitles()` | Async scrapes external subtitle providers (opensubtitles, etc.) |

**Media Key Generation:**
```typescript
// Movies:  "movie-{tmdbId}"
// Shows:   "show-{tmdbId}-{seasonTmdbId}-{episodeTmdbId}"
```

**Media Key `getMediaKey(meta)`** — Generates a unique key per media/episode for tracking failed sources/embeds. This enables per-episode failure tracking so a failing source on one episode doesn't affect others.

**Caption Translation System:**

The `translateCaption()` method implements a complete caption translation pipeline:
1. Validates no existing translation task
2. Downloads the source SRT data via `downloadCaption()`
3. Translates text via Google Translate API (`googletranslate`)
4. Stores the translated SRT as a new `Caption` with `-translated-{lang}` ID
5. Supports cancellation via `AbortController`
6. Cleanup via `clearTranslateTask()`

**External Subtitle System:**

`addExternalSubtitles()` dynamically imports `@/utils/externalSubtitles` and appends discovered subtitles to the existing list, avoiding duplicates by ID.

---

#### Playing Slice (`playing.ts`)

Tracks playback state:

```typescript
{
  mediaPlaying: {
    isPlaying: boolean;
    isPaused: boolean;
    isSeeking: boolean;           // progress bar seeking
    isDragSeeking: boolean;       // custom progress bar drag
    isLoading: boolean;           // buffering state
    hasPlayedOnce: boolean;       // first play occurred
    volume: number;
    playbackRate: number;
  };
}
```

---

#### Progress Slice (`progress.ts`)

```typescript
{
  progress: {
    time: number;         // current playback position (seconds)
    duration: number;     // total duration (seconds)
    buffered: number;     // buffered amount (seconds)
    draggingTime: number; // cursor position during progress bar drag
  };
}
```

---

#### Display Slice (`display.ts`)

Manages the `DisplayInterface` instance and wires up all its events to update the store:

```typescript
{
  display: DisplayInterface | null;
  setDisplay(newDisplay: DisplayInterface | null): void;
}
```

**`setDisplay()`** is crucial — it:
1. Destroys any existing display instance
2. Attaches event listeners that auto-update store state:
   - `pause`/`play` → updates `mediaPlaying`
   - `time` → updates `progress.time`
   - `duration` → updates `progress.duration`
   - `buffered` → updates `progress.buffered`
   - `qualities`/`changedquality` → updates quality state
   - `audiotracks`/`changedaudiotrack` → updates audio tracks
   - `error` → sets `PLAYBACK_ERROR` status
   - `volumechange` → updates volume
   - `fullscreen` → updates interface state
   - etc.

---

#### Interface Slice (`interface.ts`)

```typescript
{
  interface: {
    isFullscreen: boolean;
    isSeeking: boolean;
    lastVolume: number;
    hasOpenOverlay: boolean;
    hovering: PlayerHoverState;        // NOT_HOVERING | MOUSE_HOVER | MOBILE_TAPPED
    canAirplay: boolean;
    isCasting: boolean;
    hideNextEpisodeBtn: boolean;
    shouldStartFromBeginning: boolean;
    error?: DisplayError;
    timeFormat: VideoPlayerTimeFormat;  // REGULAR | REMAINING
    isSpeedBoosted: boolean;            // temporary 2x speed
    showSpeedIndicator: boolean;
    // ... debounce timers, control hover states
  };
}
```

---

#### Casting Slice (`casting.ts`)

```typescript
{
  casting: {
    instance: CastContext | null;
    player: RemotePlayer | null;
    controller: RemotePlayerController | null;
    // setters + clear()
  };
}
```

Chromecast integration state.

---

#### Thumbnail Slice (`thumbnails.ts`)

Preview thumbnails for the progress bar scrubber:

```typescript
{
  thumbnails: {
    images: ThumbnailImage[];  // [{ at: number, data: base64 }]
    addImage(img): void;       // inserts in sorted order, deduplicates
    resetImages(): void;
  };
}
```

**`nearestImageAt(images, at)`** — Binary-search-like finder for the closest thumbnail to a given timestamp. Uses distance comparison:

```
// [before] ---X--- [at] ---Y--- [past]
// if X < Y, return [before]; else return [past]
```

---

#### Skip Segments Slice (`skipSegments.ts`)

```typescript
{
  skipSegmentsCacheKey: string | null;
  skipSegments: SegmentData[];
  setSkipSegments(cacheKey, segments): void;
  clearSkipSegments(): void;
}
```

Caches SponsorBlock-style skip segments (intro, credits, recaps, sponsor blocks) per media key.

### 3.8 Quality Management System

**File:** `p-stream/src/stores/player/utils/qualities.ts`

#### Quality Sorting

```typescript
const qualitySorting = {
  unknown: 0,
  '360': 10,
  '480': 20,
  '720': 30,
  '1080': 40,
  '4k': 35,      // 4k intentionally lower — requires faster internet
};
```

Note: 4K is ranked below 1080p to prefer stable playback over maximum resolution.

#### `getPreferredQuality(availableQualities, preferences)`

Smart quality selection algorithm:
1. **Automatic mode** — picks the best available quality from the sorted list
2. **Manual mode** — tries the user's preferred quality, then falls back to next lower quality, then tries higher qualities if none available

#### `selectQuality(source, preferences)`

Converts a `SourceSliceSource` (with quality map) into a single `LoadableSource`:
- For HLS streams — returns the HLS URL directly (HLS handles adaptive bitrate)
- For file sources — uses `getPreferredQuality()` with manual-only selection (file sources can't switch dynamically)

### 3.9 Provider Scraping Integration

**File:** `p-stream/src/hooks/useProviderScrape.tsx`

Connects the `providers` library to the main app's UI.

#### `useScrape()`

**`startScraping(media, startFromSourceId?)`** — The main scraping entry point:

1. **Get providers** — calls `getProviders()` (app-specific provider initialization)
2. **Filter sources** — removes sources that failed for this media (stored in `failedSourcesPerMedia`)
3. **Apply user preferences:**
   - Custom source ordering (`preferredSourceOrder`)
   - Last successful source prioritization (`lastSuccessfulSource`)
   - Custom embed ordering (`preferredEmbedOrder`)
   - Failed embed filtering
4. **Run scraping** — `providers.runAll()` with event callbacks
5. **Post-processing** — if extension is active, calls `prepareStream()` for CORS handling

**`resumeScraping(media, startFromSourceId)`** — Re-runs scraping starting from a specific source ID (used for retry after failure)

#### `useBaseScrape()` — Event State Management

Manages the real-time scraping UI state:

```typescript
// Reactive state for the ScrapingPart component:
sources: Record<string, ScrapingSegment>  // all source/embed states
sourceOrder: ScrapingItems[]              // hierarchical tree
currentSource: string                     // currently scraping

// Each segment has:
{ name, id, embedId?, status: 'failure'|'pending'|'notfound'|'success'|'waiting', reason?, error?, percentage }
```

**Event Handlers:**
- `initEvent` — sets up initial source list with "waiting" status
- `startEvent` — marks previous source as "success", current as "pending"
- `updateEvent` — updates progress percentage and status
- `discoverEmbedsEvent` — adds discovered embeds to the source tree
- `getResult` — marks final source as "success" on completion

#### `useListCenter()` — Scrolling Animation

Auto-scrolls the scraping status list to center the currently active source, creating a smooth animated effect. Handles window resize via event listener.

### 3.10 Player Lifecycle

The complete lifecycle from user clicking "Play" to video rendering:

```
1. User clicks media → navigate to /media/{tmdbId}/{season?}/{episode?}
2. PlayerView renders → status = IDLE
3. <MetaPart /> fetches TMDB metadata → DetailedMeta
4. handleMetaReceived() → PlayerMeta created → status = SCRAPING (or RESUME if >80% watched)
5. <ScrapingPart /> runs → useScrape().startScraping(scrapeMedia)
6. providers.runAll() iterates sources/embeds:
   a. Source scraper searches for content
   b. Returns embeds if not direct stream
   c. Embed scraper extracts stream URLs
   d. Stream validated for playability (HTTP check)
7. playAfterScrape(output) called:
   a. convertRunoutputToSource() → SourceSliceSource
   b. convertProviderCaption() → CaptionListItem[]
   c. playMedia() → setSource + init() → DisplayInterface.load()
8. status = PLAYING → video element renders
9. User watches → progress tracked periodically
10. On error: status = PLAYBACK_ERROR → PlaybackErrorPart → resume from next source
11. On close: last successful source saved, progress synced to backend
```

---

## 4. Cross-Project Integration

### Data Flow

```
TMDB API → p-stream (metadata) → PlayerView → providers (scrape)
  ↓                                              ↓
DetailedMeta                              RunOutput (stream)
  ↓                                              ↓
PlayerMeta → ScrapeMedia                 SourceSliceSource + Captions
  ↓                                              ↓
usePlayerMeta()                          usePlayer.playMedia()
  ↓                                              ↓
status: SCRAPING                         DisplayInterface.load()
                                                  ↓
                                            HLS.js / <video>
                                                  ↓
                                          User watches video
                                                  ↓
                                     Progress tracked in Zustand store
                                                  ↓
                                     Backend API (bookmarks, history)
```

### Browser Extension Integration

When the extension is active (`isExtensionActiveCached()`):
- Streams are prepared via `prepareStream(output.stream)` for CORS bypass
- The extension's declarative net request rules handle header injection
- The `proxiedFetcher` in providers routes requests through the extension

### Backend Integration

- Progress periodically saved via `POST /api/player/status`
- Bookmarks synced via `users/{id}/bookmarks`
- Watch history via `users/{id}/watch-history`
- User preferences include source/embed ordering, theme, subtitle language, proxy URL, Debrid config

---

> **End of Documentation**
> *Generated from source analysis — captures the architecture as implemented in the archived repository.*
