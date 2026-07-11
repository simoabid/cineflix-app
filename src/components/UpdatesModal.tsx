import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wrench,
  GitCommit,
  ExternalLink,
  Calendar,
  User,
  Info
} from 'lucide-react';
import { changelogData, ChangelogItem } from '../data/changelog';
import { useLenisToggle } from '../hooks/useLenisToggle';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitCommitItem {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

const UpdatesModal: React.FC<UpdatesModalProps> = ({ isOpen, onClose }) => {
  // Disable background scrolling when modal is open
  useLenisToggle(isOpen);

  const [activeTab, setActiveTab] = useState<'changelog' | 'commits'>('changelog');
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch commits from GitHub when the commits tab is active
  useEffect(() => {
    if (activeTab === 'commits' && commits.length === 0) {
      setIsLoadingCommits(true);
      setCommitError(null);
      fetch('https://api.github.com/repos/simoabid/cineflix-app/commits?per_page=15')
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch commits (status: ${response.status})`);
          }
          return response.json();
        })
        .then((data) => {
          setCommits(data);
          setIsLoadingCommits(false);
        })
        .catch((err) => {
          console.error('Error fetching commits:', err);
          setCommitError(err.message || 'Could not load git commits.');
          setIsLoadingCommits(false);
        });
    }
  }, [activeTab, commits.length]);

  const renderIcon = (type: ChangelogItem['type']) => {
    switch (type) {
      case 'alert':
        return (
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'fix':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'feature':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case 'stability':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 flex-shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-500 flex-shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return dateString;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-2xl bg-netflix-dark/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[85vh] flex flex-col"
          >
            {/* Top Red Ambient Flare Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-36 bg-gradient-to-b from-netflix-red/10 to-transparent blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Content */}
            <div className="pt-10 pb-4 px-6 sm:px-8 text-center flex flex-col items-center border-b border-white/5 relative z-10">
              <div className="w-16 h-16 rounded-full bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red mb-4 shadow-lg shadow-netflix-red/10">
                <Bell className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                What's New on CINEFLIX
              </h2>
              <p className="text-gray-400 text-sm sm:text-base mt-2 max-w-md">
                Stay up to date with the latest features, improvements, and updates.
              </p>

              {/* Tabs */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mt-6 w-full max-w-xs">
                <button
                  onClick={() => setActiveTab('changelog')}
                  className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'changelog'
                    ? 'bg-netflix-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  App Updates
                </button>
                <button
                  onClick={() => setActiveTab('commits')}
                  className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'commits'
                    ? 'bg-netflix-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  GitHub Activity
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto max-h-[45vh] px-6 sm:px-8 py-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <AnimatePresence mode="wait">
                {activeTab === 'changelog' ? (
                  <motion.div
                    key="changelog-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {changelogData.map((item) => (
                      <div
                        key={item.id}
                        className="bg-black/30 border border-white/5 hover:border-white/10 transition-colors p-5 sm:p-6 rounded-2xl flex items-start gap-4 relative overflow-hidden"
                      >
                        {renderIcon(item.type)}

                        <div className="flex-1 min-w-0">
                          {/* Header section inside card */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
                            <h3 className="text-white text-base sm:text-lg font-bold truncate">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-netflix-red/10 border border-netflix-red/20 text-netflix-red rounded-md text-xs font-semibold">
                                {item.version}
                              </span>
                              {item.isLatest && (
                                <span className="px-2 py-0.5 bg-netflix-red text-white rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                  Latest
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-xs ml-auto">
                              {item.date}
                            </span>
                          </div>

                          {/* Bullet details / subsections */}
                          <div className="space-y-3">
                            {item.sections.map((section, idx) => (
                              <div key={idx} className="space-y-1.5">
                                {section.title && (
                                  <h4 className="text-white/90 text-sm font-semibold tracking-wide">
                                    {section.title}
                                  </h4>
                                )}
                                <ul className="list-disc pl-5 text-gray-400 text-xs sm:text-sm space-y-1">
                                  {section.items.map((bullet, bulletIdx) => (
                                    <li key={bulletIdx} className="leading-relaxed">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="commits-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {isLoadingCommits ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 text-sm">Fetching commits from GitHub...</p>
                      </div>
                    ) : commitError ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <p className="text-white font-medium mb-1">Failed to fetch commits</p>
                        <p className="text-red-400 text-xs">{commitError}</p>
                        <button
                          onClick={() => {
                            setCommits([]);
                            setActiveTab('commits');
                          }}
                          className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white text-xs font-semibold transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : commits.length === 0 ? (
                      <p className="text-center text-gray-500 py-12">No commits found.</p>
                    ) : (
                      <div className="space-y-3">
                        {commits.map((commitItem) => {
                          const messageLines = commitItem.commit.message.split('\n');
                          const title = messageLines[0];
                          const description = messageLines.slice(1).join('\n').trim();

                          return (
                            <div
                              key={commitItem.sha}
                              className="bg-black/30 border border-white/5 hover:border-white/10 transition-colors p-4 rounded-xl flex items-start gap-3.5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
                                <GitCommit className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-white text-sm font-semibold truncate leading-snug">
                                  {title}
                                </h4>
                                {description && (
                                  <p className="text-gray-500 text-xs line-clamp-2 mt-1 leading-relaxed whitespace-pre-line">
                                    {description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="truncate max-w-[120px]">{commitItem.commit.author.name}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                    <span>{formatDate(commitItem.commit.author.date)}</span>
                                  </span>
                                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono text-gray-500">
                                    {commitItem.sha.slice(0, 7)}
                                  </span>
                                  <a
                                    href={commitItem.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-netflix-red hover:underline ml-auto font-medium"
                                  >
                                    <span>GitHub</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 bg-black/40 border-t border-white/5 text-center relative z-10 flex items-center justify-between text-xs text-gray-500">
              <span>CINEFLIX Changelog</span>
              <span>Always improving.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpdatesModal;
