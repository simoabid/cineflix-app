import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Search,
  User,
  Calendar,
  Shield,
  AlertTriangle,
  Signal,
  Link,
  FileDown,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

import { TorrentSource } from '../../types';

interface TorrentSourcesProps {
  sources: TorrentSource[];
}

/**
 * Centralized sanitization and validation for a raw torrent source object.
 * Throws an Error when required fields are missing or have invalid types.
 *
 * This function is a pure, runtime guard that ensures downstream code can
 * safely assume the returned object conforms to the TorrentSource shape.
 *
 * @param raw - unknown input expected to represent a TorrentSource
 * @returns a validated TorrentSource
 */
export function sanitizeTorrentSource(raw: any): TorrentSource {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid torrent source: not an object');
  }

  const ensureString = (key: string, allowEmpty = false) => {
    const val = raw[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing required field: ${key}`);
    }
    if (typeof val !== 'string') {
      throw new Error(`Invalid type for field ${key}: expected string`);
    }
    if (!allowEmpty && val.trim() === '') {
      throw new Error(`Empty value for required field: ${key}`);
    }
    return val;
  };

  const ensureNumber = (key: string) => {
    const val = raw[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing required field: ${key}`);
    }
    if (typeof val !== 'number' || Number.isNaN(val)) {
      throw new Error(`Invalid type for field ${key}: expected number`);
    }
    return val;
  };

  // Required fields
  const id = ensureString('id');
  const name = ensureString('name');
  const magnetLink = ensureString('magnetLink');
  const fileSize = ensureString('fileSize', true);
  const uploadDate = ensureString('uploadDate');
  const quality = ensureString('quality');
  const health = ensureString('health');
  const seeders = ensureNumber('seeders');
  const leechers = ensureNumber('leechers');

  // Optional fields
  const isTrusted = Boolean(raw.isTrusted);
  const torrentFileUrl = raw.torrentFileUrl !== undefined && raw.torrentFileUrl !== null ? String(raw.torrentFileUrl) : undefined;
  const releaseGroup = raw.releaseGroup !== undefined && raw.releaseGroup !== null ? String(raw.releaseGroup) : undefined;
  const uploadedBy = raw.uploadedBy !== undefined && raw.uploadedBy !== null ? String(raw.uploadedBy) : undefined;

  return {
    id,
    name,
    magnetLink,
    fileSize,
    uploadDate,
    quality,
    health,
    seeders,
    leechers,
    isTrusted,
    torrentFileUrl,
    releaseGroup,
    uploadedBy
  } as TorrentSource;
}

/**
 * Parse and validate a raw torrent source object at runtime.
 * Delegates to sanitizeTorrentSource to centralize validation logic.
 *
 * @param raw - raw input to validate as a TorrentSource
 * @returns a validated TorrentSource
 */
export function parseTorrentSource(raw: any): TorrentSource {
  return sanitizeTorrentSource(raw);
}

/**
 * Safely parse an array of raw sources into validated TorrentSource objects.
 * Non-conforming entries are skipped and an error is logged for each.
 *
 * @param rawSources - array of unknown items to validate
 * @returns array of validated TorrentSource
 */
export function parseTorrentSources(rawSources: unknown[]): TorrentSource[] {
  if (!Array.isArray(rawSources)) {
    throw new Error('Sources must be an array');
  }
  const parsed: TorrentSource[] = [];
  for (const raw of rawSources) {
    try {
      parsed.push(parseTorrentSource(raw));
    } catch (err) {
      // Explicit error handling for malformed source; continue processing remaining sources.
      // In real app, consider reporting these to a monitoring service.
      // eslint-disable-next-line no-console
      console.error('Skipping malformed torrent source:', err);
    }
  }
  return parsed;
}

/**
 * Map quality string to Tailwind CSS classes.
 *
 * @param quality - quality label from the source
 * @returns css classes for display
 */
export function getQualityColor(quality: string) {
  switch (quality) {
    case 'BluRay':
      return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    case 'WEBRip':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case 'HDRip':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'TS':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'CAM':
      return 'text-red-400 bg-red-500/20 border-red-500/30';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  }
}

/**
 * Map health label to a text color class.
 *
 * @param health - health label from the source
 * @returns css class for color
 */
