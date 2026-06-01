import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Check, AlertCircle } from 'lucide-react';

import { StreamSource } from '../../types';

interface StreamSourcesProps {
  sources: StreamSource[];
  onSourceSelect?: (source: StreamSource) => void;
  selectedSource?: StreamSource | null;
  loadSource?: (source: StreamSource) => Promise<void>;
}

export type LoadSourceFn = (source: StreamSource) => Promise<void>;
export type SelectHandler = (source: StreamSource) => Promise<void>;

export const validateSource = (source: StreamSource | null | undefined): source is StreamSource => {
  if (!source || typeof source !== 'object') return false;
  return typeof source.id === 'string' && source.id.length > 0 && typeof source.name === 'string' && typeof source.url === 'string';
};

export const sanitizeSources = (sources?: StreamSource[] | null): StreamSource[] => {
  return (sources || []).filter(validateSource);
};

export const createSelectHandler = (
  loadSource?: LoadSourceFn,
  onSourceSelect?: (source: StreamSource) => void,
  setLoadingSource?: (id: string | null) => void,
  setLoadingError?: (msg: string | null) => void
): SelectHandler => {
  return async (source: StreamSource) => {
    if (source.url === '') return;
    setLoadingError?.(null);
    setLoadingSource?.(source.id);
    try {
      if (loadSource) {
        await loadSource(source);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      onSourceSelect?.(source);
    } catch (err: any) {
      setLoadingError?.(err?.message || 'Failed to load source');
    } finally {
      setLoadingSource?.(null);
    }
  };
};

const StreamSources: React.FC<StreamSourcesProps> = ({ sources, onSourceSelect, selectedSource, loadSource }) => {
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const handleSelectSource = useCallback(
    createSelectHandler(loadSource, onSourceSelect, setLoadingSource, setLoadingError),
    [loadSource, onSourceSelect]
  );

  const cleanSources = sanitizeSources(sources);

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-red-600/10 rounded-lg flex items-center justify-center border border-red-500/10">
            <Play className="h-3.5 w-3.5 text-red-500 fill-current" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Streaming Servers
          </h2>
          <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full">
            {cleanSources.length} APIs
          </span>
        </div>

        {selectedSource && (
          <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Active:</span>
            <span className="text-white font-semibold">{selectedSource.name}</span>
            <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded font-bold">
              {selectedSource.quality}
            </span>
          </div>
        )}
      </div>

      {/* Error alert */}
      {loadingError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span><strong>Failed:</strong> {loadingError}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 pt-1">
        {cleanSources.map((source) => {
          const isSelected = selectedSource?.id === source.id;
          const isLoading = loadingSource === source.id;

          return (
            <motion.button
              key={source.id}
              onClick={() => handleSelectSource(source)}
              disabled={isLoading}
              className={`group relative px-3 py-2 rounded-lg border text-xs font-semibold tracking-wide flex items-center justify-between gap-2 transition-all duration-300 ${
                isSelected
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/25'
                  : isLoading
                    ? 'bg-white/5 border-white/5 text-gray-400 cursor-not-allowed'
                    : 'bg-white/[0.02] border-white/5 text-gray-300 hover:text-white hover:bg-white/[0.06] hover:border-white/10'
              }`}
              whileHover={!isLoading && !isSelected ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border border-current border-t-transparent" />
                ) : isSelected ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <Play className="h-3 w-3 flex-shrink-0 text-gray-500 group-hover:text-red-500 transition-colors" />
                )}
                <span className="truncate text-[11px]">{source.name}</span>
              </div>

              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  isSelected
                    ? 'bg-black/25 text-white'
                    : 'bg-white/5 text-gray-400 border border-white/5'
                }`}
              >
                {source.quality}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StreamSources;