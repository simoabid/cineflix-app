import React, { useState } from 'react';
import { CollectionDetails, FranchiseFilter, CollectionType, CollectionStatus } from '../types';
import { Filter, X, ChevronDown } from 'lucide-react';

interface CollectionsFilterProps {
  onFilterChange: (filters: FranchiseFilter) => void;
  collections: CollectionDetails[];
}

const CollectionsFilter: React.FC<CollectionsFilterProps> = ({ onFilterChange, collections }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FranchiseFilter>({});

  // Extract unique values from collections for filter options
  const genres = Array.from(new Set(collections.flatMap(c => c.genre_categories))).sort();
  const studios = Array.from(new Set(collections.map(c => c.studio))).sort();

  const typeOptions: { value: CollectionType; label: string }[] = [
    { value: 'trilogy', label: 'Trilogy (3 films)' },
    { value: 'quadrilogy', label: 'Quadrilogy (4 films)' },
    { value: 'pentology', label: 'Pentology (5 films)' },
    { value: 'extended_series', label: 'Extended Series (6+ films)' },
    { value: 'incomplete_series', label: 'Incomplete Series' }
  ];

  const statusOptions: { value: CollectionStatus; label: string }[] = [
    { value: 'complete', label: 'Complete' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'incomplete', label: 'Incomplete' }
  ];

  const completionOptions = [
    { value: 'all', label: 'All Collections' },
    { value: 'completed', label: 'Completed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'not_started', label: 'Not Started' }
  ];

  const handleFilterChange = (key: keyof FranchiseFilter, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleArrayFilterToggle = (key: keyof FranchiseFilter, value: string) => {
    const currentArray = (activeFilters[key] as string[]) || [];
    let newArray: string[];
    
    if (currentArray.includes(value)) {
      newArray = currentArray.filter(item => item !== value);
    } else {
      newArray = [...currentArray, value];
    }
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const clearFilters = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.genre?.length) count++;
    if (activeFilters.type?.length) count++;
    if (activeFilters.status?.length) count++;
    if (activeFilters.studio?.length) count++;
    if (activeFilters.completion && activeFilters.completion !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white hover:border-red-500 transition-colors flex items-center space-x-2"
      >
        <Filter className="w-5 h-5" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Filter Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filter Collections</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Completion Status Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Progress Status</h4>
                <div className="space-y-2">
                  {completionOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="completion"
                        value={option.value}
                        checked={activeFilters.completion === option.value || (option.value === 'all' && !activeFilters.completion)}
                        onChange={(e) => handleFilterChange('completion', e.target.value === 'all' ? undefined : e.target.value)}
                        className="text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Collection Type Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Collection Type</h4>
                <div className="space-y-2">
                  {typeOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilters.type?.includes(option.value) || false}
                        onChange={() => handleArrayFilterToggle('type', option.value)}
                        className="text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500 rounded"
                      />
                      <span className="text-sm text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Series Status</h4>
                <div className="space-y-2">
                  {statusOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilters.status?.includes(option.value) || false}
                        onChange={() => handleArrayFilterToggle('status', option.value)}
                        className="text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500 rounded"
                      />
                      <span className="text-sm text-gray-300 capitalize">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Genres</h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {genres.map(genre => (
                    <label key={genre} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilters.genre?.includes(genre) || false}
                        onChange={() => handleArrayFilterToggle('genre', genre)}
                        className="text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500 rounded"
                      />
                      <span className="text-sm text-gray-300">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Studio Filter */}
              {studios.length > 1 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Studios</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {studios.map(studio => (
                      <label key={studio} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters.studio?.includes(studio) || false}
                          onChange={() => handleArrayFilterToggle('studio', studio)}
                          className="text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500 rounded"
                        />
                        <span className="text-sm text-gray-300">{studio}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Apply Button */}
            <div className="border-t border-gray-700 p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionsFilter;
