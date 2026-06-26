import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Tv, Film, ArrowLeft, X } from 'lucide-react';
import { myListApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getPosterUrl } from '../services/tmdb';
import { SEOHead } from '../components/layout/SEOHead';

interface ContinueWatchingItem {
    id: string;
    contentId: number;
    contentType: 'movie' | 'tv';
    content: {
        title?: string;
        name?: string;
        poster_path: string;
        backdrop_path: string;
        genre_ids?: number[];
        original_language?: string;
        origin_country?: string[];
    };
    progress: number;
    playbackPosition?: number;
    duration?: number;
    lastEpisode?: {
        seasonNumber: number;
        episodeNumber: number;
        title?: string;
    };
    lastWatched?: string;
}

function getRemainingTimeText(item: ContinueWatchingItem, compact = false): string {
    if (item.duration && item.playbackPosition) {
        const remainingSeconds = item.duration - item.playbackPosition;
        const remainingMinutes = Math.max(1, Math.round(remainingSeconds / 60));
        const suffix = compact ? '' : ' left';
        if (remainingMinutes > 60) {
            const hours = Math.floor(remainingMinutes / 60);
            const mins = remainingMinutes % 60;
            return `${hours}h ${mins}m${suffix}`;
        }
        return `${remainingMinutes}m${suffix}`;
    }
    const suffix = compact ? '%' : '% watched';
    return `${Math.round(item.progress)}${suffix}`;
}

function getRelativeTimeText(item: ContinueWatchingItem): string {
    if (!item.lastWatched) return 'Recently';
    try {
        const past = new Date(item.lastWatched);
        const now = new Date();
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return '1 minute ago';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return '1 month ago';
        return `${diffMonths} months ago`;
    } catch {
        return 'Recently';
    }
}

// Anime identification logic
const isAnime = (item: ContinueWatchingItem): boolean => {
    const genres = item.content.genre_ids || [];
    // TMDB Animation genre is 16
    const isAnimation = genres.includes(16);
    
    const contentAny = item.content as any;
    const originalLang = contentAny.original_language;
    const originCountry = contentAny.origin_country || [];
    
    const isJapanese = originalLang === 'ja' || 
                       (Array.isArray(originCountry) && originCountry.includes('JP')) ||
                       (typeof originCountry === 'string' && originCountry === 'JP');
                       
    return isAnimation && isJapanese;
};

