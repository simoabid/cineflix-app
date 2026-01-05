import React, { useState } from 'react';
import { 
  Play, 
  MoreVertical, 
  Star, 
  Trash2, 
  CheckSquare, 
  Square,
  EyeOff
} from 'lucide-react';
import { MyListItem, ContentStatus, PriorityLevel } from '../../types/myList';
import { Link } from 'react-router-dom';

interface CompactViewProps {
  items: MyListItem[];
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
}

const CompactView: React.FC<CompactViewProps> = ({
  items,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  onItemRemove
}) => {
  const [showingMenu, setShowingMenu] = useState<string | null>(null);

  const getTitle = (item: MyListItem) => {
    return (item.content as any).title || (item.content as any).name || 'Unknown Title';
  };

  const getYear = (item: MyListItem) => {
    const date = (item.content as any).release_date || (item.content as any).first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatProgress = (progress: number) => {
    return `${Math.round(progress)}%`;
  };

  const getPriorityColor = (priority: PriorityLevel) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'inProgress': return 'text-yellow-400';
      case 'dropped': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: ContentStatus) => {
    switch (status) {
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      case 'inProgress': return <Play className="w-4 h-4" />;
      case 'dropped': return <EyeOff className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  const handleStatusChange = (itemId: string, status: ContentStatus) => {
    const progress = status === 'completed' ? 100 : status === 'notStarted' ? 0 : undefined;
    onItemUpdate(itemId, { status, ...(progress !== undefined && { progress }) });
    setShowingMenu(null);
  };

  const handlePriorityChange = (itemId: string, priority: PriorityLevel) => {
    onItemUpdate(itemId, { priority });
    setShowingMenu(null);
  };

  const ItemRow: React.FC<{ item: MyListItem }> = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <div className="group flex items-center gap-3 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors text-sm">
        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onItemSelect(item.id, !isSelected);
          }}
          className={`flex-shrink-0 ${
            isSelected 
              ? 'text-netflix-red' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        {/* Priority Indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(item.priority)}`}></div>

        {/* Status Icon */}
        <div className={`flex-shrink-0 ${getStatusColor(item.status)}`}>
          {getStatusIcon(item.status)}
        </div>

        {/* Title */}
        <Link 
          to={`/${item.contentType}/${item.contentId}`}
          className="flex-1 min-w-0 text-white hover:text-netflix-red transition-colors truncate"
        >
          {getTitle(item)}
        </Link>

        {/* Year */}
        <div className="flex-shrink-0 w-12 text-gray-400 text-xs">
          {getYear(item)}
        </div>

        {/* Type */}
        <div className="flex-shrink-0 w-16 text-gray-400 text-xs capitalize">
          {item.contentType}
        </div>

        {/* Progress */}
        <div className="flex-shrink-0 w-16 text-gray-400 text-xs">
          {item.progress > 0 ? formatProgress(item.progress) : '-'}
        </div>

        {/* Runtime */}
        <div className="flex-shrink-0 w-20 text-gray-400 text-xs">
          {formatRuntime(item.estimatedRuntime)}
        </div>

        {/* Rating */}
        <div className="flex-shrink-0 w-12 text-gray-400 text-xs flex items-center gap-1">
          {item.content.vote_average > 0 ? (
            <>
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{item.content.vote_average.toFixed(1)}</span>
            </>
          ) : (
            '-'
          )}
        </div>

        {/* Date Added */}
        <div className="flex-shrink-0 w-20 text-gray-400 text-xs">
          {new Date(item.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>

        {/* Tags */}
        <div className="flex-shrink-0 w-24 text-gray-400 text-xs truncate">
          {item.customTags.length > 0 ? item.customTags.join(', ') : '-'}
        </div>

        {/* Menu Button */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowingMenu(showingMenu === item.id ? null : item.id);
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showingMenu === item.id && (
            <div className="absolute right-0 top-6 bg-gray-800 rounded-lg shadow-lg py-2 min-w-48 z-20">
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
    );
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowingMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="bg-gray-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
        <div className="w-4"></div> {/* Checkbox space */}
        <div className="w-2"></div> {/* Priority space */}
        <div className="w-4"></div> {/* Status space */}
        <div className="flex-1">Title</div>
        <div className="w-12">Year</div>
        <div className="w-16">Type</div>
        <div className="w-16">Progress</div>
        <div className="w-20">Runtime</div>
        <div className="w-12">Rating</div>
        <div className="w-20">Added</div>
        <div className="w-24">Tags</div>
        <div className="w-6"></div> {/* Menu space */}
      </div>

      {/* Items */}
      <div className="max-h-96 overflow-y-auto">
        {items.map(item => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default CompactView;
