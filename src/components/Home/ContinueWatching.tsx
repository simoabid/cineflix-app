import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Tv, Film, X } from 'lucide-react';
import { myListApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getPosterUrl } from '../../services/tmdb';

interface ContinueWatchingItem {
    id: string;
    contentId: number;
    contentType: 'movie' | 'tv';
    content: {
        title?: string;
        name?: string;
        poster_path: string;
        backdrop_path: string;
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

export function ContinueWatching(): React.ReactElement | null {
    const [items, setItems] = useState<ContinueWatchingItem[]>([]);
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
                                    backdrop_path: ''
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

    if (loading || items.length === 0) return null;

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

    return (
        <section className="py-8 border-b border-gray-800/40">
            <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
                <h2 className="text-xl font-semibold text-white/90 mb-5 tracking-tight flex items-center gap-2">
                    <span className="w-1 h-5 bg-buttons-purple rounded-full inline-block" />
                    Continue Watching
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {items.map((item) => (
                        <div
                            key={`${item.contentType}-${item.contentId}`}
                            className="relative group flex flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-buttons-purple focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl p-1 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl"
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
                                        src={getPosterUrl(item.content.backdrop_path || item.content.poster_path, 'w342')}
                                        alt={item.content.title || item.content.name}
                                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                                        loading="lazy"
                                        decoding="async"
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
                                            <Tv className="w-2 h-2 text-type-logo" />
                                            <span>TV</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[8px] ssm:text-[9px] font-black px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                                            <Film className="w-2 h-2 text-type-logo" />
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
                                    <div className="w-10 h-10 bg-buttons-purple text-white rounded-full flex items-center justify-center shadow-lg opacity-0 transform scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 ease-out group-hover:shadow-[0_0_16px_rgba(229,9,20,0.5)]">
                                        <Play className="w-4.5 h-4.5 text-white fill-current ml-0.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Details Information */}
                            <div className="mt-2.5 px-2 pb-2 flex flex-col gap-1 w-full text-left">
                                {/* Title */}
                                <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-1 leading-tight tracking-wide group-hover:text-type-logo transition-colors">
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
                                        className="h-full bg-buttons-purple rounded-full transition-all duration-300"
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
            </div>
        </section>
    );
}

export default ContinueWatching;