const ContinueWatchingPage: React.FC = () => {
    const [items, setItems] = useState<ContinueWatchingItem[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContinueWatching = async () => {
            if (isAuthenticated) {
                const response = await myListApi.getContinueWatching();
                if (response.success && response.data) {
                    setItems(response.data);
                }
            } else {
                try {
                    const stored = localStorage.getItem('cineflix_watch_progress');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        const localItems = Object.values(parsed)
                            .filter((i: any) => i.progress > 0 && i.progress < 100)
                            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
                            .map((i: any) => ({
                                id: `${i.contentType}-${i.contentId}`,
                                contentId: i.contentId,
                                contentType: i.contentType,
                                content: i.content || {
                                    title: i.contentType === 'movie' ? 'Movie' : 'TV Show',
                                    poster_path: '',
                                    backdrop_path: '',
                                    genre_ids: []
                                },
                                progress: i.progress,
                                playbackPosition: i.playbackPosition,
                                duration: i.duration,
                                lastEpisode: i.seasonNumber !== undefined && i.episodeNumber !== undefined
                                    ? {
                                        seasonNumber: i.seasonNumber,
                                        episodeNumber: i.episodeNumber
                                    }
                                    : undefined,
                                lastWatched: i.timestamp ? new Date(i.timestamp).toISOString() : undefined
                            }));
                        setItems(localItems as ContinueWatchingItem[]);
                    }
                } catch (e) {
                    console.error('Failed to parse local watch progress:', e);
                }
            }
            setLoading(false);
        };

        fetchContinueWatching();
    }, [isAuthenticated]);

    // Handle play action
    const handleItemClick = (item: ContinueWatchingItem) => {
        let url = `/watch/${item.contentType}/${item.contentId}`;
        if (item.contentType === 'tv' && item.lastEpisode) {
            url += `?season=${item.lastEpisode.seasonNumber}&episode=${item.lastEpisode.episodeNumber}`;
        }
        navigate(url);
    };

    const handleDismiss = async (item: ContinueWatchingItem) => {
        // Remove locally from state immediately for snappy UI
        setItems(prevItems => prevItems.filter(i => !(i.contentId === item.contentId && i.contentType === item.contentType)));

        if (isAuthenticated) {
            try {
                await myListApi.updateProgress({
                    contentId: item.contentId,
                    contentType: item.contentType,
                    progress: 0,
                    playbackPosition: 0,
                    duration: item.duration || 0,
                    seasonNumber: item.lastEpisode?.seasonNumber,
                    episodeNumber: item.lastEpisode?.episodeNumber
                });
            } catch (err) {
                console.error('Failed to clear watch progress on backend:', err);
            }
        }

        // Also update local storage regardless of auth
        try {
            const stored = localStorage.getItem('cineflix_watch_progress');
            if (stored) {
                const parsed = JSON.parse(stored);
                const key = `${item.contentType}_${item.contentId}`;
                if (parsed[key]) {
                    delete parsed[key];
                    localStorage.setItem('cineflix_watch_progress', JSON.stringify(parsed));
                }
            }
        } catch (err) {
            console.error('Failed to clear watch progress locally:', err);
        }
    };

    // Filter items based on activeTab
    const getFilteredItems = (): ContinueWatchingItem[] => {
        switch (activeTab) {
            case 'movie':
                return items.filter(item => item.contentType === 'movie' && !isAnime(item));
            case 'tv':
                return items.filter(item => item.contentType === 'tv' && !isAnime(item));
            case 'anime':
                return items.filter(item => isAnime(item));
            case 'all':
            default:
                return items;
        }
    };

    const filteredItems = getFilteredItems();

    const tabs = [
        { id: 'all', name: 'All' },
        { id: 'movie', name: 'Movies' },
        { id: 'tv', name: 'TV Shows' },
        { id: 'anime', name: 'Anime' }
    ] as const;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center">
                <div className="relative">
                    <div className="h-20 w-20 netflix-spinner-thick" />
                    <div className="h-20 w-20 netflix-ripple" />
                    <div className="h-20 w-20 netflix-ripple" style={{ animationDelay: '0.5s' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020205] bg-gradient-to-b from-black/85 via-[#050510] to-[#0A0A1F] text-white pt-24 pb-16">
            <SEOHead
                title="Continue Watching"
                description="Resume streaming your recently watched movies and TV shows on CINEFLIX."
            />
            <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
                
                {/* Back Button and Page Header */}
                <div className="flex flex-col gap-4 mb-8">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                        <span>Go Back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white/95">
                            Continue Watching
                        </h1>
                        <p className="text-gray-400 text-sm sm:text-base mt-2">
                            Pick up where you left off
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center space-x-6 border-b border-white/10 pb-2 mb-8 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative pb-3 text-sm sm:text-base font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap outline-none ${
                                activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab.name}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E50914] rounded-full animate-fade-in" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Grid / Empty State */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fade-in">
                        {filteredItems.map((item) => (
                            <div
                                key={`${item.contentType}-${item.contentId}`}
                                className="relative group flex flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl p-1 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl"
                                tabIndex={0}
                                onClick={() => handleItemClick(item)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleItemClick(item);
                                    }
                                }}
                                aria-label={`Continue watching ${item.content.title || item.content.name}`}
                            >
                                {/* Card Media Container */}
                                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-md">
                                    {item.content.backdrop_path || item.content.poster_path ? (
                                        <img
                                            src={getPosterUrl(item.content.backdrop_path || item.content.poster_path, 'w500')}
                                            alt={item.content.title || item.content.name}
                                            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                            <span className="text-gray-500 text-[10px] font-medium">No Image</span>
                                        </div>
                                    )}

                                    {/* Cinematic dark gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 group-hover:from-black/70 group-hover:to-black/40 transition-all duration-300" />

                                    {/* Movie/show icon in the top left corner */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                                        {item.contentType === 'tv' ? (
                                            <span className="flex items-center gap-1 text-[8px] ssm:text-[9px] font-black px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                                                <Tv className="w-2 h-2 text-[#E50914]" />
                                                <span>TV</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[8px] ssm:text-[9px] font-black px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                                                <Film className="w-2 h-2 text-[#E50914]" />
                                                <span className="hidden ssm:inline">Movie</span>
                                            </span>
                                        )}
                                        {item.contentType === 'tv' && item.lastEpisode && (
                                            <span className="flex items-center gap-1 text-[8px] ssm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/5 tracking-wider">
                                                S{item.lastEpisode.seasonNumber}•E{item.lastEpisode.episodeNumber}
                                            </span>
                                        )}
                                    </div>

                                    {/* Time left and dismiss button in the top right corner */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                                        <span className="flex items-center gap-1 text-[8px] ssm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-gray-200 border border-white/10 tracking-wide">
                                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                                            <span>{getRemainingTimeText(item, true)}</span>
                                            <span className="hidden ssm:inline">{item.duration && item.playbackPosition ? ' left' : ' watched'}</span>
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDismiss(item);
                                            }}
                                            className="w-5 h-5 sm:w-5.5 sm:h-5.5 bg-black/80 hover:bg-white hover:text-black border border-white/15 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                                            title="Remove from Continue Watching"
                                        >
                                            <X className="w-3 h-3 stroke-[2.5]" />
                                        </button>
                                    </div>

                                    {/* Hover Play Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/40 transition-all duration-300">
                                        <div className="w-10 h-10 bg-[#E50914] text-white rounded-full flex items-center justify-center shadow-lg opacity-0 transform scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 ease-out group-hover:shadow-[0_0_16px_rgba(229,9,20,0.5)]">
                                            <Play className="w-4.5 h-4.5 text-white fill-current ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Details Information */}
                                <div className="mt-2.5 px-2 pb-2 flex flex-col gap-1 w-full text-left">
                                    {/* Title */}
                                    <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-1 leading-tight tracking-wide group-hover:text-[#E50914] transition-colors">
                                        {item.content.title || item.content.name}
                                    </h3>

                                    {/* Subtitle "continue where you left off" */}
                                    <p className="text-gray-400 text-[10px] sm:text-[11px] line-clamp-1 font-normal leading-normal">
                                        {item.contentType === 'tv' && item.lastEpisode && item.lastEpisode.title
                                            ? item.lastEpisode.title
                                            : 'Continue from where you left off'}
                                    </p>

                                    {/* Progress Bar (thin red) */}
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1 relative">
                                        <div
                                            className="h-full bg-[#E50914] rounded-full transition-all duration-300"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>

                                    {/* Small thin percentage below progress bar */}
                                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 font-medium mt-0.5">
                                        <span>{Math.round(item.progress)}% completed</span>
                                        <span>{getRelativeTimeText(item)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State - Dashed Box matching UI screen mockup */
                    <div className="flex justify-center items-center py-10 w-full animate-fade-in">
                        <div className="border border-dashed border-white/10 rounded-2xl p-12 bg-white/[0.01] backdrop-blur-sm w-full max-w-4xl flex flex-col items-center justify-center text-center shadow-inner">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <Clock className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                No continue watching items
                            </h3>
                            <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
                                Items you start watching will appear here
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="bg-[#E50914] hover:bg-[#ff4d55] text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 active:scale-[0.98] hover:shadow-[0_4px_16px_rgba(229,9,20,0.4)]"
                            >
                                Discover content
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContinueWatchingPage;
