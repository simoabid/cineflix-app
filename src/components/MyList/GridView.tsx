import React, { useState } from 'react';
import { 
  Play, 
  MoreVertical, 
  Star, 
  Calendar, 
  Trash2, 
  CheckSquare, 
  Square,
  Tag,
  EyeOff,
  Heart
} from 'lucide-react';
import { MyListItem, ContentStatus, PriorityLevel } from '../../types/myList';
import { Link } from 'react-router-dom';

export type { MyListItem, ContentStatus, PriorityLevel };

/**
 * Safely read a field from item.content with deterministic fallback.
 * @param item - the list item
 * @param key - key to read from item.content
 * @returns the value or undefined
 */
export const safeContentField = (item: MyListItem, key: string): any => {
  try {
    if (!item || typeof item !== 'object') return undefined;
    const content = (item as any).content;
    if (!content || typeof content !== 'object') return undefined;
    return content[key];
  } catch {
    return undefined;
  }
};

/**
 * Returns an image URL or deterministic placeholder if path is falsy.
 * @param path - poster path from TMDB
 * @param size - size token for TMDB image
 * @returns fully-qualified image URL or local placeholder
 */
export const getImageUrl = (path: string | null | undefined, size: string = 'w300'): string => {
  if (!path) return '/api/placeholder/300/450';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Derives a display title for the item with safe fallbacks.
 * @param item - the list item
 * @returns title string (never empty)
 */
export const getTitle = (item: MyListItem): string => {
  const content = (item as any)?.content;
  const title = content?.title || content?.name || content?.original_title || content?.original_name;
  return typeof title === 'string' && title.trim().length > 0 ? title : 'Unknown Title';
};

/**
 * Derives a display year or an empty string when unavailable.
 * @param item - the list item
 * @returns year as string or empty string
 */
export const getYear = (item: MyListItem): string => {
  const date = safeContentField(item, 'release_date') || safeContentField(item, 'first_air_date');
  if (!date) return '';
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return '';
  try {
    return new Date(parsed).getFullYear().toString();
  } catch {
    return '';
  }
};

/**
 * Formats runtime minutes to "Xh Ym" or "Xm" deterministically.
 * @param minutes - runtime in minutes
 * @returns human-readable runtime string
 */
export const formatRuntime = (minutes: number | null | undefined): string => {
  const m = typeof minutes === 'number' && !Number.isNaN(minutes) && minutes >= 0 ? Math.floor(minutes) : 0;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Formats progress number to a percentage string with deterministic fallback.
 * @param progress - progress as number (0-100)
 * @returns percent string e.g. "23%"
 */
export const formatProgress = (progress: number | null | undefined): string => {
  const p = typeof progress === 'number' && !Number.isNaN(progress) ? progress : 0;
  return `${Math.round(p)}%`;
};

/**
 * Maps priority levels to Tailwind color classes with deterministic fallback.
 * @param priority - priority level
 * @returns tailwind class string
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
 * Maps content status to tailwind text color classes with deterministic fallback.
 * @param status - content status
 * @returns tailwind class string for text color
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
 * Returns a human readable status string (e.g. "inProgress" -> "in Progress").
 * @param status - raw status value
 */
export const getStatusText = (status: ContentStatus | string | null | undefined): string => {
  if (!status || typeof status !== 'string') return '';
  return status.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * Safely extracts numeric vote average from item content.
 * @param item - the list item
 * @returns number or undefined
 */
export const getVoteAverage = (item: MyListItem): number | undefined => {
  const v = safeContentField(item, 'vote_average');
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
};

/**
 * Safely derive progress value (0-100) from item.
 * @param item - the list item
 * @returns numeric progress (defaults to 0)
 */
export const getProgressValue = (item: MyListItem): number => {
  const p = (item as any)?.progress;
  return typeof p === 'number' && !Number.isNaN(p) ? p : 0;
};

/**
 * Safely returns custom tags array from item.
 * @param item - the list item
 * @returns array of strings
 */
export const getCustomTags = (item: MyListItem): string[] => {
  const tags = (item as any)?.customTags;
  return Array.isArray(tags) ? tags : [];
};

/**
 * Formats dateAdded string to local date or fallback.
 * @param date - date string
 * @returns formatted date string or 'Unknown date'
 */
export const formatDateAdded = (date?: string | null): string => {
  if (!date || typeof date !== 'string') return 'Unknown date';
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return 'Unknown date';
  try {
    return new Date(parsed).toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
};

/**
 * Checks whether an item id is present in selectedItems.
 * @param itemId - id to check
 * @param selectedItems - selected ids array
 */
export const isItemSelected = (itemId: string, selectedItems?: string[] | null): boolean => {
  return Array.isArray(selectedItems) && selectedItems.includes(itemId);
};

interface GridViewProps {
  items: MyListItem[];
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
}

/**
 * GridView
 * Renders a responsive grid of list items as cards.
 *
 * Props:
 * - items: array of MyListItem (if empty or invalid, renders a deterministic empty state)
 * - selectedItems: array of selected item ids
 * - onItemSelect: callback when an item is toggled
 * - onItemUpdate: callback to update item fields (status, priority, progress, etc.)
 * - onItemRemove: callback to remove item from list
 */
const GridView: React.FC<GridViewProps> = ({
  items,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  onItemRemove
}) => {
  const [showingMenu, setShowingMenu] = useState<string | null>(null);

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-gray-400">No items to display</div>
    );
  }

  const handleStatusChange = (itemId: string, status: ContentStatus) => {
    const progress = status === 'completed' ? 100 : status === 'notStarted' ? 0 : undefined;
    onItemUpdate(itemId, { status, ...(progress !== undefined && { progress }) });
    setShowingMenu(null);
  };

  const handlePriorityChange = (itemId: string, priority: PriorityLevel) => {
    onItemUpdate(itemId, { priority });
    setShowingMenu(null);
  };

  const ItemCard: React.FC<{ item: MyListItem }> = ({ item }) => {
    const isSelected = isItemSelected(item.id, selectedItems);

    const posterPath = safeContentField(item, 'poster_path') as string | null | undefined;
    const imageUrl = getImageUrl(posterPath);
    const title = getTitle(item);
    const year = getYear(item);
    const runtime = formatRuntime((item as any)?.estimatedRuntime);
    const statusText = getStatusText(item.status);
    const statusColorClass = getStatusColor(item.status);
    const priorityDotClass = getPriorityColor(item.priority);
    const voteAverage = getVoteAverage(item);
    const hasVoteAverage = typeof voteAverage === 'number' && voteAverage > 0;
    const progressValue = getProgressValue(item);
    const hasProgress = progressValue > 0;
    const customTagsArray = getCustomTags(item);
    const dateAdded = formatDateAdded((item as any)?.dateAdded);

    return (
      <div className="group relative bg-gray-900 rounded-lg overflow-hidden hover:scale-105 transition-all duration-200">
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onItemSelect(item.id, !isSelected);
            }}
            className={`p-1 rounded transition-colors ${
              isSelected 
                ? 'bg-netflix-red text-white' 
                : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
        </div>

        {/* Priority Indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${priorityDotClass}`}></div>

        {/* Liked Indicator */}
        {item.isLiked && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-red-600/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg flex items-center gap-1">
              <Heart className="w-3 h-3 text-white fill-current" />
              <span className="text-white text-xs font-medium">Liked</span>
            </div>
          </div>
        )}

        {/* Menu Button */}
        <div className="absolute top-2 right-8 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowingMenu(showingMenu === item.id ? null : item.id);
            }}
            className="p-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showingMenu === item.id && (
            <div className="absolute right-0 top-8 bg-gray-800 rounded-lg shadow-lg py-2 min-w-48 z-20">
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

        <Link to={`/${item.contentType}/${item.contentId}`} className="block">
          <div className="aspect-[2/3] relative">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Progress Bar */}
            {hasProgress && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                  <div 
                    className="bg-netflix-red h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <p className="text-xs text-white">{formatProgress(progressValue)} watched</p>
              </div>
            )}

            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
              <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        </Link>

        {/* Card Info */}
        <div className="p-3">
          <h3 className="text-white font-medium text-sm mb-2 line-clamp-2">{title}</h3>
          
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>{year}</span>
              <span className="capitalize">{item.contentType}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>{runtime}</span>
              <span className={statusColorClass}>
                {statusText}
              </span>
            </div>

            {hasVoteAverage && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                <span>{(voteAverage as number).toFixed(1)}</span>
              </div>
            )}

            {typeof item.personalRating === 'number' && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span>Your rating: {item.personalRating}/5</span>
              </div>
            )}

            {customTagsArray.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span className="truncate">{customTagsArray.join(', ')}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              <span>Added {dateAdded}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowingMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default GridView;