export function getHealthColor(health: string) {
  switch (health) {
    case 'Excellent':
      return 'text-green-400';
    case 'Good':
      return 'text-blue-400';
    case 'Fair':
      return 'text-yellow-400';
    case 'Poor':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Return an icon component matching the health label.
 *
 * @param health - health label from the source
 * @returns JSX element representing the health icon
 */
export function getHealthIcon(health: string) {
  switch (health) {
    case 'Excellent':
      return <Signal className="h-4 w-4 text-green-400" />;
    case 'Good':
      return <Signal className="h-4 w-4 text-blue-400" />;
    case 'Fair':
      return <Signal className="h-4 w-4 text-yellow-400" />;
    case 'Poor':
      return <Signal className="h-4 w-4 text-red-400" />;
    default:
      return <Signal className="h-4 w-4 text-gray-400" />;
  }
}

/**
 * Compute seeder ratio as a percentage string with one decimal.
 *
 * @param seeders - number of seeders
 * @param leechers - number of leechers
 * @returns percentage string (e.g., "75.0")
 */
export function getSeederRatio(seeders: number, leechers: number) {
  const total = seeders + leechers;
  return total > 0 ? ((seeders / total) * 100).toFixed(1) : '0';
}

/**
 * Compare two TorrentSource objects according to a sort key.
 * Exported so sorting logic is centralized and testable.
 *
 * Note: This function mirrors the original sorting logic used in the component.
 * Defensive guards ensure both items are provided; if not, it falls back to 0.
 *
 * @param a - first torrent source
 * @param b - second torrent source
 * @param sortBy - sorting criterion ('seeders' | 'size' | 'date' | 'quality')
 * @returns negative if a < b, positive if a > b, zero if equal
 */
export function compareTorrentSources(
  a: TorrentSource,
  b: TorrentSource,
  sortBy: 'seeders' | 'size' | 'date' | 'quality'
) {
  if (!a || !b) return 0;

  switch (sortBy) {
    case 'seeders':
      return b.seeders - a.seeders;
    case 'size':
      return parseFloat(b.fileSize) - parseFloat(a.fileSize);
    case 'date':
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    case 'quality':
      const qualityOrder: Record<string, number> = { 'BluRay': 5, 'WEBRip': 4, 'HDRip': 3, 'TS': 2, 'CAM': 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    default:
      return 0;
  }
}

const TorrentSources: React.FC<TorrentSourcesProps> = ({ sources }) => {
  const [sortBy, setSortBy] = useState<'seeders' | 'size' | 'date' | 'quality'>('seeders');

  // Runtime-validate and sanitize incoming sources for robustness.
  let validatedSources: TorrentSource[] = [];
  try {
    validatedSources = parseTorrentSources(sources as unknown[]);
  } catch (err) {
    // If the whole sources payload is invalid, log and fall back to empty array.
    // eslint-disable-next-line no-console
    console.error('Invalid sources provided to TorrentSources component:', err);
    validatedSources = [];
  }

  const handleMagnetLink = (magnetLink: string) => {
    // Open magnet link with default torrent client
    // Guard for malformed magnet links
    if (!magnetLink || typeof magnetLink !== 'string') {
      // eslint-disable-next-line no-console
      console.error('Invalid magnet link:', magnetLink);
      return;
    }
    window.location.href = magnetLink;
  };

  const handleTorrentDownload = (torrentUrl: string) => {
    // Download torrent file
    if (!torrentUrl || typeof torrentUrl !== 'string') {
      // eslint-disable-next-line no-console
      console.error('Invalid torrent file URL:', torrentUrl);
      return;
    }
    const link = document.createElement('a');
    link.href = torrentUrl;
    link.download = 'movie.torrent';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMagnetLink = async (magnetLink: string) => {
    if (!magnetLink || typeof magnetLink !== 'string') {
      // eslint-disable-next-line no-console
      console.error('Invalid magnet link to copy:', magnetLink);
      return;
    }
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(magnetLink);
        // In a real app, show toast notification
        // eslint-disable-next-line no-console
        console.log('Magnet link copied to clipboard');
      } else {
        // Fallback for environments without clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = magnetLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        // eslint-disable-next-line no-console
        console.log('Magnet link copied to clipboard (fallback)');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy magnet link:', error);
    }
  };

  const sortedSources = [...validatedSources].sort((a, b) => compareTorrentSources(a, b, sortBy));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="h-6 w-6 text-[#ff0000]" />
          <h2 className="text-2xl font-bold text-white">Torrent Sources</h2>
          <span className="px-2 py-1 bg-[#ff0000] text-white text-sm rounded-full">
            {validatedSources.length} Available
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#13132B] text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-[#ff0000] focus:outline-none"
          >
            <option value="seeders">Sort by Seeders</option>
            <option value="size">Sort by Size</option>
            <option value="date">Sort by Date</option>
            <option value="quality">Sort by Quality</option>
          </select>
        </div>
      </div>

      {/* VPN Warning */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <ShieldAlert className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-400 font-semibold mb-1">Privacy Recommendation</h3>
            <p className="text-yellow-200 text-sm">
              For your privacy and security, we recommend using a VPN when downloading torrents.
              This helps protect your identity and ensures safe torrenting.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Torrent Sources */}
      <div className="space-y-4">
        {sortedSources.map((source, index) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#13132B] rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Source Info */}
              <div className="lg:col-span-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#ff0000]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download className="h-6 w-6 text-[#ff0000]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-white font-semibold text-lg truncate">{source.name}</h3>
                      {source.isTrusted && (
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(source.quality)}`}>
                        {source.quality}
                      </span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                        {source.fileSize}
                      </span>
                      {source.releaseGroup && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                          {source.releaseGroup}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {source.uploadedBy && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{source.uploadedBy}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(source.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-green-400 font-semibold text-lg">{source.seeders}</div>
                    <div className="text-gray-400 text-sm">Seeders</div>
                  </div>
                  <div>
                    <div className="text-red-400 font-semibold text-lg">{source.leechers}</div>
                    <div className="text-gray-400 text-sm">Leechers</div>
                  </div>
                  <div>
                    <div className={`font-semibold text-lg ${getHealthColor(source.health)}`}>
                      {getSeederRatio(source.seeders, source.leechers)}%
                    </div>
                    <div className="text-gray-400 text-sm">Ratio</div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getHealthIcon(source.health)}
                  <span className={`text-sm font-medium ${getHealthColor(source.health)}`}>
                    {source.health}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-4">
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      onClick={() => handleMagnetLink(source.magnetLink)}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#ff0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link className="h-4 w-4" />
                      <span>Magnet</span>
                    </motion.button>

                    {source.torrentFileUrl && (
                      <motion.button
                        onClick={() => handleTorrentDownload(source.torrentFileUrl!)}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileDown className="h-4 w-4" />
                        <span>File</span>
                      </motion.button>
                    )}
                  </div>

                  <button
                    onClick={() => copyMagnetLink(source.magnetLink)}
                    className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Copy Magnet Link
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Torrent Guide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-[#13132B]/50 rounded-lg p-6 border border-gray-700"
      >
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <Shield className="h-5 w-5 text-[#ff0000] mr-2" />
          Torrent Guide & Safety Tips
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-2">How to Use Torrents</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Install a torrent client (qBittorrent, Transmission, etc.)</p>
              <p>• Click "Magnet" to open directly in your torrent client</p>
              <p>• Or download the .torrent file and open it manually</p>
              <p>• Choose download location and start downloading</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Quality Guide</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• <span className="text-purple-400">BluRay</span>: Best quality, largest file size</p>
              <p>• <span className="text-blue-400">WEBRip</span>: Good quality, moderate size</p>
              <p>• <span className="text-green-400">HDRip</span>: Decent quality, smaller size</p>
              <p>• <span className="text-yellow-400">TS/CAM</span>: Lower quality, avoid if possible</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Health Indicators</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• <span className="text-green-400">Excellent</span>: High seeders, fast download</p>
              <p>• <span className="text-blue-400">Good</span>: Moderate seeders, reliable</p>
              <p>• <span className="text-yellow-400">Fair</span>: Low seeders, slower download</p>
              <p>• <span className="text-red-400">Poor</span>: Very few seeders, may stall</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Safety Tips</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Always use a VPN for privacy protection</p>
              <p>• Choose torrents from trusted uploaders</p>
              <p>• Scan downloaded files with antivirus</p>
              <p>• Seed after downloading to support the community</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-400 font-medium mb-1">Legal Disclaimer</p>
              <p className="text-red-300">
                Torrenting copyrighted content may be illegal in your jurisdiction.
                Use these sources responsibly and in accordance with your local laws.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TorrentSources;