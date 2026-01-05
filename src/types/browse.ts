// Browse Page Types
export interface BrowseFilters {
    genres: number[];
    yearMin: number;
    yearMax: number;
    minRating: number;
    contentType: 'movie' | 'tv' | 'all';
    sortBy: SortOption;
    viewMode: ViewMode;
    displayMode: DisplayMode;
}

export type SortOption =
    | 'popularity.desc'
    | 'vote_average.desc'
    | 'primary_release_date.desc'
    | 'title.asc'
    | 'vote_count.desc';

export type ViewMode = 'grid' | 'list' | 'compact';

export type DisplayMode = 'carousels' | 'grid';

export interface FilterPreset {
    id: string;
    name: string;
    icon: string;
    description: string;
    filters: Partial<BrowseFilters>;
}

export const DEFAULT_BROWSE_FILTERS: BrowseFilters = {
    genres: [],
    yearMin: 1920,
    yearMax: new Date().getFullYear(),
    minRating: 0,
    contentType: 'all',
    sortBy: 'popularity.desc',
    viewMode: 'grid',
    displayMode: 'carousels',
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'vote_average.desc', label: 'Highest Rated' },
    { value: 'vote_count.desc', label: 'Most Voted' },
    { value: 'primary_release_date.desc', label: 'Newest First' },
    { value: 'title.asc', label: 'A-Z' },
];

export const GENRE_ICONS: Record<number, string> = {
    28: '💥',    // Action
    12: '🗺️',    // Adventure
    16: '🎨',    // Animation
    35: '😂',    // Comedy
    80: '🔪',    // Crime
    99: '📹',    // Documentary
    18: '🎭',    // Drama
    10751: '👨‍👩‍👧‍👦', // Family
    14: '🧙',    // Fantasy
    36: '📜',    // History
    27: '👻',    // Horror
    10402: '🎵', // Music
    9648: '🔍',  // Mystery
    10749: '💕', // Romance
    878: '🚀',   // Science Fiction
    10770: '📺', // TV Movie
    53: '😰',    // Thriller
    10752: '⚔️', // War
    37: '🤠',    // Western
    // TV Genres
    10759: '💥', // Action & Adventure
    10762: '👶', // Kids
    10763: '📰', // News
    10764: '🎤', // Reality
    10765: '👽', // Sci-Fi & Fantasy
    10766: '📺', // Soap
    10767: '💬', // Talk
    10768: '⚔️', // War & Politics
};

export const FILTER_PRESETS: FilterPreset[] = [
    {
        id: 'date-night',
        name: 'Date Night',
        icon: '💑',
        description: 'Romance & Comedy, 90-120min',
        filters: { genres: [10749, 35], minRating: 6 },
    },
    {
        id: 'family-fun',
        name: 'Family Fun',
        icon: '👨‍👩‍👧‍👦',
        description: 'Family-friendly adventures',
        filters: { genres: [10751, 16, 12], minRating: 6 },
    },
    {
        id: 'critics-choice',
        name: "Critics' Choice",
        icon: '🏆',
        description: '8.0+ rated masterpieces',
        filters: { minRating: 8, sortBy: 'vote_average.desc' },
    },
    {
        id: 'hidden-gems',
        name: 'Hidden Gems',
        icon: '💎',
        description: 'Underrated 7.0+ films',
        filters: { minRating: 7, sortBy: 'vote_count.desc' },
    },
    {
        id: 'action-packed',
        name: 'Action Packed',
        icon: '💪',
        description: 'Adrenaline-fueled thrills',
        filters: { genres: [28, 12, 878], minRating: 6 },
    },
    {
        id: 'scary-night',
        name: 'Scary Night',
        icon: '😱',
        description: 'Horror & Thriller',
        filters: { genres: [27, 53], minRating: 5 },
    },
];
