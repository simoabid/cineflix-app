import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Copy, 
  Check,
  Link,
  FileJson
} from 'lucide-react';
import { MyListItem } from '../../types/myList';

type ExportFormat = 'pdf' | 'csv' | 'json' | 'text';

interface ExportModalProps {
  items: MyListItem[];
  onClose: () => void;
}

interface ExportOptions {
  includeProgress: boolean;
  includeNotes: boolean;
  includeTags: boolean;
}

export interface SerializedExportItem {
  title: string;
  year: string | number | '';
  type: string;
  runtime: number;
  status: string;
  rating: number;
  dateAdded: string;
  progress?: number;
  notes?: string;
  tags?: string[];
  tmdbId?: number | string;
  overview?: string;
  posterPath?: string;
}

/**
 * Validate that the provided items are in the expected shape for export.
 * Throws an Error if validation fails.
 */
export const validateExportItems = (items: MyListItem[]): void => {
  if (!Array.isArray(items)) {
    throw new Error('Export items must be an array');
  }
  // Minimal validation of the first item shape to catch misconfiguration early
  if (items.length > 0) {
    const sample = items[0] as any;
    if (!sample.content || !sample.contentType || typeof sample.dateAdded === 'undefined') {
      throw new Error('Export items appear malformed; missing expected fields');
    }
  }
};

/**
 * Format runtime (minutes) into a human-readable string.
 */
