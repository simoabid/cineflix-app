import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Clock,
  Server,
  Cpu,
  Languages,
  Play,
  Pause,
  CheckCircle,
  FileText,
  FolderDown
} from 'lucide-react';

import { DownloadOption } from '../../types';

interface DownloadOptionsProps {
  options: DownloadOption[];
}

/**
 * Represents progress and metadata for an active download.
 */
interface DownloadProgress {
  id: string;
  progress: number;
  speed: string;
  timeRemaining: string;
  status: 'downloading' | 'paused' | 'completed' | 'error';
}

/**
 * Returns CSS class names for a given quality label.
 * Pure helper exported for testability.
 * @param quality - Quality string like '4K', '1080p', etc.
 */
export const getQualityColor = (quality: string): string => {
  switch (quality) {
    case '4K':
      return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    case '1080p':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case '720p':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case '480p':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  }
};

/**
 * Returns a small emoji icon representing the file container format.
 * Pure helper exported for testability.
 * @param format - File format like 'MP4' or 'MKV'.
 */
export const getFormatIcon = (format: string): string => {
  switch (format) {
    case 'MP4':
      return '🎬';
    case 'MKV':
      return '📹';
    default:
      return '📁';
  }
};

/**
 * Maps a download status to a readable label for UI display.
 * Pure helper exported for testability.
 * @param status - Download status value.
 * @param progress - Current progress percentage (0-100).
 */
export const formatStatusLabel = (status: DownloadProgress['status'], progress: number): string => {
  if (status === 'completed') return 'Completed';
  if (status === 'paused') return 'Paused';
  if (status === 'error') return 'Error';
  // default downloading
  return progress > 0 ? 'Downloading...' : 'Waiting...';
};

/**
 * Pure transformation function that advances a single download's progress.
 * Returns the updated downloads array and whether the specific download completed.
 * Exported for testability.
 * @param prev - Previous DownloadProgress array
 * @param optionId - ID of the download to update
 */
export const transformDownloadProgress = (
  prev: DownloadProgress[],
  optionId: string
): { updated: DownloadProgress[]; completed: boolean } => {
  let completed = false;
  const updated = prev.map(download => {
    if (download.id === optionId && download.status === 'downloading') {
      const newProgress = Math.min(download.progress + Math.random() * 5, 100);
      const isCompleted = newProgress >= 100;
      if (isCompleted) completed = true;
      return {
        ...download,
        progress: newProgress,
        status: (isCompleted ? 'completed' : 'downloading') as 'downloading' | 'paused' | 'completed' | 'error',
        timeRemaining: isCompleted ? '0 min' : `${Math.max(1, Math.floor((100 - newProgress) / 2))} min`,
        speed: isCompleted ? '0 MB/s' : `${(Math.random() * 3 + 2).toFixed(1)} MB/s`
      };
    }
    return download;
  });
  return { updated, completed };
};

/**
 * Retrieves a download progress entry by option id.
 * Exported for testability.
 * @param progressList - Array of DownloadProgress entries
 * @param optionId - ID to find
 */
export const getDownloadStatus = (progressList: DownloadProgress[], optionId: string): DownloadProgress | undefined => {
  return progressList.find(d => d.id === optionId);
};

/**
 * Validates that a value is a non-empty string.
 * Exported for testability.
 * @param value - any value to validate
 */
export const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Lightweight validation for a DownloadOption shape.
 * Ensures required fields exist and are of expected primitive types.
 * Exported for testability and defensive checks before starting downloads.
 * @param option - object to validate
 */
export const isValidDownloadOption = (option: any): option is DownloadOption => {
  if (!option || typeof option !== 'object') return false;
  if (!isValidString(option.id)) return false;
  if (!isValidString(option.format)) return false;
  if (!isValidString(option.quality)) return false;
  // fileSize, codec and estimatedDownloadTime are optional-ish but if present should be strings
  if (option.fileSize && !isValidString(option.fileSize)) return false;
  if (option.codec && !isValidString(option.codec)) return false;
  if (option.estimatedDownloadTime && !isValidString(option.estimatedDownloadTime)) return false;
  return true;
};

/**
 * Normalizes an estimated time value into a safe string to display.
 * If input is invalid, returns a sensible default.
 * Exported for testability.
 * @param time - user supplied estimated time
 */
