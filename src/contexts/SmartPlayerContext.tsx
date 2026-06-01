import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMovieDetails, getTVShowDetails } from '@/services/tmdb';
import { rivestreamService } from '@/services/rivestreamService';
import { SmashyStreamService } from '@/services/smashystream';
import { Movies111Service } from '@/services/111movies';
import type { Movie, TVShow, StreamSource } from '@/types';

export interface SmartPlayerRequest {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  preferClassic?: boolean;
}

export interface SmartPlayerContextValue {
  isOpen: boolean;
  currentRequest: SmartPlayerRequest | null;
  content: Movie | TVShow | null;
  loading: boolean;
  error: string | null;
  streamSources: StreamSource[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  selectedSource: StreamSource | null;
  selectedSeason: number;
  selectedEpisode: number;
  openPlayer: (request: SmartPlayerRequest) => void;
  closePlayer: () => void;
  setSelectedSource: (source: StreamSource | null) => void;
  setSelectedSeason: (season: number) => void;
  setSelectedEpisode: (episode: number) => void;
  fetchStreamingSources: (contentId: number, season: number, episode: number) => Promise<void>;
}

export const SmartPlayerContext = createContext<SmartPlayerContextValue | undefined>(undefined);

interface SmartPlayerProviderProps {
  children: React.ReactNode;
}

/**
 * SmartPlayerProvider wraps the application and exposes state and functions
 * to launch, fetch details, and manage streaming fallback sources for the Smart Player.
 */
export const SmartPlayerProvider: React.FC<SmartPlayerProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentRequest, setCurrentRequest] = useState<SmartPlayerRequest | null>(null);
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  const openPlayer = useCallback((request: SmartPlayerRequest) => {
    setCurrentRequest(request);
    setSelectedSeason(request.season ?? 1);
    setSelectedEpisode(request.episode ?? 1);
    setIsOpen(true);
  }, []);

  const closePlayer = useCallback(() => {
    setIsOpen(false);
    setCurrentRequest(null);
    setContent(null);
    setStreamSources([]);
    setSelectedSource(null);
    setError(null);
    setSourcesError(null);
  }, []);

  // Function to fetch all classic/streaming fallback sources
  const fetchStreamingSources = useCallback(async (contentId: number, season: number, episode: number) => {
    if (!contentId || !currentRequest) return;

    const type = currentRequest.type;
    try {
      setSourcesLoading(true);
      setSourcesError(null);

      const rivestreamOptions = {
        contentType: type,
        tmdbId: contentId,
        ...(type === 'tv' && { season, episode })
      };

      // Fetch Rivestream sources
      const { streamSources: rivestreamSources } = await rivestreamService.getAllContentData(rivestreamOptions);

      // Generate SmashyStream sources
      let smashyStreamSources: StreamSource[] = [];
      try {
        if (type === 'movie') {
          smashyStreamSources = SmashyStreamService.generateMovieSources(contentId).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
          }));
        } else if (type === 'tv') {
          smashyStreamSources = SmashyStreamService.generateTVSource(contentId, season, episode).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
          }));
        }
      } catch (smashyError) {
        console.warn('SmashyStream sources unavailable:', smashyError);
      }

      // Generate 111movies sources
      let movies111Sources: StreamSource[] = [];
      try {
        if (type === 'movie') {
          movies111Sources = Movies111Service.generateMovieSources(contentId).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: Movies111Service.getSupportedSubtitleLanguages()
          }));
        } else if (type === 'tv') {
          movies111Sources = Movies111Service.generateTVSource(contentId, season, episode).map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            type: source.type,
            quality: source.quality,
            fileSize: source.fileSize,
            reliability: source.reliability,
            isAdFree: source.isAdFree,
            language: source.language,
            subtitles: Movies111Service.getSupportedSubtitleLanguages()
          }));
        }
      } catch (movies111Error) {
        console.warn('111movies sources unavailable:', movies111Error);
      }

      // Combine all stream sources
      const allStreamSources = [...rivestreamSources, ...smashyStreamSources, ...movies111Sources];

      if (allStreamSources.length === 0) {
        throw new Error('No streaming sources available for this content');
      }

      setStreamSources(allStreamSources);

      // Auto-select VidSrc as default, then fallback to other premium sources
      const defaultSource = allStreamSources.find(s => s.id.startsWith('vidsrc_api_')) ||
        allStreamSources.find(s => s.id === 'vidjoy_player') ||
        allStreamSources.find(s => s.id === 'rivestream_server_2') ||
        allStreamSources.find(s => s.reliability === 'Premium') ||
        allStreamSources[0] ||
        null;
      
      setSelectedSource(defaultSource);

    } catch (err) {
      console.error('Error fetching streaming sources:', err);
      setSourcesError(err instanceof Error ? err.message : 'Failed to load streaming sources');

      // Fallback: provide basic sources even if API fails
      const fallbackSources: StreamSource[] = [
        {
          id: 'vidjoy_player',
          name: 'Vidjoy',
          url: `https://vidjoy.pro/embed/${type}/${contentId}${type === 'tv' ? `/${season}/${episode}` : ''}`,
          type: 'hls',
          quality: 'FHD',
          fileSize: 'Auto',
          reliability: 'Premium',
          isAdFree: true,
          language: 'English',
          subtitles: ['English']
        },
        {
          id: 'rivestream_server_2',
          name: 'Rivestream Server 2',
          url: `https://rivestream.org/embed/agg?type=${type}&id=${contentId}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`,
          type: 'hls',
          quality: 'HD',
          fileSize: 'Auto',
          reliability: 'Premium',
          isAdFree: true,
          language: 'English',
          subtitles: ['English']
        }
      ];

      // Add SmashyStream fallback sources
      try {
        let smashyFallback: any[] = [];
        if (type === 'movie') {
          smashyFallback = SmashyStreamService.generateMovieSources(contentId);
        } else if (type === 'tv') {
          smashyFallback = SmashyStreamService.generateTVSource(contentId, season, episode);
        }

        const smashyFallbackSources = smashyFallback.map(source => ({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          quality: source.quality,
          fileSize: source.fileSize,
          reliability: source.reliability,
          isAdFree: source.isAdFree,
          language: source.language,
          subtitles: SmashyStreamService.getSupportedSubtitleLanguages()
        }));

        fallbackSources.push(...smashyFallbackSources);
      } catch (fallbackError) {
        console.warn('SmashyStream fallback failed:', fallbackError);
      }

      // Add 111movies fallback sources
      try {
        let movies111Fallback: any[] = [];
        if (type === 'movie') {
          movies111Fallback = Movies111Service.generateMovieSources(contentId);
        } else if (type === 'tv') {
          movies111Fallback = Movies111Service.generateTVSource(contentId, season, episode);
        }

        const movies111FallbackSources = movies111Fallback.map(source => ({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          quality: source.quality,
          fileSize: source.fileSize,
          reliability: source.reliability,
          isAdFree: source.isAdFree,
          language: source.language,
          subtitles: Movies111Service.getSupportedSubtitleLanguages()
        }));

        fallbackSources.push(...movies111FallbackSources);
      } catch (fallbackError) {
        console.warn('111movies fallback failed:', fallbackError);
      }

      setStreamSources(fallbackSources);
      if (fallbackSources.length > 0) {
        setSelectedSource(fallbackSources[0]);
      }
    } finally {
      setSourcesLoading(false);
    }
  }, [currentRequest]);

  // Fetch TMDB content details when currentRequest changes
  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!currentRequest) return;

      try {
        setLoading(true);
        setError(null);
        const contentId = currentRequest.tmdbId;

        let contentData: Movie | TVShow;
        if (currentRequest.type === 'movie') {
          contentData = await getMovieDetails(contentId);
        } else {
          contentData = await getTVShowDetails(contentId);
        }

        setContent(contentData);
        await fetchStreamingSources(contentId, selectedSeason, selectedEpisode);
      } catch (err) {
        console.error('Error fetching TMDB content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load details from TMDB');
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [currentRequest]);

  // Fetch new streaming sources when season or episode changes
  useEffect(() => {
    if (content && currentRequest && currentRequest.type === 'tv') {
      fetchStreamingSources(content.id, selectedSeason, selectedEpisode);
    }
  }, [content, selectedSeason, selectedEpisode]);

  return (
    <SmartPlayerContext.Provider
      value={{
        isOpen,
        currentRequest,
        content,
        loading,
        error,
        streamSources,
        sourcesLoading,
        sourcesError,
        selectedSource,
        selectedSeason,
        selectedEpisode,
        openPlayer,
        closePlayer,
        setSelectedSource,
        setSelectedSeason,
        setSelectedEpisode,
        fetchStreamingSources
      }}
    >
      {children}
    </SmartPlayerContext.Provider>
  );
};
