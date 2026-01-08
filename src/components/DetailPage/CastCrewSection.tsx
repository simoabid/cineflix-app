import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    ChevronLeft,
    ChevronRight,
    Users,
    Download,
    Info,
    TrendingUp,
    Award
} from 'lucide-react';
import { CastMember, CrewMember, MovieCredits } from '../../types';
import { getImageUrl } from '../../services/tmdb';

interface CastCrewSectionProps {
    credits: MovieCredits | null;
    onActorClick: (actor: CastMember) => void;
    onDownloadClick: (url: string, name: string) => void;
}

const CastCrewSection: React.FC<CastCrewSectionProps> = ({ credits, onActorClick, onDownloadClick }) => {
    const [activeTab, setActiveTab] = useState<'cast' | 'crew'>('cast');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const updateArrows = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 20);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
        }
    };

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updateArrows);
            window.addEventListener('resize', updateArrows);
            const timer = setTimeout(updateArrows, 100);
            return () => {
                scrollContainer.removeEventListener('scroll', updateArrows);
                window.removeEventListener('resize', updateArrows);
                clearTimeout(timer);
            };
        }
    }, [credits, activeTab]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { clientWidth } = scrollRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth * 0.7 : clientWidth * 0.7;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Mouse Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    if (!credits || (credits.cast.length === 0 && credits.crew.length === 0)) return null;

    const keyCrewRoles = ['Director', 'Producer', 'Executive Producer', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer', 'Editor', 'Casting'];
    const data = activeTab === 'cast'
        ? credits.cast
        : credits.crew
            .filter(member => keyCrewRoles.includes(member.job))
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i); // Unique crew members

    return (
        <section className="py-4 bg-transparent relative overflow-hidden group/section">
            <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <Users className="h-3 w-3 text-red-500" />
                            Talent Behind the Scenes
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Cast & Crew
                            <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                {activeTab === 'cast' ? credits.cast.length : credits.crew.length} total
                            </span>
                        </h2>

                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('cast')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'cast'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Cast
                            </button>
                            <button
                                onClick={() => setActiveTab('crew')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'crew'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Key Crew
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => scroll('left')}
                                disabled={!showLeftArrow}
                                className="p-2.5 bg-gray-900 border border-white/10 text-white rounded-xl hover:bg-gray-800 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 z-30"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                disabled={!showRightArrow}
                                className="p-2.5 bg-gray-900 border border-white/10 text-white rounded-xl hover:bg-gray-800 disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 z-30"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative -mx-6 sm:-mx-8 lg:-mx-12">
                    {/* Edge Gradients */}
                    <div className={`absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0A1F] to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0A1F] to-transparent z-20 pointer-events-none transition-opacity duration-500 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            ref={scrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseUp}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            className={`flex gap-5 overflow-x-auto scrollbar-hide pb-8 pt-2 px-6 sm:px-8 lg:px-12 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'scroll-auto' : 'scroll-smooth'}`}
                        >
                            {data.map((member, index) => {
                                const isCast = 'character' in member;
                                const role = isCast ? (member as CastMember).character : (member as CrewMember).job;
                                const isHovered = hoveredId === member.id;

                                return (
                                    <div
                                        key={`${activeTab}-${member.id}-${index}`}
                                        className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[170px] relative group"
                                        onMouseEnter={() => !isDragging && setHoveredId(member.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        <motion.div
                                            animate={{ y: isHovered ? -8 : 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            onClick={() => !isDragging && isCast && onActorClick(member as CastMember)}
                                            className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[3/4.5] border border-white/5 cursor-pointer group-hover:border-red-500/50 transition-colors shadow-xl"
                                        >
                                            {member.profile_path ? (
                                                <img
                                                    src={getImageUrl(member.profile_path, 'w342')}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                    <User className="w-12 h-12 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Rank Badge for Main Cast */}
                                            {isCast && (member as CastMember).order < 5 && (
                                                <div className="absolute top-2 left-2 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-600/40">
                                                    #{(member as CastMember).order + 1}
                                                </div>
                                            )}

                                            {/* Action Layer */}
                                            <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

                                            <div className={`absolute inset-0 flex flex-col justify-end p-4 transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="flex-1 h-9 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-red-700 transition-colors"
                                                    >
                                                        <Info className="w-3 h-3" />
                                                        Details
                                                    </button>
                                                    {member.profile_path && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDownloadClick(getImageUrl(member.profile_path, 'h632'), member.name);
                                                            }}
                                                            className="w-9 h-9 bg-white/10 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Meta Info */}
                                        <div className="mt-3 text-center transition-all duration-300 group-hover:translate-y-1">
                                            <h4 className="text-white font-bold text-sm line-clamp-1 group-hover:text-red-500 transition-colors">
                                                {member.name}
                                            </h4>
                                            <p className="text-[11px] text-gray-500 line-clamp-1 font-medium mt-0.5">
                                                {role}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Section Footer for Credits */}
                <div className="mt-6 flex items-center justify-center">
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs text-gray-400"><strong className="text-white">Top Talent</strong> selected</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-gray-400">IMDb Popularity Weighted</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </section>
    );
};

export default CastCrewSection;