export const formatRuntime = (minutes: number): string => {
  const minsValue = typeof minutes === 'number' && !isNaN(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(minsValue / 60);
  const mins = minsValue % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Extract common serialized fields from a MyListItem.
 * Kept internal to avoid duplicating logic across serializers.
 */
export const extractSerializedItem = (item: MyListItem, options: ExportOptions): SerializedExportItem => {
  const contentAny = (item && (item as any).content) ? (item as any).content : {};
  const title = contentAny.title || contentAny.name || 'Unknown Title';
  const date = contentAny.release_date || contentAny.first_air_date;
  const year = date ? new Date(date).getFullYear() : '';
  const runtimeVal = typeof (item as any).estimatedRuntime === 'number' && !isNaN((item as any).estimatedRuntime)
    ? (item as any).estimatedRuntime
    : Number(contentAny.runtime) || 0;
  const ratingVal = typeof contentAny.vote_average === 'number' && !isNaN(contentAny.vote_average)
    ? contentAny.vote_average
    : Number(contentAny.vote_average) || 0;

  const dateAddedVal = typeof item.dateAdded !== 'undefined' && item.dateAdded !== null
    ? String(item.dateAdded)
    : new Date().toISOString();

  const serialized: SerializedExportItem = {
    title,
    year,
    type: item.contentType,
    runtime: runtimeVal,
    status: item.status,
    rating: ratingVal,
    dateAdded: dateAddedVal,
    tmdbId: item.contentId,
    overview: contentAny.overview,
    posterPath: contentAny.poster_path
  };

  if (options.includeProgress) {
    serialized.progress = (item as any).progress ?? 0;
  }

  if (options.includeNotes && (item as any).personalNotes) {
    serialized.notes = (item as any).personalNotes;
  }

  if (options.includeTags && (item as any).customTags && (item as any).customTags.length > 0) {
    serialized.tags = (item as any).customTags;
  }

  return serialized;
};

/**
 * Serialize items to CSV format.
 * Exported as a pure function for unit testing.
 */
export const serializeToCSV = (items: MyListItem[], options: ExportOptions): string => {
  validateExportItems(items);

  const opts: ExportOptions = {
    includeProgress: Boolean(options?.includeProgress),
    includeNotes: Boolean(options?.includeNotes),
    includeTags: Boolean(options?.includeTags)
  };

  const headers = [
    'Title',
    'Year',
    'Type',
    'Runtime',
    'Status',
    'Rating',
    'Date Added',
    ...(opts.includeProgress ? ['Progress'] : []),
    ...(opts.includeNotes ? ['Notes'] : []),
    ...(opts.includeTags ? ['Tags'] : [])
  ];

  const rows = items.map(item => {
    const s = extractSerializedItem(item, opts);
    return [
      s.title,
      s.year,
      s.type,
      formatRuntime(s.runtime),
      s.status,
      (s.rating || 0).toFixed(1),
      new Date(s.dateAdded).toLocaleDateString(),
      ...(opts.includeProgress ? [`${s.progress ?? 0}%`] : []),
      ...(opts.includeNotes ? [s.notes || ''] : []),
      ...(opts.includeTags ? [(s.tags || []).join(', ')] : [])
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * Serialize items to pretty JSON.
 * Exported as a pure function for unit testing.
 */
export const serializeToJSON = (items: MyListItem[], options: ExportOptions): string => {
  validateExportItems(items);

  const opts: ExportOptions = {
    includeProgress: Boolean(options?.includeProgress),
    includeNotes: Boolean(options?.includeNotes),
    includeTags: Boolean(options?.includeTags)
  };

  const exportData: SerializedExportItem[] = items.map(item => extractSerializedItem(item, opts));
  return JSON.stringify(exportData, null, 2);
};

/**
 * Serialize items to plain text report.
 * Exported as a pure function for unit testing.
 */
export const serializeToText = (items: MyListItem[], options: ExportOptions): string => {
  validateExportItems(items);

  const opts: ExportOptions = {
    includeProgress: Boolean(options?.includeProgress),
    includeNotes: Boolean(options?.includeNotes),
    includeTags: Boolean(options?.includeTags)
  };

  let content = `My CineFlix Watchlist\n`;
  content += `Generated on ${new Date().toLocaleDateString()}\n`;
  content += `Total items: ${items.length}\n\n`;

  items.forEach((item, index) => {
    const s = extractSerializedItem(item, opts);
    content += `${index + 1}. ${s.title} (${s.year})\n`;
    content += `   Type: ${s.type}\n`;
    content += `   Runtime: ${formatRuntime(s.runtime)}\n`;
    content += `   Status: ${s.status}\n`;
    content += `   Rating: ${(s.rating || 0).toFixed(1)}/10\n`;
    content += `   Added: ${new Date(s.dateAdded).toLocaleDateString()}\n`;

    if (opts.includeProgress && typeof s.progress !== 'undefined' && s.progress > 0) {
      content += `   Progress: ${s.progress}%\n`;
    }

    if (opts.includeNotes && s.notes) {
      content += `   Notes: ${s.notes}\n`;
    }

    if (opts.includeTags && s.tags && s.tags.length > 0) {
      content += `   Tags: ${s.tags.join(', ')}\n`;
    }

    content += '\n';
  });

  return content;
};

const ExportModal: React.FC<ExportModalProps> = ({
  items,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [shareableLink, setShareableLink] = useState('');
  const [copied, setCopied] = useState(false);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const options: ExportOptions = {
      includeProgress,
      includeNotes,
      includeTags
    };

    try {
      validateExportItems(items);

      switch (exportFormat) {
        case 'csv': {
          const content = serializeToCSV(items, options);
          downloadFile(content, `cineflix-watchlist-${timestamp}.csv`, 'text/csv');
          break;
        }
        case 'json': {
          const content = serializeToJSON(items, options);
          downloadFile(content, `cineflix-watchlist-${timestamp}.json`, 'application/json');
          break;
        }
        case 'text': {
          const content = serializeToText(items, options);
          downloadFile(content, `cineflix-watchlist-${timestamp}.txt`, 'text/plain');
          break;
        }
        case 'pdf': {
          // For PDF generation, you would typically use a library like jsPDF.
          // To preserve current behavior, export as text with .txt extension.
          const content = serializeToText(items, options);
          downloadFile(content, `cineflix-watchlist-${timestamp}.txt`, 'text/plain');
          break;
        }
        default:
          throw new Error('Unsupported export format');
      }

      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      // Provide simple user feedback on failure
      try {
        alert(`Export failed: ${err?.message || 'Unknown error'}`);
      } catch {
        // fall through if alert is not available
      }
    }
  };

  const generateShareableLink = () => {
    try {
      // In a real app, this would create a shareable link on your server
      const listData = btoa(JSON.stringify(items.slice(0, 10))); // Limit for URL length
      const link = `${window.location.origin}/shared-list?data=${listData}`;
      setShareableLink(link);
    } catch (err) {
      console.error('Failed to generate shareable link:', err);
      try {
        alert('Failed to generate shareable link');
      } catch {
        // ignore
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      try {
        alert('Failed to copy link to clipboard');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-netflix-red" />
            <h2 className="text-2xl font-bold text-white">Export My List</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-white mb-2">
              Exporting <span className="font-semibold text-netflix-red">{items.length}</span> items from your list
            </p>
            <p className="text-gray-400 text-sm">
              Choose your preferred format and customize what information to include.
            </p>
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-netflix-red bg-netflix-red/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileText className="w-6 h-6 text-netflix-red mx-auto mb-2" />
                <div className="text-white font-medium">PDF</div>
                <div className="text-gray-400 text-xs">Formatted document</div>
              </button>

              <button
                onClick={() => setExportFormat('csv')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  exportFormat === 'csv'
                    ? 'border-netflix-red bg-netflix-red/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileText className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-white font-medium">CSV</div>
                <div className="text-gray-400 text-xs">Spreadsheet format</div>
              </button>

              <button
                onClick={() => setExportFormat('json')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  exportFormat === 'json'
                    ? 'border-netflix-red bg-netflix-red/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileJson className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-white font-medium">JSON</div>
                <div className="text-gray-400 text-xs">Developer format</div>
              </button>

              <button
                onClick={() => setExportFormat('text')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  exportFormat === 'text'
                    ? 'border-netflix-red bg-netflix-red/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <div className="text-white font-medium">Text</div>
                <div className="text-gray-400 text-xs">Plain text file</div>
              </button>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Include Information</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProgress}
                  onChange={(e) => setIncludeProgress(e.target.checked)}
                  className="w-4 h-4 text-netflix-red bg-gray-800 border-gray-600 rounded focus:ring-netflix-red"
                />
                <span className="text-white">Watch progress</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 text-netflix-red bg-gray-800 border-gray-600 rounded focus:ring-netflix-red"
                />
                <span className="text-white">Personal notes</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  className="w-4 h-4 text-netflix-red bg-gray-800 border-gray-600 rounded focus:ring-netflix-red"
                />
                <span className="text-white">Custom tags</span>
              </label>
            </div>
          </div>

          {/* Sharing Options */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Share Your List</h3>
            <div className="space-y-3">
              <button
                onClick={generateShareableLink}
                className="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Link className="w-5 h-5 text-blue-400" />
                <span className="text-white">Generate Shareable Link</span>
              </button>

              {shareableLink && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-netflix-red hover:bg-red-700 text-white rounded transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Share this link with friends to show them your watchlist (first 10 items)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-netflix-red hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Export {exportFormat.toUpperCase()}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;