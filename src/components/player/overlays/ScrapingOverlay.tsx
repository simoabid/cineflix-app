import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Film, Loader2, CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';

import type { ScrapingSegment, ScrapingItems } from '@/hooks/useScrape';

interface ScrapingOverlayProps {
  sources: Record<string, ScrapingSegment>;
  sourceOrder: ScrapingItems[];
  currentSource?: string;
  isScraping: boolean;
  backdropUrl?: string;
  posterUrl?: string;
  mediaTitle?: string;
  mediaType?: 'movie' | 'tv';
  seasonNumber?: number;
  episodeNumber?: number;
}

const statusConfig = {
  waiting: { color: 'bg-white/10 text-white/40', badge: 'bg-white/5 border-white/5', text: 'text-gray-500', label: 'Queued' },
  pending: { color: 'bg-amber-500 text-amber-400', badge: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Scanning' },
  success: { color: 'bg-emerald-500 text-emerald-400 border-emerald-500/30', badge: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Found' },
  failure: { color: 'bg-rose-500/50 text-rose-400', badge: 'bg-rose-500/5 border-rose-500/10', text: 'text-rose-400/70', label: 'Failed' },
  notfound: { color: 'bg-white/5 text-white/20', badge: 'bg-white/5 border-white/5', text: 'text-gray-500/70', label: 'Not found' },
} as const;

/**
 * Displays real-time scraping progress as providers are tried.
 * Shows a scrollable list of source scrapers with their status,
 * discovered embeds, and completion percentages in a premium glassmorphic modal.
 */
export function ScrapingOverlay({
  sources,
  sourceOrder,
  currentSource,
  isScraping,
  backdropUrl,
  posterUrl,
  mediaTitle,
  mediaType,
  seasonNumber,
  episodeNumber,
}: ScrapingOverlayProps): React.ReactElement {
  const orderedSources = useMemo(() => {
    const items: ScrapingSegment[] = [];
    for (const group of sourceOrder) {
      const source = sources[group.id];
      if (source) items.push(source);
      for (const childId of group.children) {
        const embed = sources[childId];
        if (embed) items.push(embed);
      }
    }
    return items;
  }, [sources, sourceOrder]);
  const totalCount = orderedSources.length;
  const completedCount = orderedSources.filter(
    (s) => s.status === 'success' || s.status === 'failure' || s.status === 'notfound',
  ).length;
  const successCount = orderedSources.filter((s) => s.status === 'success').length;
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A1F] overflow-hidden p-4 md:p-6 select-none">
      {backdropUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-[40px] opacity-20 scale-105 pointer-events-none transition-all duration-1000"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.12),transparent_60%),radial-gradient(circle_at_bottom,rgba(10,10,31,0.8),transparent_80%)] pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-[#0A0A1F]/70 to-[#0A0A1F]/90 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl rounded-3xl overflow-hidden bg-slate-950/45 backdrop-blur-xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-6 md:p-8 flex flex-col transition-all duration-300"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="flex gap-4 items-center mb-6">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={mediaTitle || 'Poster'}
              className="w-12 h-18 rounded-lg object-cover shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-18 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              {mediaType === 'tv' ? <Tv className="h-6 w-6 text-white/30" /> : <Film className="h-6 w-6 text-white/30" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest mb-1">
              <Zap className="h-3.5 w-3.5 text-red-500 animate-pulse fill-current" />
              <span>Smart Player Engine</span>
            </div>
            <h3 className="text-white text-base md:text-lg font-black truncate leading-tight">
              {mediaTitle || 'Searching Sources...'}
            </h3>
            <p className="text-white/50 text-xs mt-0.5 font-medium flex items-center gap-2">
              {mediaType === 'tv' && seasonNumber && episodeNumber ? (
                <span className="text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px]">
                  S{seasonNumber} • E{episodeNumber}
                </span>
              ) : mediaType === 'movie' ? (
                <span className="text-white/40">Feature Film</span>
              ) : (
                <span className="text-white/40">Connecting...</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl mb-6">
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-white/5 fill-none"
                strokeWidth="5"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-red-500 fill-none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="213.6"
                initial={{ strokeDashoffset: 213.6 }}
                animate={{ strokeDashoffset: 213.6 - (213.6 * overallProgress) / 100 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-base tracking-tight leading-none">
                {Math.round(overallProgress)}%
              </span>
              <span className="text-[9px] text-white/40 font-bold uppercase mt-0.5 tracking-wider">
                Scan
              </span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
              {isScraping ? (
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${successCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`} />
              )}
              <h4 className="text-white/90 text-sm font-bold tracking-wide">
                {isScraping ? 'Checking Connections...' : successCount > 0 ? 'Optimal Sources Discovered!' : 'Scan Finished'}
              </h4>
            </div>
            <p className="text-white/50 text-xs leading-relaxed truncate">
              {isScraping
                ? `Currently scanning: ${currentSource ? sources[currentSource]?.name : 'Initial handshake'}`
                : `Found ${successCount} high-quality stream${successCount !== 1 ? 's' : ''} ready to play`
              }
            </p>
            <div className="text-[11px] text-white/30 mt-1 font-semibold">
              {completedCount} of {totalCount} provider nodes checked • {successCount} found
            </div>
          </div>
        </div>
        <div
          className="w-full max-h-[220px] overflow-y-auto space-y-2 pr-1.5
            [&::-webkit-scrollbar]:w-1 
            [&::-webkit-scrollbar-thumb]:bg-white/10 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <AnimatePresence mode="popLayout">
            {orderedSources.map((segment) => {
              const config = statusConfig[segment.status] || statusConfig.waiting;
              const isActive = segment.id === currentSource;
              const isEmbed = !!segment.embedId;
              return (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                      : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03]'
                  } ${isEmbed ? 'ml-6 border-l-2' : ''}`}
                >
                  {isEmbed && (
                    <span className="text-white/20 text-xs select-none">↳</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-bold block truncate tracking-wide ${
                        isActive ? 'text-red-400' : 'text-white/80'
                      }`}
                    >
                      {segment.name}
                    </span>
                    <span className="text-[9px] text-white/35 font-medium uppercase tracking-wider block mt-0.5">
                      {isEmbed ? 'Embed Stream' : 'Primary Source'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {segment.status === 'pending' && segment.percentage > 0 && (
                      <span className="text-xs font-extrabold text-amber-400 tabular-nums">
                        {Math.round(segment.percentage)}%
                      </span>
                    )}
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${config.badge}`}>
                      {segment.status === 'pending' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                      ) : segment.status === 'success' ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      ) : segment.status === 'failure' ? (
                        <XCircle className="w-2.5 h-2.5 text-rose-400" />
                      ) : segment.status === 'notfound' ? (
                        <AlertCircle className="w-2.5 h-2.5 text-white/30" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      )}
                      <span className={`leading-none ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
