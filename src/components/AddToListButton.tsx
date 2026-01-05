import React, { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Movie, TVShow } from '../types';
import { useMyList } from '../hooks/useMyList';

interface AddToListButtonProps {
  content: Movie | TVShow;
  contentType: 'movie' | 'tv';
  variant?: 'icon' | 'button' | 'card';
  className?: string;
  showText?: boolean;
}

const AddToListButton: React.FC<AddToListButtonProps> = ({
  content,
  contentType,
  variant = 'icon',
  className = '',
  showText = true
}) => {
  const { isInList, toggleInList } = useMyList();
  const [isLoading, setIsLoading] = useState(false);
  
  const inList = isInList(content.id, contentType);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      await toggleInList(content, contentType);
    } catch (error) {
      console.error('Error toggling list item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {showText && variant !== 'icon' && <span>Loading...</span>}
        </>
      );
    }

    if (inList) {
      return (
        <>
          <Check className="w-4 h-4" />
          {showText && variant !== 'icon' && <span>In My List</span>}
        </>
      );
    }

    return (
      <>
        <Plus className="w-4 h-4" />
        {showText && variant !== 'icon' && <span>Add to List</span>}
      </>
    );
  };

  const getButtonClasses = () => {
    const baseClasses = 'transition-all duration-200 flex items-center gap-2';
    
    switch (variant) {
      case 'icon':
        return `${baseClasses} p-2 rounded-full ${
          inList 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-800/80 hover:bg-gray-700 text-white hover:text-netflix-red'
        } ${className}`;
      
      case 'button':
        return `${baseClasses} px-4 py-2 rounded-lg font-medium ${
          inList
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-netflix-red hover:bg-red-700 text-white'
        } ${className}`;
      
      case 'card':
        return `${baseClasses} px-3 py-2 rounded-md text-sm ${
          inList
            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
            : 'bg-gray-800/80 text-white hover:bg-netflix-red/20 hover:text-netflix-red border border-gray-600'
        } ${className}`;
      
      default:
        return `${baseClasses} ${className}`;
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={getButtonClasses()}
      title={inList ? 'Remove from My List' : 'Add to My List'}
    >
      {getButtonContent()}
    </button>
  );
};

export default AddToListButton;
