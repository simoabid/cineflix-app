# Streaming Services Integration Documentation

## Overview

This document outlines the successful integration of multiple streaming services into the CineFlix application, providing real streaming functionality for movies and TV shows through Rivestream and CinemaOS.

## What Was Implemented

### 1. Multi-Service Streaming (`src/services/rivestreamService.ts`)

A comprehensive service that interfaces with multiple streaming providers:

#### **Rivestream API Endpoints:**
- **Standard Streaming**: `https://rivestream.org/embed?type={type}&id={tmdbId}`
- **Aggregator Sources**: `https://rivestream.org/embed/agg?type={type}&id={tmdbId}` 
- **Torrent Streaming**: `https://rivestream.org/embed/torrent?type={type}&id={tmdbId}`
- **Direct Downloads**: `https://rivestream.org/download?type={type}&id={tmdbId}`

#### **CinemaOS API Endpoints:**
- **Movies**: `https://cinemaos.tech/player/{tmdb_id}`
- **TV Shows**: `https://cinemaos.tech/player/{tmdb_id}/{season_number}/{episode_number}`

#### **Beech API Endpoints:**
- **Movies**: `https://beech-api.vercel.app/?id={tmdb_id}`
- **TV Shows**: `https://beech-api.vercel.app/?id={tmdb_id}&type=tv&season={season_number}&episode={episode_number}`

#### **Vidjoy API Endpoints:**
- **Movies**: `https://vidjoy.pro/embed/movie/{tmdb_id}`
- **TV Shows**: `https://vidjoy.pro/embed/tv/{tmdb_id}/{season_number}/{episode_number}`

#### **VidSrc API Endpoints:**
- **API 1 Movies**: `https://vidsrc.wtf/api/1/movie/?id={tmdb_id}&color={hexcolor}` (Multi Server)
- **API 1 TV Shows**: `https://vidsrc.wtf/api/1/tv/?id={tmdb_id}&s={season_number}&e={episode_number}` (Multi Server)
- **API 2 Movies**: `https://vidsrc.wtf/api/2/movie/?id={tmdb_id}&color={hexcolor}` (Multi Language)
- **API 2 TV Shows**: `https://vidsrc.wtf/api/2/tv/?id={tmdb_id}&s={season_number}&e={episode_number}` (Multi Language)
- **API 3 Movies**: `https://vidsrc.wtf/api/3/movie/?id={tmdb_id}` (Multi Embeds)
- **API 3 TV Shows**: `https://vidsrc.wtf/api/3/tv/?id={tmdb_id}&s={season_number}&e={episode_number}` (Multi Embeds)
- **API 4 Movies**: `https://vidsrc.wtf/api/4/movie/?id={tmdb_id}` (Premium Embeds)
- **API 4 TV Shows**: `https://vidsrc.wtf/api/4/tv/?id={tmdb_id}&s={season_number}&e={episode_number}` (Premium Embeds)

#### **VidFast API Endpoints:**
- **Movies**: `https://vidfast.pro/movie/{tmdb_id}?autoPlay=true`
- **TV Shows**: `https://vidfast.pro/tv/{tmdb_id}/{season_number}/{episode_number}?autoPlay=true`

**Features:**
- Automatic URL building for movies and TV shows (with season/episode support)
- Multiple streaming provider integration
- Quality detection and server reliability classification
- Error handling and fallback mechanisms
- Provider-specific URL generation methods

### 2. Enhanced WatchPage Component (`src/pages/WatchPage.tsx`)

**Key Updates:**
- Replaced mock streaming data with real streaming sources from multiple providers
- Added dynamic episode/season selection for TV shows
- Integrated loading states and error handling
- Auto-selection of premium sources when available (Rivestream Server 2 by default)
- Real-time source switching capabilities
- Support for both Rivestream and CinemaOS streaming

**TV Show Support:**
- Season and episode dropdown selectors
- Automatic source refresh when episode changes
- Dynamic URL generation for episode-specific content

### 3. Redesigned Stream Sources Interface (`src/components/WatchPage/StreamSources.tsx`)

**New Design Structure:**
- **Rivestream Card**: Single consolidated card containing all Rivestream server variants
  - Rivestream Server 1 (Standard)
  - Rivestream Server 2 (Aggregator - Recommended)
  - Rivestream Server 3 (Torrent)
- **VidSrc Card**: Single consolidated card containing all VidSrc API variants
  - VidSrc API 1 (Multi Server)
  - VidSrc API 2 (Multi Language)
  - VidSrc API 3 (Multi Embeds)
  - VidSrc API 4 (Premium)
- **Individual Service Cards**: Separate cards for each streaming provider
  - CinemaOS (Fully functional with blue branding)
  - Beech (Fully functional with green branding)
  - Vidjoy (Fully functional with purple branding)
  - VidFast (Fully functional with cyan branding)
  - EmbedSu (Placeholder)

**Visual Enhancements:**
- Service-specific branding and colors
- Recommended badges for preferred options
- Quality indicators and reliability status
- Ad-free badges and subtitle information
- Connection quality visualization