export const normalizeEstimatedTime = (time: unknown): string => {
  if (isValidString(time)) return time;
  return '30 min';
};

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ options }) => {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
  const [selectedOption] = useState<DownloadOption | null>(null);

  /**
   * Starts a fresh download entry for the given option id.
   * Internal helper to keep handleDownload small.
   * @param option - validated DownloadOption
   */
  const startNewDownload = (option: DownloadOption) => {
    const newDownload: DownloadProgress = {
      id: option.id,
      progress: 0,
      speed: '5.2 MB/s',
      timeRemaining: normalizeEstimatedTime(option.estimatedDownloadTime),
      status: 'downloading'
    };

    setDownloadProgress(prev => {
      // prevent duplicate entries if one was just added
      const exists = prev.some(d => d.id === option.id);
      if (exists) return prev;
      return [...prev, newDownload];
    });
    simulateDownload(option.id);
  };

  /**
   * Pause an active download by option id.
   * @param optionId - id of the download to pause
   */
  const pauseDownloadById = (optionId: string) => {
    setDownloadProgress(prev =>
      prev.map(d =>
        d.id === optionId
          ? { ...d, status: 'paused' as const }
          : d
      )
    );
  };

  /**
   * Resume a paused download by option id.
   * @param optionId - id of the download to resume
   */
  const resumeDownloadById = (optionId: string) => {
    setDownloadProgress(prev =>
      prev.map(d =>
        d.id === optionId
          ? { ...d, status: 'downloading' as const }
          : d
      )
    );
    simulateDownload(optionId);
  };

  /**
   * Retry a download that previously errored.
   * @param option - the DownloadOption to retry
   */
  const retryDownload = (option: DownloadOption) => {
    setDownloadProgress(prev =>
      prev.map(d =>
        d.id === option.id
          ? { ...d, status: 'downloading' as const, speed: '0 MB/s', timeRemaining: normalizeEstimatedTime(option.estimatedDownloadTime) }
          : d
      )
    );
    simulateDownload(option.id);
  };

  /**
   * Initiates, pauses, resumes, or retries a download for the given option.
   * This function delegates to smaller helpers and includes explicit validation.
   * @param option - Download option being acted upon
   */
  const handleDownload = (option: DownloadOption) => {
    // Defensive validation: ensure option shape is valid before proceeding.
    if (!isValidDownloadOption(option)) {
      // Fail gracefully without throwing; keep UI responsive.
      // eslint-disable-next-line no-alert
      alert('Invalid download option. Please try a different format.');
      return;
    }

    try {
      const existingDownload = downloadProgress.find(d => d.id === option.id);

      if (existingDownload) {
        if (existingDownload.status === 'downloading') {
          pauseDownloadById(option.id);
        } else if (existingDownload.status === 'paused') {
          resumeDownloadById(option.id);
        } else if (existingDownload.status === 'error') {
          retryDownload(option);
        }
      } else {
        startNewDownload(option);
      }
    } catch (err) {
      // Explicit error handling: mark the specific download as errored and surface a simple user message via state.
      setDownloadProgress(prev =>
        prev.map(d =>
          d.id === option.id
            ? { ...d, status: 'error' as const, speed: '0 MB/s', timeRemaining: 'Error' }
            : d
        )
      );
      // Minimal user-facing feedback.
      // eslint-disable-next-line no-alert
      alert('Failed to start download. Please try again.');
    }
  };

  /**
   * Simulates progression of a download. Uses transformDownloadProgress helper.
   * Any unexpected exceptions mark the download as errored and stop the simulation.
   * @param optionId - ID of the download to simulate
   */
  const simulateDownload = (optionId: string) => {
    // Defensive guard: require a valid string id.
    if (!isValidString(optionId)) return;

    const interval = setInterval(() => {
      try {
        setDownloadProgress(prev => {
          const { updated, completed } = transformDownloadProgress(prev, optionId);
          if (completed) {
            clearInterval(interval);
          }
          return updated;
        });
      } catch (e) {
        // If something unexpected occurs during the simulation, mark the download as errored.
        clearInterval(interval);
        setDownloadProgress(prev =>
          prev.map(d =>
            d.id === optionId
              ? { ...d, status: 'error' as const, speed: '0 MB/s', timeRemaining: 'Error' }
              : d
          )
        );
        // eslint-disable-next-line no-alert
        alert('An error occurred while downloading. The download has been paused. Please retry.');
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Download className="h-6 w-6 text-[#ff0000]" />
          <h2 className="text-2xl font-bold text-white">Download Options</h2>
          <span className="px-2 py-1 bg-[#ff0000] text-white text-sm rounded-full">
            {options.length} Formats
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <FolderDown className="h-4 w-4" />
          <span>Downloads saved to: Movies/CineFlix</span>
        </div>
      </div>

      {/* Active Downloads */}
      {downloadProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-6 border border-gray-700"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center">
            <Download className="h-5 w-5 text-[#ff0000] mr-2" />
            Active Downloads ({downloadProgress.length})
          </h3>
          
          <div className="space-y-4">
            {downloadProgress.map((download) => {
              const option = options.find(o => o.id === download.id);
              if (!option) return null;
              
              return (
                <div key={download.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFormatIcon(option.format)}</span>
                      <div>
                        <div className="text-white font-medium">
                          {option.quality} - {option.format}
                        </div>
                        <div className="text-sm text-gray-400">
                          {option.fileSize} • {option.codec}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {download.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : download.status === 'error' ? (
                        <button
                          onClick={() => handleDownload(option)}
                          className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(option)}
                          className="p-2 bg-[#ff0000] text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          {download.status === 'downloading' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">
                        {formatStatusLabel(download.status, download.progress)}
                      </span>
                      <span className="text-white">{Math.round(download.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          download.status === 'completed' ? 'bg-green-400' :
                          download.status === 'paused' ? 'bg-yellow-400' :
                          download.status === 'error' ? 'bg-red-400' : 'bg-[#ff0000]'
                        }`}
                        style={{ width: `${download.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Download Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Speed: {download.speed}</span>
                    <span>Remaining: {download.timeRemaining}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Download Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {options.map((option, index) => {
          const downloadStatus = getDownloadStatus(downloadProgress, option.id);
          const isDownloading = downloadStatus?.status === 'downloading';
          const isCompleted = downloadStatus?.status === 'completed';
          const isPaused = downloadStatus?.status === 'paused';
          const isError = downloadStatus?.status === 'error';
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gray-800 rounded-lg p-6 border-2 transition-all duration-300 hover:bg-gray-750 ${
                selectedOption?.id === option.id 
                  ? 'border-[#ff0000] bg-[#ff0000]/5' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Option Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#ff0000]/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{getFormatIcon(option.format)}</span>
                  </div>
                  <div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getQualityColor(option.quality)}`}>
                      {option.quality}
                    </div>
                    <div className="text-white font-semibold mt-1">{option.format}</div>
                  </div>
                </div>
                
                {isCompleted && (
                  <CheckCircle className="h-8 w-8 text-green-400" />
                )}
              </div>

              {/* File Information */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">File Size</span>
                    <div className="text-white font-medium">{option.fileSize}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Codec</span>
                    <div className="text-white font-medium">{option.codec}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Estimated time:</span>
                  <span className="text-white">{option.estimatedDownloadTime}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Direct download</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Fast
                  </span>
                </div>
              </div>

              {/* Subtitles */}
              {option.subtitles && option.subtitles.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Languages className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">Subtitles included:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {option.subtitles.map((subtitle) => (
                      <span
                        key={subtitle.language}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {subtitle.language} ({subtitle.format})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specs */}
              <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Cpu className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Technical Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Format:</span>
                    <span className="text-gray-300 ml-1">{option.format}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Codec:</span>
                    <span className="text-gray-300 ml-1">{option.codec}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Resolution:</span>
                    <span className="text-gray-300 ml-1">{option.quality}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="text-gray-300 ml-1">{option.fileSize}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                onClick={() => handleDownload(option)}
                disabled={isDownloading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                  isCompleted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : isPaused
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : isDownloading
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : isError
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-[#ff0000] text-white hover:bg-red-700'
                }`}
                whileHover={!isDownloading ? { scale: 1.02 } : {}}
                whileTap={!isDownloading ? { scale: 0.98 } : {}}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Downloaded</span>
                  </>
                ) : isPaused ? (
                  <>
                    <Play className="h-5 w-5" />
                    <span>Resume Download</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Downloading...</span>
                  </>
                ) : isError ? (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Retry Download</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Download</span>
                  </>
                )}
              </motion.button>

              {/* Download Progress (if active) */}
              {downloadStatus && downloadStatus.status !== 'completed' && (
                <div className="mt-3 text-xs text-gray-400 text-center">
                  {downloadStatus.progress > 0 && (
                    <span>{Math.round(downloadStatus.progress)}% • {downloadStatus.speed}</span>
                  )}
                  {downloadStatus.status === 'error' && (
                    <div className="text-red-400 mt-1">Download failed. Click Retry to attempt again.</div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Download Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-800/50 rounded-lg p-6 border border-gray-700"
      >
        <h3 className="text-white font-semibold mb-3 flex items-center">
          <FileText className="h-5 w-5 text-[#ff0000] mr-2" />
          Download Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div className="space-y-2">
            <p>• Downloads are saved to your default download folder</p>
            <p>• Higher quality files require more storage space</p>
            <p>• H.265 codec provides better compression than H.264</p>
          </div>
          <div className="space-y-2">
            <p>• MKV format supports multiple audio tracks and subtitles</p>
            <p>• MP4 format has wider device compatibility</p>
            <p>• Resume interrupted downloads at any time</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DownloadOptions;