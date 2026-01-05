import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'carousel' | 'page' | 'hero' | 'spinner';
  count?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  text?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = '',
  size = 'md',
  showText = false,
  text = 'Loading...'
}) => {
  const renderCardSkeleton = () => (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-gray-700 rounded-lg" />
      <div className="mt-2 space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );

  const renderCarouselSkeleton = () => (
    <div className="space-y-4">
      <div className="h-8 bg-gray-700 rounded w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[2/3] bg-gray-700 rounded-lg" />
            <div className="mt-2 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHeroSkeleton = () => (
    <div className="relative h-[70vh] bg-gray-800 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
        <div className="h-12 bg-gray-700 rounded w-96 mb-4" />
        <div className="h-4 bg-gray-700 rounded w-full max-w-2xl mb-2" />
        <div className="h-4 bg-gray-700 rounded w-3/4 max-w-2xl mb-6" />
        <div className="flex gap-4">
          <div className="h-12 bg-gray-700 rounded w-32" />
          <div className="h-12 bg-gray-700 rounded w-40" />
        </div>
      </div>
    </div>
  );

  const renderPageSkeleton = () => (
    <div className="min-h-screen bg-[#0A0A1F]">
      {/* Hero Skeleton */}
      {renderHeroSkeleton()}

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {Array.from({ length: 6 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <div className="h-8 bg-gray-700 rounded w-48 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, itemIndex) => (
                <div key={itemIndex} className="animate-pulse">
                  <div className="aspect-[2/3] bg-gray-700 rounded-lg" />
                  <div className="mt-2 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSpinner = () => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-16 w-16',
      lg: 'h-24 w-24',
      xl: 'h-32 w-32'
    };

    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          {/* Main spinner with thick border */}
          <div className={`${sizeClasses[size]} netflix-spinner-thick`} />

          {/* Ripple effect */}
          <div className={`${sizeClasses[size]} netflix-ripple`} />
          <div
            className={`${sizeClasses[size]} netflix-ripple`}
            style={{ animationDelay: '0.5s' }}
          />
        </div>

        {/* Loading text with dots animation */}
        {showText && (
          <div className="text-center space-y-2 loading-text">
            <p className="text-white text-lg font-medium">{text}</p>
            <div className="flex gap-2 justify-center">
              <div className="netflix-dot" />
              <div className="netflix-dot" />
              <div className="netflix-dot" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSkeleton = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'card':
        return Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderCardSkeleton()}</div>
        ));
      case 'carousel':
        return renderCarouselSkeleton();
      case 'hero':
        return renderHeroSkeleton();
      case 'page':
      default:
        return renderPageSkeleton();
    }
  };

  return (
    <div className={className} role="status" aria-label="Loading content">
      {renderSkeleton()}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSkeleton;
