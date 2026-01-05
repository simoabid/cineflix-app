import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { myListApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getPosterUrl } from '../../services/tmdb';
import { progressService } from '../../services/progressService';

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
    lastEpisode?: {
        seasonNumber: number;
        episodeNumber: number;
    };
}

const ContinueWatching: React.FC = () => {
    const [items, setItems] = useState<ContinueWatchingItem[]>([]);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContinueWatching = async () => {
            if (isAuthenticated) {
                // Fetch from API
                const response = await myListApi.getContinueWatching();
                if (response.success && response.data) {
                    setItems(response.data);
                }
            } else {
                // Fetch from local storage logic (if we implemented a 'getAll' in progressService)
                // For now, we can manually check storage as a simple fallback or just rely on cloud for this section
                // to encourage login. Or better, implement `getAllProgress` in service.
                // Let's stick to AUTH only for this section as generally "Continue Watching" across devices implies Account.
                // Guest functionality is currently "save to local", but displaying a "Continue Watching" row 
                // usually is an authenticated feature in this codebase context.
                // However, user requested local storage support. Let's try to parse local storage.
                try {
                    const stored = localStorage.getItem('cineflix_watch_progress');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        // Filter items with progress
                        const localItems = Object.values(parsed).filter((i: any) => i.progress > 0 && i.progress < 100);
                        setItems(localItems as ContinueWatchingItem[]);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setLoading(false);
        };

        fetchContinueWatching();
    }, [isAuthenticated]);

    if (loading || items.length === 0) return null;

    return (
        <section className="py-8">
            <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
                <h2 className="text-2xl font-bold text-white mb-6">Continue Watching</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map((item) => (
                        <div
                            key={`${item.contentType}-${item.contentId}`}
                            className="relative group cursor-pointer"
                            onClick={() => {
                                let url = `/watch/${item.contentType}/${item.contentId}`;
                                if (item.contentType === 'tv' && item.lastEpisode) {
                                    url += `?season=${item.lastEpisode.seasonNumber}&episode=${item.lastEpisode.episodeNumber}`;
                                }
                                navigate(url);
                            }}
                        >
                            <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-gray-800 border border-gray-700/50 transition-all duration-300 group-hover:border-[#ff0000]/50 group-hover:scale-[1.02]">
                                {item.content.backdrop_path || item.content.poster_path ? (
                                    <img
                                        src={getPosterUrl(item.content.backdrop_path || item.content.poster_path, 'w500')}
                                        alt={item.content.title || item.content.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-gray-500 text-sm">No Image</span>
                                    </div>
                                )}

                                {/* Overlay Play Button */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-10 h-10 bg-[#ff0000] rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                    <div
                                        className="h-full bg-[#ff0000]"
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-2 text-sm">
                                <h3 className="text-white font-medium truncate">
                                    {item.content.title || item.content.name}
                                </h3>
                                {item.contentType === 'tv' && item.lastEpisode && (
                                    <p className="text-gray-400 text-xs">
                                        S{item.lastEpisode.seasonNumber} E{item.lastEpisode.episodeNumber}
                                    </p>
                                )}
                                {!item.lastEpisode && item.contentType === 'tv' && (
                                    <p className="text-gray-400 text-xs">Resume</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ContinueWatching;