### 4. Video Player Integration (`src/components/WatchPage/VideoFrame.tsx`)

**Enhanced Features:**
- Real iframe embedding of streaming players (Rivestream + CinemaOS + Beech)
- Seamless transition between poster view and video player
- Exit/pause functionality for iframe players
- Source information display overlay with service-specific badges
- Error handling for failed iframe loads
- Service-specific notices and user guidance

**Player States:**
- **Poster Mode**: Shows backdrop image with play button
- **Streaming Mode**: Full iframe player with Rivestream content
- **Error Mode**: Retry functionality for failed streams

### 4. Error Handling & Fallbacks

**Robust Error Management:**
- Network connectivity error handling
- Source availability checking
- Automatic fallback to basic Rivestream endpoints
- User-friendly error messages with retry options
- Loading states during source fetching

**Fallback Strategy:**
```typescript
// If primary sources fail, provide direct Rivestream links
{
  id: 'fallback_1',
  name: 'Fallback Server',
  url: `https://rivestream.org/embed?type=${type}&id=${contentId}`,
  type: 'hls',
  quality: 'HD',
  reliability: 'Stable'
}
```

## How It Works

### Movie Streaming Flow
1. User navigates to `/watch/movie/:id`
2. WatchPage fetches movie details from TMDB
3. Simultaneously fetches Rivestream sources using movie's TMDB ID
4. Presents multiple streaming options (Standard, Aggregator, Torrent)
5. User selects preferred source
6. VideoFrame embeds Rivestream iframe with selected source URL

### TV Show Streaming Flow
1. User navigates to `/watch/tv/:id`
2. WatchPage fetches TV show details from TMDB
3. User selects season and episode from dropdowns
4. System fetches Rivestream sources for specific episode
5. Presents streaming options for selected episode
6. VideoFrame embeds episode-specific Rivestream player

### Source Selection Logic
```typescript
// Auto-select best available source
const premiumSource = streamSources.find(s => s.reliability === 'Premium') || streamSources[0];
setSelectedSource(premiumSource);
```

## API Integration Details

### Rivestream Endpoints Used

1. **Standard Embed**: Most compatible, works on all devices
2. **Aggregator Embed**: Multiple servers for better reliability  
3. **Torrent Embed**: High-quality torrent-backed streaming
4. **Download API**: Direct file downloads in multiple qualities

### URL Structure Examples

**Movies:**
```
https://rivestream.org/embed?type=movie&id=550
https://rivestream.org/embed/agg?type=movie&id=550
https://rivestream.org/embed/torrent?type=movie&id=550
```

**TV Shows:**
```
https://rivestream.org/embed?type=tv&id=1399&season=1&episode=1
https://rivestream.org/embed/agg?type=tv&id=1399&season=1&episode=1
```

## User Experience Improvements

### Before Integration
- Mock streaming data only
- No actual video playback
- Limited to poster images and fake controls

### After Integration
- ✅ Real streaming from multiple providers (Rivestream, CinemaOS, Beech, Vidjoy)
- ✅ Multiple quality options (SD, HD, FHD, 4K)
- ✅ Episode-by-episode TV show streaming
- ✅ Multiple server options for reliability
- ✅ Download capabilities
- ✅ Torrent streaming options
- ✅ Error handling with fallbacks
- ✅ Loading states and progress indicators

## Example API URLs

### Beech Streaming Service

#### **For Movies (e.g., Fight Club - TMDB ID: 550):**
```
https://beech-api.vercel.app/?id=550
```

#### **For TV Shows (e.g., Game of Thrones S1E1 - TMDB ID: 1399):**
```
https://beech-api.vercel.app/?id=1399&type=tv&season=1&episode=1
```

### Vidjoy Streaming Service

#### **For Movies (e.g., Fight Club - TMDB ID: 550):**
```
https://vidjoy.pro/embed/movie/550
```

#### **For TV Shows (e.g., Game of Thrones S1E1 - TMDB ID: 1399):**
```
https://vidjoy.pro/embed/tv/1399/1/1
```

## Technical Benefits

1. **No Backend Required**: Direct integration with Rivestream API
2. **TMDB Compatibility**: Uses existing TMDB IDs for content matching
3. **Responsive Design**: Works on all device types
4. **Error Resilience**: Multiple fallback mechanisms
5. **Performance**: Lazy loading of sources, efficient state management

## Future Enhancements

Potential improvements for the integration:

1. **Source Quality Testing**: Real-time connectivity testing
2. **User Preferences**: Remember preferred source types
3. **Subtitle Management**: Enhanced subtitle selection
4. **Chromecast Support**: Cast integration for smart TVs
5. **Watch History**: Track and resume viewing progress
6. **Source Ratings**: User feedback on source quality

## Security & Compliance

- All streaming is handled by Rivestream's servers
- No content hosted on CineFlix infrastructure  
- User privacy maintained through iframe sandboxing
- CORS-compliant implementation

This integration transforms CineFlix from a content discovery platform into a full-featured streaming application with real playback capabilities.