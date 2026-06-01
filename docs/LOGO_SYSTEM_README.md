# CineFlix Logo Display System

## Overview

The CineFlix logo display system replaces text titles with official movie and TV show logos when available, providing a more authentic Netflix-like streaming experience. The system includes intelligent fallbacks, caching, and performance optimizations.

## Features

### ✨ Core Features
- **Official Logos**: Fetches authentic movie/TV show logos from TMDB API
- **Smart Fallbacks**: Automatically falls back to styled text titles when logos aren't available
- **Caching System**: Intelligent caching reduces API calls and improves performance
- **Responsive Design**: Logos adapt to different screen sizes and containers
- **Loading States**: Smooth transitions between loading, logo display, and fallback states
- **Error Handling**: Graceful error handling with automatic fallback to text

### 🎨 Visual Enhancements
- **Drop Shadows**: Professional drop shadow effects for better readability
- **Glow Effects**: Netflix-red glow effects on hover
- **Smooth Animations**: CSS transitions for loading and hover states
- **Responsive Sizing**: Logos scale appropriately across different components

### ⚡ Performance Features
- **Batch Fetching**: Preloads logos for multiple items simultaneously
- **Memory Caching**: 24-hour cache with automatic cleanup
- **Failed Request Tracking**: Prevents repeated failed API calls
- **Lazy Loading**: Logos load only when needed

## Implementation

### Data Structure Updates

Added `logo_path` field to core interfaces:

```typescript
interface Movie {
  // ... existing fields
  logo_path?: string | null;
}

interface TVShow {
  // ... existing fields  
  logo_path?: string | null;
}

interface Content {
  // ... existing fields
  logo_path?: string | null;
}
```

### Components

#### LogoImage Component
The main component for displaying logos with fallbacks:

```tsx
<LogoImage
  logoPath={item.logo_path}
  title={item.title}
  size="md"
  className="justify-start"
  textClassName="text-xl font-bold"
  maxHeight="max-h-16"
/>
```

**Props:**
- `logoPath`: Path to the logo image
- `title`: Fallback text title
- `size`: Logo size ('sm', 'md', 'lg', 'xl')
- `className`: Additional CSS classes
- `textClassName`: Classes for fallback text
- `maxHeight`: Maximum height constraint
- `priority`: 'logo' or 'text' preference
- `onLogoLoad/onLogoError`: Event callbacks

#### Updated Components
- **ContentCard**: Uses logos in card overlays and title areas
- **HeroCarousel**: Displays large logos in hero sections
- **HoverPreviewCard**: Shows logos in preview popups

### API Integration

#### TMDB Logo Fetching
Enhanced movie and TV show detail fetching:

```typescript
// Fetches logos from TMDB images endpoint
const imagesResponse = await tmdbApi.get(`/movie/${id}/images`);
const logos = imagesResponse.data.logos;

// Prefers English logos, falls back to any available
const englishLogo = logos.find(logo => 
  logo.iso_639_1 === 'en' || logo.iso_639_1 === null
);
```

#### Batch Processing
```typescript
// Preload logos for multiple items
await batchFetchLogos([
  { id: 123, type: 'movie' },
  { id: 456, type: 'tv' }
]);
```

### Caching System

#### LogoCacheService
Intelligent caching with:
- **24-hour cache duration**
- **1000 item maximum capacity**
- **Automatic cleanup of expired entries**
- **Failed request tracking**

```typescript
// Cache usage
const cachedLogo = logoCache.getLogo(id, 'movie');
logoCache.setLogo(id, 'movie', logoPath);
```

### CSS Styling

#### Logo-Specific Styles
```css
.logo-glow {
  filter: drop-shadow(0 0 10px rgba(229, 9, 20, 0.3)) 
          drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
}

.logo-glow-hover:hover {
  filter: drop-shadow(0 0 15px rgba(229, 9, 20, 0.5)) 
          drop-shadow(0 6px 16px rgba(0, 0, 0, 0.8));
}

.text-shadow-lg {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 
               0 0 20px rgba(0, 0, 0, 0.5);
}
```

## Usage Examples

### Basic Logo Display
```tsx
<LogoImage
  logoPath="/logos/movie-logo.png"
  title="Movie Title"
  size="md"
/>
```

### Hero Section Logo
```tsx
<LogoImage
  logoPath={currentItem.logo_path}
  title={currentItem.title}
  size="xl"
  className="justify-start"
  textClassName="text-3xl md:text-5xl font-bold"
  maxHeight="max-h-20 md:max-h-28"
/>
```

