import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { myListService } from '../services/myListService';
import { Movie, TVShow } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface LikeButtonProps {
  content: Movie | TVShow;
  contentType: 'movie' | 'tv';
  variant?: 'icon' | 'button';
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LikeButton: React.FC<LikeButtonProps> = ({
  content,
  contentType,
  variant = 'icon',
  className = '',
  showText = false,
  size = 'md'
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  const isReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const popTransition = isReducedMotion
    ? {}
    : { scale: [1, 1.35, 0.9, 1.05, 1], transition: { duration: 0.4 } };

  // Check if content is liked on component mount - properly handle async
  useEffect(() => {
    let mounted = true;

    const checkLiked = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      try {
        const liked = await myListService.isLiked(content.id, contentType);
        if (mounted) {
          setIsLiked(liked);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
        if (mounted) {
          setIsLiked(false);
          setIsLoading(false);
        }
      }
    };

    checkLiked();

    return () => { mounted = false; };
  }, [content.id, contentType]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Please sign in to like your favorite content', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      if (isLiked) {
        await myListService.unlikeContent(content.id, contentType);
        setIsLiked(false);
      } else {
        await myListService.likeContent(content, contentType);
        setIsLiked(true);
      }
      setAnimationKey(prev => prev + 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'lg': return 'w-12 h-12';
      default: return 'w-10 h-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleLike}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${isLiked
          ? 'bg-buttons-purple hover:bg-buttons-purpleHover text-white'
          : 'bg-gray-800/90 hover:bg-buttons-purple text-white border border-white/30 hover:border-buttons-purple'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${className}`}
      >
        <AnimatePresence mode="wait">
          <motion.span key={`heart-btn-${animationKey}`} animate={popTransition} className="inline-flex">
            <Heart
              className={`${getIconSize()} transition-all duration-300 ${isLiked ? 'fill-current text-white' : 'text-white'
                }`}
            />
          </motion.span>
        </AnimatePresence>
        {showText && (
          <span className="text-sm font-medium">
            {isLiked ? 'Liked' : 'Like'}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`${getSizeClasses()} rounded-full flex items-center justify-center transition-all duration-300 ${isLiked
        ? 'bg-buttons-purple hover:bg-buttons-purpleHover text-white shadow-lg shadow-buttons-purple/25'
        : 'bg-gray-800/90 hover:bg-buttons-purple text-white border border-white/30 hover:border-buttons-purple'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:shadow-lg'} ${className}`}
      title={isLiked ? 'Unlike' : 'Like'}
    >
      <AnimatePresence mode="wait">
        <motion.span key={`heart-icon-${animationKey}`} animate={popTransition} className="inline-flex">
          <Heart
            className={`${getIconSize()} transition-all duration-300 ${isLiked ? 'fill-current text-white scale-110' : 'text-white'
              }`}
          />
        </motion.span>
      </AnimatePresence>
      {showText && (
        <span className="ml-2 text-xs font-medium">
          {isLiked ? 'Liked' : 'Like'}
        </span>
      )}
    </button>
  );
};

export default LikeButton;
