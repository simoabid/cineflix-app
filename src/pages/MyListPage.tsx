import React, { useState, useEffect, useCallback } from 'react';

import { myListService } from '../services/myListService';
import { MyListItem, ViewMode, FilterOptions, SortOption, SortDirection, ListStats } from '../types/myList';
import MyListHeader from '../components/MyList/MyListHeader';
import FilterBar from '../components/MyList/FilterBar';

import ListContent from '../components/MyList/ListContent';
import EmptyState from '../components/MyList/EmptyState';
import BulkActions from '../components/MyList/BulkActions';
import StatsModal from '../components/MyList/StatsModal';
import ExportModal from '../components/MyList/ExportModal';

const MyListPage: React.FC = () => {
  // State management
  const [items, setItems] = useState<MyListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MyListItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ListStats | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    contentType: 'all',
    status: 'all',
    genres: [],
    dateAdded: 'all',
    rating: 'all',
    runtime: 'all',
    releaseYear: 'all',
    customTags: [],
    priority: 'all',
    liked: 'all'
  });

  // Load data on component mount
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [myListItems, statsData, tags] = await Promise.all([
        myListService.getMyList(),
        myListService.getListStats(),
        myListService.getAllTags()
      ]);
      setItems(myListItems);
      setFilteredItems(myListItems);
      setStats(statsData);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading My List:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await myListService.getPreferences();
        setViewMode(preferences.defaultViewMode);
        setSortBy(preferences.defaultSortOption);
        setSortDirection(preferences.defaultSortDirection);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Update filtered items when filters, sort, or search change
  useEffect(() => {
    const applyFiltersAndSort = async () => {
      try {
        let result: MyListItem[];

        if (searchQuery.trim()) {
          result = await myListService.searchItems(searchQuery);
          // Apply filters to search results
          result = result.filter(item => {
            if (filters.contentType !== 'all' && item.contentType !== filters.contentType) return false;
            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
            return true;
          });
        } else {
          result = await myListService.getFilteredItems(filters, sortBy, sortDirection);
        }

        setFilteredItems(result);
      } catch (error) {
        console.error('Error filtering items:', error);
        setFilteredItems([]);
      }
    };

    if (items.length > 0) {
      applyFiltersAndSort();
    }
  }, [items, filters, sortBy, sortDirection, searchQuery]);

  // Handle item updates
  const handleUpdateItem = async (itemId: string, updates: Partial<MyListItem>) => {
    try {
      await myListService.updateItem(itemId, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  // Handle item removal
  const handleRemoveItem = async (itemId: string) => {
    try {
      await myListService.removeFromList(itemId);
      await loadData();
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: any) => {
    try {
      await myListService.performBulkOperation(operation);
      await loadData();
      setSelectedItems([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    }
  };

  // Handle item selection
  const handleItemSelect = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle sort changes
  const handleSortChange = (newSortBy: SortOption, newDirection?: SortDirection) => {
    setSortBy(newSortBy);
    if (newDirection) {
      setSortDirection(newDirection);
    } else {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    }
  };

  // Handle view mode change
  const handleViewModeChange = async (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    try {
      const preferences = await myListService.getPreferences();
      await myListService.savePreferences({ ...preferences, defaultViewMode: newViewMode });
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  };

  // Show bulk actions when items are selected
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0);
  }, [selectedItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A1F] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 netflix-spinner-thick" />
            <div className="h-20 w-20 netflix-ripple" />
            <div className="h-20 w-20 netflix-ripple" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="text-center loading-text">
            <p className="text-white text-lg font-medium mb-2">Loading your list...</p>
            <div className="flex gap-2 justify-center">
              <div className="netflix-dot" />
              <div className="netflix-dot" />
              <div className="netflix-dot" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header - now containing search */}
        <MyListHeader
          stats={stats || { totalItems: 0, totalMovies: 0, totalTVShows: 0, totalHours: 0, completionRate: 0, averageRating: 0, genreDistribution: {}, statusDistribution: { notStarted: 0, inProgress: 0, completed: 0, dropped: 0 }, monthlyAdditions: {} }}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}

          onStatsClick={() => setShowStatsModal(true)}
          onExportClick={() => setShowExportModal(true)}
          selectedCount={selectedItems.length}
          totalCount={filteredItems.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          availableTags={availableTags}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />

        {/* Quick Actions Section */}
        {/* {(continueWatchingItems.length > 0 || recentlyAddedItems.length > 0) && (
          <QuickActions
            continueWatching={continueWatchingItems}
            recentlyAdded={recentlyAddedItems}
            onItemUpdate={handleUpdateItem}
            onItemRemove={handleRemoveItem}
          />
        )} */}

        {/* Bulk Actions */}
        {showBulkActions && (
          <BulkActions
            selectedItems={selectedItems}
            onBulkOperation={handleBulkOperation}
            onSelectAll={handleSelectAll}
            onClearSelection={() => setSelectedItems([])}
            isAllSelected={selectedItems.length === filteredItems.length}
          />
        )}

        {/* Main Content */}
        {filteredItems.length === 0 ? (
          <EmptyState
            hasItems={items.length > 0}
            searchQuery={searchQuery}
            onClearFilters={() => {
              setFilters({
                contentType: 'all',
                status: 'all',
                genres: [],
                dateAdded: 'all',
                rating: 'all',
                runtime: 'all',
                releaseYear: 'all',
                customTags: [],
                priority: 'all',
                liked: 'all'
              });
              setSearchQuery('');
            }}
          />
        ) : (
          <ListContent
            items={filteredItems}
            viewMode={viewMode}
            selectedItems={selectedItems}
            onItemSelect={handleItemSelect}
            onItemUpdate={handleUpdateItem}
            onItemRemove={handleRemoveItem}
          />
        )}

        {/* Modals */}
        {showStatsModal && stats && (
          <StatsModal
            stats={stats}
            items={items}
            onClose={() => setShowStatsModal(false)}
          />
        )}

        {showExportModal && (
          <ExportModal
            items={selectedItems.length > 0
              ? filteredItems.filter(item => selectedItems.includes(item.id))
              : filteredItems
            }
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MyListPage;