### Content Card Logo
```tsx
<LogoImage
  logoPath={item.logo_path}
  title={title}
  size="sm"
  className="justify-start"
  textClassName="text-sm md:text-base font-semibold"
  maxHeight="max-h-8 md:max-h-10"
/>
```

## Performance Considerations

### Optimization Strategies
1. **Caching**: 24-hour memory cache reduces API calls
2. **Batch Loading**: Process multiple logos simultaneously
3. **Error Tracking**: Avoid repeated failed requests
4. **Lazy Loading**: Load logos only when components mount
5. **Size Optimization**: Use appropriate TMDB image sizes

### Memory Management
- **Cache Cleanup**: Automatic removal of expired entries
- **Size Limits**: Maximum 1000 cached entries
- **Garbage Collection**: Removes oldest entries when limit reached

## Error Handling

### Fallback Strategy
1. **Logo Available**: Display logo with effects
2. **Logo Loading**: Show text while loading
3. **Logo Failed**: Fall back to styled text
4. **No Logo Path**: Display text immediately

### Error States
- Network errors fall back gracefully
- Invalid logo URLs trigger text fallback
- Failed requests are cached to prevent retries

## Browser Support

### Compatibility
- **Modern Browsers**: Full feature support
- **Legacy Browsers**: Graceful degradation to text
- **Mobile Devices**: Responsive logo sizing
- **Touch Devices**: Optimized hover effects

### Performance
- **WebP Support**: Modern image format when available
- **PNG Fallback**: Universal compatibility
- **CDN Delivery**: Fast logo loading via TMDB CDN

## Future Enhancements

### Planned Features
- **Logo Variants**: Support for different logo styles (light/dark)
- **Custom Logos**: Manual logo override system
- **Logo Analytics**: Track logo usage and performance
- **Preloading**: Intelligent logo preloading based on user behavior

### Potential Improvements
- **Service Worker**: Offline logo caching
- **WebP Conversion**: Automatic format optimization
- **Logo Quality**: Machine learning for logo quality assessment
- **A/B Testing**: Logo vs text performance comparison

## Troubleshooting

### Common Issues

#### Logos Not Loading
1. Check TMDB API key validity
2. Verify network connectivity
3. Check browser console for errors
4. Clear logo cache if needed

#### Performance Issues
1. Monitor cache size with `logoCache.getCacheStats()`
2. Clear cache with `logoCache.clearCache()`
3. Check for memory leaks in browser dev tools

#### Styling Issues
1. Verify CSS classes are loaded
2. Check for conflicting styles
3. Test responsive breakpoints

### Debug Tools
```typescript
// Cache statistics
console.log(logoCache.getCacheStats());

// Clear cache
logoCache.clearCache();

// Check if logo failed previously
const failed = logoCache.hasLogoFailed(123, 'movie');
```

## API Reference

### LogoImage Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logoPath` | `string \| null` | - | Path to logo image |
| `title` | `string` | - | Fallback text title |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Logo size preset |
| `className` | `string` | `''` | Additional CSS classes |
| `textClassName` | `string` | `''` | Text fallback classes |
| `priority` | `'logo' \| 'text'` | `'logo'` | Display preference |
| `maxHeight` | `string` | - | Maximum height override |
| `onLogoLoad` | `() => void` | - | Logo load callback |
| `onLogoError` | `() => void` | - | Logo error callback |

### Cache Methods
| Method | Description |
|--------|-------------|
| `getLogo(id, type)` | Retrieve cached logo |
| `setLogo(id, type, path, failed?)` | Cache logo path |
| `clearCache()` | Clear all cached logos |
| `getCacheStats()` | Get cache statistics |
| `preloadLogos(items)` | Batch preload logos |
| `hasLogoFailed(id, type)` | Check if logo failed |

## Contributing

When adding new components that display titles, please:

1. Import the LogoImage component
2. Pass the `logo_path` field from your data
3. Provide appropriate fallback text
4. Use responsive sizing presets
5. Test with and without logos available

Example integration:
```tsx
import LogoImage from './LogoImage';

// In your component
<LogoImage
  logoPath={item.logo_path}
  title={item.title || item.name}
  size="md"
  className="justify-center"
/>
```

This system provides a professional, Netflix-like experience while maintaining excellent performance and fallback capabilities. 