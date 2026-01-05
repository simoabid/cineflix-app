import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface UserRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  className?: string;
}

const UserRating: React.FC<UserRatingProps> = ({ rating, onRate, className = '' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (starRating: number) => {
    onRate(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-4">
        <span className="text-white font-medium">Rate this:</span>
        
        <div 
          className="flex items-center space-x-1"
          onMouseLeave={handleMouseLeave}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              className="transition-transform hover:scale-110"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
            >
              {star <= displayRating ? (
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
              ) : (
                <Star className="h-6 w-6 text-gray-600 hover:text-yellow-400 transition-colors" />
              )}
            </motion.button>
          ))}
        </div>

        {rating > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400 font-semibold">{rating}</span>
            <span className="text-gray-400 text-sm">/ 5</span>
          </div>
        )}
      </div>
      
      {hoverRating > 0 && (
        <div className="mt-2 text-sm text-gray-400">
          {hoverRating === 1 && "Terrible"}
          {hoverRating === 2 && "Bad"}
          {hoverRating === 3 && "Okay"}
          {hoverRating === 4 && "Good"}
          {hoverRating === 5 && "Excellent"}
        </div>
      )}
    </div>
  );
};

export default UserRating;