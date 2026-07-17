/**
 * CinePro Core API types representing the OMSS structure.
 */

export interface CineProSource {
  url: string;
  /** Core may also emit "embed" (iframe-only) — client filters those out. */
  type: 'hls' | 'mp4' | 'dash' | 'mkv' | 'webm' | 'embed' | string;
  quality: string;
  audioTracks?: Array<{ language: string; label: string }>;
  provider: { id: string; name: string };
}

export interface CineProSubtitle {
  url: string;
  label: string;
  format: 'vtt' | 'srt' | 'ass' | 'ssa' | 'ttml';
}

export interface CineProDiagnostic {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface CineProScrapeResponse {
  sources: CineProSource[];
  subtitles: CineProSubtitle[];
  diagnostics: CineProDiagnostic[];
}

export interface CineProProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
  /** Lower = higher priority (from core progressive ranking). */
  priority?: number;
  tier?: string | null;
}

export interface CineProScrapeRequest {
  tmdbId: string;
  type: 'movie' | 'tv';
  title?: string;
  s?: number;
  e?: number;
  imdbId?: string;
}
