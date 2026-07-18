import { describe, it, expect } from 'vitest';
import {
  mapScrapeMediaToRequest,
  mapQuality,
  mapSubtitleToCaption,
  mapCineProResultToStreams,
  mapCineProResultToStreamsWithMeta,
} from '../mapper';
import { ScrapeMedia, Stream } from '@/lib/providers/engine';
import { CineProSource, CineProSubtitle } from '../types';

describe('CinePro Mapper', () => {
  describe('mapScrapeMediaToRequest', () => {
    it('should map a movie correctly', () => {
      const inputMedia: ScrapeMedia = {
        type: 'movie',
        title: 'Inception',
        releaseYear: 2010,
        tmdbId: '27205',
        imdbId: 'tt1375666',
      };
      const actualRequest = mapScrapeMediaToRequest(inputMedia);
      expect(actualRequest.tmdbId).toBe('27205');
      expect(actualRequest.type).toBe('movie');
      expect(actualRequest.title).toBe('Inception');
      expect(actualRequest.imdbId).toBe('tt1375666');
    });

    it('should map a TV show episode correctly', () => {
      const inputMedia: ScrapeMedia = {
        type: 'show',
        title: 'Breaking Bad',
        releaseYear: 2008,
        tmdbId: '1396',
        imdbId: 'tt0903747',
        season: {
          number: 5,
          tmdbId: 'season_5',
          title: 'Season 5',
        },
        episode: {
          number: 14,
          tmdbId: 'episode_14',
        },
      };
      const actualRequest = mapScrapeMediaToRequest(inputMedia);
      expect(actualRequest.tmdbId).toBe('1396');
      expect(actualRequest.type).toBe('tv');
      expect(actualRequest.s).toBe(5);
      expect(actualRequest.e).toBe(14);
      expect(actualRequest.title).toBe('Breaking Bad');
    });
  });

  describe('mapQuality', () => {
    it('should map 4k quality strings correctly', () => {
      expect(mapQuality('4k')).toBe('4k');
      expect(mapQuality('2160p')).toBe('4k');
      expect(mapQuality('UHD')).toBe('4k');
    });

    it('should map 1080p quality strings correctly', () => {
      expect(mapQuality('1080p')).toBe('1080');
      expect(mapQuality('fhd')).toBe('1080');
    });

    it('should map 720p quality strings correctly', () => {
      expect(mapQuality('720p')).toBe('720');
      expect(mapQuality('hd')).toBe('720');
    });

    it('should map 480p quality strings correctly', () => {
      expect(mapQuality('480p')).toBe('480');
      expect(mapQuality('sd')).toBe('480');
    });

    it('should fallback to unknown', () => {
      expect(mapQuality('xyz')).toBe('unknown');
      expect(mapQuality('')).toBe('unknown');
      expect(mapQuality('auto')).toBe('unknown');
    });

    it('should handle whitespace and mixed case', () => {
      expect(mapQuality(' 720p ')).toBe('720');
      expect(mapQuality('FHD')).toBe('1080');
      expect(mapQuality('Fhd')).toBe('1080');
    });

    it('should map standalone hd/sd strictly', () => {
      expect(mapQuality('hd')).toBe('720');
      expect(mapQuality('sd')).toBe('480');
      // 'hd720' should still match via includes('720')
      expect(mapQuality('hd720')).toBe('720');
    });

    it('should map 360p quality', () => {
      expect(mapQuality('360p')).toBe('360');
      expect(mapQuality('360')).toBe('360');
    });
  });

  describe('mapSubtitleToCaption', () => {
    it('should map ass/ssa subtitles (converted to srt type for player)', () => {
      const input = {
        url: 'http://proxy.com/sub.ass',
        label: 'English',
        format: 'ass' as const,
      };
      const actual = mapSubtitleToCaption(input, 2);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe('srt');
      expect(actual?.url).toBe('http://proxy.com/sub.ass');
    });

    it('should map vtt subtitle correctly', () => {
      const inputSubtitle: CineProSubtitle = {
        url: 'http://proxy.com/sub.vtt',
        label: 'English',
        format: 'vtt',
      };
      const actualCaption = mapSubtitleToCaption(inputSubtitle, 1);
      expect(actualCaption).not.toBeNull();
      expect(actualCaption?.type).toBe('vtt');
      expect(actualCaption?.url).toBe('http://proxy.com/sub.vtt');
      expect(actualCaption?.language).toBe('en');
    });

    it('should return null for unsupported formats', () => {
      const inputSubtitle: CineProSubtitle = {
        url: 'http://proxy.com/sub.ttml',
        label: 'English',
        format: 'ttml',
      };
      const actualCaption = mapSubtitleToCaption(inputSubtitle, 1);
      expect(actualCaption).toBeNull();
    });
  });

  describe('mapCineProResultToStreams', () => {
    it('should group file-based sources by provider', () => {
      const mockSource1: CineProSource = {
        url: 'http://proxy.com/movie_1080.mp4',
        type: 'mp4',
        quality: '1080p',
        audioTracks: [],
        provider: { id: 'vidsrc', name: 'VidSrc' },
      };
      const mockSource2: CineProSource = {
        url: 'http://proxy.com/movie_720.mp4',
        type: 'mp4',
        quality: '720p',
        audioTracks: [],
        provider: { id: 'vidsrc', name: 'VidSrc' },
      };
      const mockSubtitle: CineProSubtitle = {
        url: 'http://proxy.com/sub.vtt',
        label: 'English',
        format: 'vtt',
      };
      const actualStreams: Stream[] = mapCineProResultToStreams(
        [mockSource1, mockSource2],
        [mockSubtitle]
      );
      expect(actualStreams.length).toBe(1);
      const mainStream = actualStreams[0];
      expect(mainStream.type).toBe('file');
      if (mainStream.type === 'file') {
        expect(mainStream.qualities['1080']?.url).toBe('http://proxy.com/movie_1080.mp4');
        expect(mainStream.qualities['720']?.url).toBe('http://proxy.com/movie_720.mp4');
      }
      expect(mainStream.captions.length).toBe(1);
    });

    it('should return separate stream objects for HLS sources', () => {
      const mockSource: CineProSource = {
        url: 'http://proxy.com/stream.m3u8',
        type: 'hls',
        quality: '1080p',
        audioTracks: [],
        provider: { id: 'vixsrc', name: 'VixSrc' },
      };
      const actualStreams: Stream[] = mapCineProResultToStreams([mockSource], []);
      expect(actualStreams.length).toBe(1);
      const firstStream = actualStreams[0];
      expect(firstStream.type).toBe('hls');
      if (firstStream.type === 'hls') {
        expect(firstStream.playlist).toBe('http://proxy.com/stream.m3u8');
      }
    });
  });

  describe('mapCineProResultToStreamsWithMeta', () => {
    it('should attach provider metadata to each stream', () => {
      const mockSource1080: CineProSource = {
        url: 'http://proxy.com/movie_1080.mp4',
        type: 'mp4',
        quality: '1080p',
        audioTracks: [],
        provider: { id: 'vidsrc', name: 'VidSrc' },
      };
      const mockSource720: CineProSource = {
        url: 'http://proxy.com/movie_720.mp4',
        type: 'mp4',
        quality: '720p',
        audioTracks: [],
        provider: { id: 'vidsrc', name: 'VidSrc' },
      };
      const mockHls: CineProSource = {
        url: 'http://proxy.com/stream.m3u8',
        type: 'hls',
        quality: '1080p',
        audioTracks: [],
        provider: { id: 'vixsrc', name: 'VixSrc' },
      };
      const results = mapCineProResultToStreamsWithMeta(
        [mockSource1080, mockSource720, mockHls],
        []
      );

      // Should produce 2 results: 1 grouped file stream + 1 HLS stream
      expect(results.length).toBe(2);

      // HLS stream carries VixSrc metadata
      const hlsResult = results.find((r) => r.stream.type === 'hls');
      expect(hlsResult?.providerId).toBe('vixsrc');
      expect(hlsResult?.providerName).toBe('VixSrc');

      // File stream carries VidSrc metadata with best quality label
      const fileResult = results.find((r) => r.stream.type === 'file');
      expect(fileResult?.providerId).toBe('vidsrc');
      expect(fileResult?.providerName).toBe('VidSrc');
      expect(fileResult?.quality).toBe('1080p'); // best of the group
    });

    it('should generate deterministic IDs', () => {
      const mockSource: CineProSource = {
        url: 'http://proxy.com/stream.m3u8',
        type: 'hls',
        quality: '1080p',
        audioTracks: [],
        provider: { id: 'test', name: 'Test' },
      };
      const results1 = mapCineProResultToStreamsWithMeta([mockSource], []);
      const results2 = mapCineProResultToStreamsWithMeta([mockSource], []);
      expect(results1[0].stream.id).toBe(results2[0].stream.id);
    });
  });
});
