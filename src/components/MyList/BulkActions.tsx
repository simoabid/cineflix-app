import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Eye, 
  EyeOff, 
  Flag, 
  Tag, 
  X,
  ChevronDown
} from 'lucide-react';
import { BulkOperation, PriorityLevel } from '../../types/myList';

interface BulkActionsProps {
  selectedItems: string[];
  onBulkOperation: (operation: BulkOperation) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedItems,
  onBulkOperation,
  onSelectAll,
  onClearSelection,
  isAllSelected
}) => {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleMarkWatched = () => {
    onBulkOperation({
      type: 'markWatched',
      itemIds: selectedItems
    });
  };

  const handleMarkUnwatched = () => {
    onBulkOperation({
      type: 'markUnwatched',
      itemIds: selectedItems
    });
  };

  const handleRemove = () => {
    if (confirm(`Are you sure you want to remove ${selectedItems.length} items from your list?`)) {
      onBulkOperation({
        type: 'remove',
        itemIds: selectedItems
      });
    }
  };

  const handleSetPriority = (priority: PriorityLevel) => {
    onBulkOperation({
      type: 'setPriority',
      itemIds: selectedItems,
      payload: priority
    });
    setShowPriorityMenu(false);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onBulkOperation({
        type: 'addTags',
        itemIds: selectedItems,
        payload: [newTag.trim()]
      });
      setNewTag('');
      setShowTagMenu(false);
    }
  };



  return (
    <div className="bg-netflix-red/10 border border-netflix-red/20 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-netflix-red hover:text-red-400 transition-colors"
          >
            {isAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          
          <div className="text-white">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mark as Watched */}
          <button
            onClick={handleMarkWatched}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Mark Watched</span>
          </button>

          {/* Mark as Unwatched */}
          <button
            onClick={handleMarkUnwatched}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            <EyeOff className="w-4 h-4" />
            <span className="hidden sm:inline">Mark Unwatched</span>
          </button>

          {/* Priority Menu */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Priority</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showPriorityMenu && (
              <div className="absolute top-10 left-0 bg-gray-800 rounded-lg shadow-lg py-2 min-w-40 z-20">
                <button
                  onClick={() => handleSetPriority('high')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  High Priority
                </button>
                <button
                  onClick={() => handleSetPriority('medium')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  Medium Priority
                </button>
                <button
                  onClick={() => handleSetPriority('low')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Low Priority
                </button>
              </div>
            )}
          </div>

          {/* Tag Menu */}
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Add Tag</span>
            </button>

            {showTagMenu && (
              <div className="absolute top-10 left-0 bg-gray-800 rounded-lg shadow-lg p-3 min-w-48 z-20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter tag name..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-netflix-red"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-netflix-red hover:bg-red-700 text-white rounded text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Remove */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
