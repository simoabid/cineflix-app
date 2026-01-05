import React from 'react';
import { ViewMode, MyListItem } from '../../types/myList';
import GridView from './GridView';
import ListView from './ListView';
import CompactView from './CompactView';

interface ListContentProps {
  items: MyListItem[];
  viewMode: ViewMode;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  onItemUpdate: (itemId: string, updates: Partial<MyListItem>) => void;
  onItemRemove: (itemId: string) => void;
}

const ListContent: React.FC<ListContentProps> = ({
  items,
  viewMode,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  onItemRemove
}) => {
  const commonProps = {
    items,
    selectedItems,
    onItemSelect,
    onItemUpdate,
    onItemRemove
  };

  switch (viewMode) {
    case 'grid':
      return <GridView {...commonProps} />;
    case 'list':
      return <ListView {...commonProps} />;
    case 'compact':
      return <CompactView {...commonProps} />;
    default:
      return <GridView {...commonProps} />;
  }
};

export default ListContent;
