import React, { useState } from 'react';
import { 
  Play, 
  MoreVertical, 
  Star, 
  Trash2, 
  CheckSquare, 
  Square,
  EyeOff,
  Heart
} from 'lucide-react';
import { MyListItem, ContentStatus, PriorityLevel } from '../../types/myList';
import { Link } from 'react-router-dom';

export type ImageSize = 'w154' | 'w185' | 'w342' | 'w500' | 'original';

/**
 * Safely builds an image URL or returns a placeholder when no path is provided.
 * Exported for unit testing.
 *
 * @param path - The image path from TMDB or null/undefined.
 * @param size - Desired image size key.
 * @returns A fully qualified image URL or a local placeholder path.
 */
export const getImageUrl = (path: string | null | undefined, size: ImageSize = 'w154'): string => {
  if (!path) return '/api/placeholder/154/231';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Extracts a reasonable title from a content object.
 * Exported for unit testing.
 *
 * @param item - The MyListItem object containing content metadata.
 * @returns The best-effort title, or 'Unknown Title' if unavailable.
 */
export const getTitle = (item: MyListItem | null | undefined): string => {
  const content = item?.content as any;
  if (!content) return 'Unknown Title';
  return content.title || content.name || 'Unknown Title';
};

/**
 * Extracts the year from release or first air date.
 * Exported for unit testing.
 *
 * @param item - The MyListItem object.
 * @returns A string year (e.g., '2023') or an empty string when not available.
 */
export const getYear = (item: MyListItem | null | undefined): string => {
  const content = item?.content as any;
  const date = content?.release_date || content?.first_air_date;
  if (!date) return '';
  const parsed = Date.parse(date);
  if (isNaN(parsed)) return '';
  return new Date(parsed).getFullYear().toString();
};

/**
 * Formats runtime minutes into an hours/minutes human readable string.
 * Exported for unit testing.
 *
 * @param minutes - Duration in minutes.
 * @returns Formatted string like "1h 30m" or "45m".
 */
export const formatRuntime = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Formats a numeric progress into a percentage string.
 * Exported for unit testing.
 *
 * @param progress - Progress value (0-100).
 * @returns Rounded percentage string.
 */
export const formatProgress = (progress: number | null | undefined): string => {
  const value = typeof progress === 'number' && !isNaN(progress) ? progress : 0;
  return `${Math.round(value)}%`;
};

/**
 * Maps priority levels to CSS color utility classes.
 * Exported for unit testing.
 *
 * @param priority - Priority level string.
 * @returns Tailwind CSS class string for the color.
 */
export const getPriorityColor = (priority: PriorityLevel | null | undefined): string => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

/**
 * Maps content status to CSS color utility classes.
 * Exported for unit testing.
 *
 * @param status - Content status string.
 * @returns Tailwind CSS class string for the text color.
 */
export const getStatusColor = (status: ContentStatus | null | undefined): string => {
  switch (status) {
    case 'completed': return 'text-green-400';
    case 'inProgress': return 'text-yellow-400';
    case 'dropped': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

/**
 * Builds a partial MyListItem payload representing the changes for a status update.
 * Guarded against invalid input and exported for reuse in unit tests.
 *
 * @param status - Desired content status.
 * @returns Partial<MyListItem> carrying status and optional progress.
 */
export const buildStatusUpdate = (status: ContentStatus | null | undefined): Partial<MyListItem> => {
  if (!status) return {};
  const update: Partial<MyListItem> = { status };
  if (status === 'completed') {
    update.progress = 100;
  } else if (status === 'notStarted') {
    update.progress = 0;
  }
  return update;
};

/**
 * Builds a partial MyListItem payload for priority changes.
 * Safe-guards against invalid input.
 *
 * @param priority - Desired priority level.
 * @returns Partial<MyListItem> with priority when valid, otherwise empty object.
 */
export const buildPriorityUpdate = (priority: PriorityLevel | null | undefined): Partial<MyListItem> => {
  if (!priority) return {};
  return { priority };
};

/**
 * Normalizes and validates an unknown value into an array of MyListItem.
 * Useful for defensive handling of external data sources.
 *
 * @param items - Unknown input expected to be an array of items.
 * @returns Array of MyListItem with basic shape validation; returns empty array for invalid input.
 */
export const normalizeItems = (items: unknown): MyListItem[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((it: any) => it && typeof it.id === 'string') as MyListItem[];
};

/**
 * Props for the ListView component.
 */
interface ListViewProps {
  items: MyListItem[];
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
}

/**
 * Props for individual ItemRow component.
 */
interface ItemRowProps {
  item: MyListItem;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
  showingMenu: string | null;
  setShowingMenu: (id: string | null) => void;
}

/**
 * Renders a single row for an item and handles its local actions.
 * Kept as a focused component to reduce complexity inside the parent.
 *
 * NOTE: This component intentionally mirrors the behavior of the previous inline row renderer.
 */
const ItemRow: React.FC<ItemRowProps> = ({
  item,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  onItemRemove,
  showingMenu,
  setShowingMenu
}) => {
  const isSelected = selectedItems.includes(item.id);

  const safeTitle = getTitle(item);
  const safeYear = getYear(item);
  const safeRuntime = formatRuntime(item.estimatedRuntime);
  const safeVoteAverage = (item.content && typeof (item.content as any).vote_average === 'number') ? (item.content as any).vote_average : 0;
  const safeOverview = (item.content && (item.content as any).overview) ? (item.content as any).overview : '';

  const handleStatusChange = (itemId: string, status: ContentStatus) => {
    const updates = buildStatusUpdate(status);
    onItemUpdate(itemId, updates);
    setShowingMenu(null);
  };

  const handlePriorityChange = (itemId: string, priority: PriorityLevel) => {
    const updates = buildPriorityUpdate(priority);
    onItemUpdate(itemId, updates);
    setShowingMenu(null);
  };

  return (
    <div className="group bg-gray-900/50 hover:bg-gray-800/50 rounded-lg p-4 transition-colors">
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onItemSelect(item.id, !isSelected);
          }}
          className={`p-1 rounded transition-colors ${
            isSelected 
              ? 'bg-netflix-red text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>

        {/* Thumbnail */}
        <Link to={`/${item.contentType}/${item.contentId}`} className="flex-shrink-0">
          <div className="w-16 h-24 relative rounded overflow-hidden group-hover:scale-105 transition-transform">
            <img
              src={getImageUrl((item.content as any)?.poster_path)}
              alt={safeTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/${item.contentType}/${item.contentId}`}>
            <h3 className="text-white font-medium text-lg mb-1 hover:text-netflix-red transition-colors">
              {safeTitle}
            </h3>
          </Link>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-2">
            <span>{safeYear}</span>
            <span>•</span>
            <span className="capitalize">{item.contentType}</span>
            <span>•</span>
            <span>{safeRuntime}</span>
            {safeVoteAverage > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{safeVoteAverage.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-gray-400 text-sm line-clamp-2 mb-2">
            {safeOverview}
          </p>

          {/* Tags and Notes */}
          <div className="flex flex-wrap gap-2 mb-2">
            {Array.isArray(item.customTags) && item.customTags.map(tag => (
              <span key={tag} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>

          {item.personalNotes && (
            <p className="text-gray-400 text-sm italic">
              "{item.personalNotes}"
            </p>
          )}
        </div>

        {/* Status and Progress */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`}></div>
            {item.isLiked && (
              <div className="bg-red-600/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-white fill-current" />
                <span className="text-white text-xs font-medium">Liked</span>
              </div>
            )}
            <span className={`text-sm ${getStatusColor(item.status)}`}>
              {String(item.status).replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>

          {typeof item.progress === 'number' && item.progress > 0 && (
            <div className="w-24 mb-2">
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-netflix-red h-2 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatProgress(item.progress)}</p>
            </div>
          )}

          {item.personalRating && (
            <div className="flex items-center gap-1 justify-end mb-2">
              <span className="text-yellow-400">★</span>
              <span className="text-sm text-gray-400">{item.personalRating}/5</span>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Added {new Date(item.dateAdded).toLocaleDateString()}
          </div>
        </div>

        {/* Menu Button */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowingMenu(showingMenu === item.id ? null : item.id);
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {showingMenu === item.id && (
            <div className="absolute right-0 top-10 bg-gray-800 rounded-lg shadow-lg py-2 min-w-48 z-20">
              {/* Status Options */}
              <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700">Status</div>
              <button
                onClick={() => handleStatusChange(item.id, 'notStarted')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Not Started
              </button>
              <button
                onClick={() => handleStatusChange(item.id, 'inProgress')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                In Progress
              </button>
              <button
                onClick={() => handleStatusChange(item.id, 'completed')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Completed
              </button>
              <button
                onClick={() => handleStatusChange(item.id, 'dropped')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <EyeOff className="w-4 h-4" />
                Dropped
              </button>

              {/* Priority Options */}
              <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mt-2">Priority</div>
              <button
                onClick={() => handlePriorityChange(item.id, 'high')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                High Priority
              </button>
              <button
                onClick={() => handlePriorityChange(item.id, 'medium')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                Medium Priority
              </button>
              <button
                onClick={() => handlePriorityChange(item.id, 'low')}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Low Priority
              </button>

              {/* Actions */}
              <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mt-2">Actions</div>
              <button
                onClick={() => {
                  onItemRemove(item.id);
                  setShowingMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-red-400 text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove from List
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ListView component displays a list of MyListItem rows.
 *
 * - Extracts pure helper functions to module scope for testability.
 * - Uses a focused ItemRow subcomponent to reduce cognitive load in the parent.
 * - Adds guards for invalid items input.
 */
const ListView: React.FC<ListViewProps> = ({
  items,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  onItemRemove
}) => {
  const [showingMenu, setShowingMenu] = useState<string | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowingMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!Array.isArray(items)) {
    return <div className="text-red-400">Invalid items data</div>;
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <ItemRow
          key={item.id}
          item={item}
          selectedItems={selectedItems}
          onItemSelect={onItemSelect}
          onItemUpdate={onItemUpdate}
          onItemRemove={onItemRemove}
          showingMenu={showingMenu}
          setShowingMenu={setShowingMenu}
        />
      ))}
    </div>
  );
};

export default ListView;