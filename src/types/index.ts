export interface ExternalIds {
  id: number;
  imdb_id?: string;
  facebook_id?: string;
  instagram_id?: string;
  twitter_id?: string;
  freebase_mid?: string;
  freebase_id?: string;
  tvdb_id?: number;
  tvrage_id?: number;
  wikidata_id?: string;
}

export interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface WatchProvidersData {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface WatchProvidersResponse {
  id: number;
  results: {
    [key: string]: WatchProvidersData; // e.g., "US", "GB"
  };
}

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_path?: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: Genre[];
  runtime?: number;
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string;
  homepage?: string;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  external_ids?: ExternalIds;
}

export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_path?: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: Genre[];
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  homepage?: string;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  external_ids?: ExternalIds;
  seasons?: Season[];
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

export interface Episode {
  air_date: string;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: number; // runtime in minutes (api returns runtime)
  season_number: number;
  show_id: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface MovieCredits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  gender: number;
  homepage: string | null;
  imdb_id: string | null;
  also_known_as: string[];
}

export interface PersonMovieCredits {
  cast: MovieCredit[];
  crew: MovieCredit[];
}

export interface MovieCredit {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  character?: string;
  job?: string;
  department?: string;
  popularity: number;
}

export interface Content {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
  media_type: 'movie' | 'tv';
}

export interface ApiResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Category {
  id: string;
  name: string;
  endpoint: string;
  type: 'movie' | 'tv';
}

export interface ImageConfig {
  base_url: string;
  secure_base_url: string;
  backdrop_sizes: string[];
  logo_sizes: string[];
  poster_sizes: string[];
  profile_sizes: string[];
  still_sizes: string[];
}

// Collection/Franchise Types
export interface Collection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
}

export interface CollectionDetails extends Collection {
  film_count: number;
  total_runtime: number;
  first_release_date: string;
  latest_release_date: string;
  type: CollectionType;
  status: CollectionStatus;
  genre_categories: string[];
  studio: string;
  completion_progress?: number;
  user_progress?: FranchiseProgress;
}

export type CollectionType =
  | 'trilogy'
  | 'quadrilogy'
  | 'pentology'
  | 'hexalogy'
  | 'septology'
  | 'octology'
  | 'nonology'
  | 'extended_series'
  | 'incomplete_series';

export type CollectionStatus = 'complete' | 'ongoing' | 'incomplete';

export interface FranchiseProgress {
  watched_films: number[];
  total_films: number;
  completion_percentage: number;
  current_film?: Movie;
  next_film?: Movie;
  viewing_order: 'release' | 'chronological';
  marathon_mode?: boolean;
  last_watched?: string;
}

export interface CollectionCategory {
  id: string;
  name: string;
  description: string;
  collections: CollectionDetails[];
  icon?: string;
}

export interface FranchiseFilter {
  genre?: string[];
  type?: CollectionType[];
  status?: CollectionStatus[];
  studio?: string[];
  completion?: 'all' | 'completed' | 'in_progress' | 'not_started';
  length?: 'trilogy' | 'quadrilogy' | 'extended' | 'all';
}

export interface ViewingOrder {
  type: 'release' | 'chronological';
  films: Movie[];
  description: string;
}

export interface MarathonSession {
  collection_id: number;
  current_film_index: number;
  viewing_order: 'release' | 'chronological';
  started_at: string;
  paused_at?: string;
  completed_films: number[];
  total_runtime_watched: number;
  breaks_taken: number;
}

// WatchPage Types
export interface StreamSource {
  id: string;
  name: string;
  url: string;
  type: 'direct' | 'hls' | 'mp4';
  quality: 'SD' | 'HD' | 'FHD' | '4K';
  fileSize?: string;
  reliability: 'Fast' | 'Stable' | 'Premium';
  isAdFree: boolean;
  language?: string;
  subtitles?: string[];
}

export interface DownloadOption {
  id: string;
  quality: '480p' | '720p' | '1080p' | '4K';
  format: 'MP4' | 'MKV';
  fileSize: string;
  codec: string;
  url: string;
  subtitles?: SubtitleOption[];
  estimatedDownloadTime?: string;
}

export interface TorrentSource {
  id: string;
  name: string;
  magnetLink: string;
  torrentFileUrl?: string;
  quality: 'CAM' | 'TS' | 'HDRip' | 'BluRay' | 'WEBRip';
  fileSize: string;
  seeders: number;
  leechers: number;
  health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  releaseGroup?: string;
  uploadedBy?: string;
  isTrusted: boolean;
  uploadDate: string;
}

export interface SubtitleOption {
  language: string;
  languageCode: string;
  url: string;
  format: 'SRT' | 'VTT' | 'ASS';
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  playbackRate: number;
  quality: string;
  subtitles: {
    enabled: boolean;
    language: string;
  };
  buffered: number;
  loading: boolean;
}

export interface WatchProgress {
  contentId: number;
  contentType: 'movie' | 'tv';
  currentTime: number;
  duration: number;
  percentage: number;
  lastWatched: string;
  episodeId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface WatchingSession {
  id: string;
  contentId: number;
  contentType: 'movie' | 'tv';
  startedAt: string;
  endedAt?: string;
  watchTime: number;
  progress: WatchProgress;
  quality: string;
  device: string;
  ipAddress?: string;
}

export interface ContentRating {
  userId: string;
  contentId: number;
  contentType: 'movie' | 'tv';
  rating: number; // 1-5 stars
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkedScene {
  id: string;
  contentId: number;
  contentType: 'movie' | 'tv';
  timestamp: number;
  title: string;
  description?: string;
  thumbnail?: string;
  createdAt: string;
}

export interface ViewingParty {
  id: string;
  hostId: string;
  contentId: number;
  contentType: 'movie' | 'tv';
  participants: {
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
    joinedAt: string;
  }[];
  isActive: boolean;
  currentTime: number;
  createdAt: string;
  chatMessages: {
    id: string;
    userId: string;
    message: string;
    timestamp: string;
  }[];
}
