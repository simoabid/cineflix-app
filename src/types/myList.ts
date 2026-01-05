import { Movie, TVShow } from './index';

export type ViewMode = 'grid' | 'list' | 'compact';
export type SortOption = 'dateAdded' | 'title' | 'rating' | 'runtime' | 'releaseYear';
export type SortDirection = 'asc' | 'desc';
export type ContentStatus = 'notStarted' | 'inProgress' | 'completed' | 'dropped';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface MyListItem {
  id: string;
  contentId: number;
  contentType: 'movie' | 'tv';
  content: Movie | TVShow;
  dateAdded: string;
  lastWatched?: string;
  status: ContentStatus;
  progress: number; // 0-100
  personalRating?: number; // 1-5
  personalNotes?: string;
  priority: PriorityLevel;
  customTags: string[];
  estimatedRuntime: number; // in minutes
  isInContinueWatching: boolean;
  isLiked: boolean; // New field for liked content
  likedAt?: string; // When the content was liked
}

export interface CustomCollection {
  id: string;
  name: string;
  description?: string;
  items: string[]; // MyListItem IDs
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  color?: string;
}

export interface FilterOptions {
  contentType: 'all' | 'movie' | 'tv' | 'documentary';
  status: 'all' | ContentStatus;
  genres: number[];
  dateAdded: 'all' | 'lastWeek' | 'lastMonth' | 'lastYear';
  rating: 'all' | 'high' | 'medium' | 'low';
  runtime: 'all' | 'short' | 'medium' | 'long';
  releaseYear: 'all' | 'recent' | 'classic';
  customTags: string[];
  priority: 'all' | PriorityLevel;
  liked: 'all' | 'liked' | 'notLiked'; // New filter for liked content
}

export interface ListStats {
  totalItems: number;
  totalMovies: number;
  totalTVShows: number;
  totalHours: number;
  completionRate: number;
  averageRating: number;
  genreDistribution: { [key: string]: number };
  statusDistribution: { [key in ContentStatus]: number };
  monthlyAdditions: { [key: string]: number };
}

export interface BulkOperation {
  type: 'remove' | 'markWatched' | 'markUnwatched' | 'moveToCollection' | 'addTags' | 'removeTags' | 'setPriority';
  itemIds: string[];
  payload?: any;
}

export interface ListPreferences {
  defaultViewMode: ViewMode;
  defaultSortOption: SortOption;
  defaultSortDirection: SortDirection;
  autoRemoveCompleted: boolean;
  autoRemoveAfterDays: number;
  showProgressBars: boolean;
  enableNotifications: boolean;
  compactModeItemsPerRow: number;
}

export interface SearchFilters {
  query: string;
  includeNotes: boolean;
  includeTags: boolean;
  caseSensitive: boolean;
}

export interface ListInsight {
  type: 'completion' | 'genre' | 'addition' | 'recommendation';
  title: string;
  description: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  actionable?: boolean;
}
