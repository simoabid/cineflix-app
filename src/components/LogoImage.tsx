import React, { useState, useEffect } from 'react';
import { getLogoUrl } from '../services/tmdb';

interface LogoImageProps {
  logoPath?: string | null;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  textClassName?: string;
  priority?: 'logo' | 'text'; // Which to prefer when both are available
  maxHeight?: string;
  onLogoLoad?: () => void;
  onLogoError?: () => void;
  // New props for on-demand logo fetching
  contentId?: number;
  contentType?: 'movie' | 'tv';
  enableOnDemandFetch?: boolean;
}

const LogoImage: React.FC<LogoImageProps> = ({
  logoPath,
  title,
  size = 'md',
  className = '',
  textClassName = '',
  priority = 'logo',
  maxHeight,
  onLogoLoad,
  onLogoError,
  contentId,
  contentType,
  enableOnDemandFetch = true
}) => {
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [fetchedLogoPath, setFetchedLogoPath] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      logoSize: 'w185',
      maxHeight: maxHeight || 'max-h-12',
      textSize: 'text-sm',
      minHeight: 'min-h-[2rem]'
    },
    md: {
      logoSize: 'w300',
      maxHeight: maxHeight || 'max-h-16',
      textSize: 'text-base',
      minHeight: 'min-h-[3rem]'
    },
    lg: {
      logoSize: 'w500',
      maxHeight: maxHeight || 'max-h-20',
      textSize: 'text-lg',
      minHeight: 'min-h-[4rem]'
    },
    xl: {
      logoSize: 'original',
      maxHeight: maxHeight || 'max-h-24',
      textSize: 'text-xl',
      minHeight: 'min-h-[5rem]'
    }
  };

  const config = sizeConfig[size];

  // On-demand logo fetching
  useEffect(() => {
    const fetchLogo = async () => {
      if (!enableOnDemandFetch || !contentId || !contentType || isFetching) return;
      if (logoPath || fetchedLogoPath) return; // Already have a logo
      
      setIsFetching(true);
      
      try {
        // Check cache first
        const { logoCache } = await import('../services/logoCache');
        const cachedLogo = logoCache.getLogo(contentId, contentType);
        
        if (cachedLogo) {
          setFetchedLogoPath(cachedLogo.logoPath);
          if (cachedLogo.logoPath) {
            setShowLogo(true);
          }
          return;
        }
        
        // Fetch from API
        const { getMovieDetails, getTVShowDetails } = await import('../services/tmdb');
        const details = contentType === 'movie' 
          ? await getMovieDetails(contentId)
          : await getTVShowDetails(contentId);
          
        setFetchedLogoPath(details.logo_path || null);
        if (details.logo_path) {
          setShowLogo(true);
        }
        
      } catch (error) {
        console.warn(`Failed to fetch logo for ${contentType} ${contentId}:`, error);
        setFetchedLogoPath(null);
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchLogo();
  }, [contentId, contentType, enableOnDemandFetch, logoPath, fetchedLogoPath, isFetching]);

  useEffect(() => {
    const currentLogoPath = logoPath || fetchedLogoPath;
    if (currentLogoPath && priority === 'logo') {
      setShowLogo(true);
    } else {
      setShowLogo(false);
    }
  }, [logoPath, fetchedLogoPath, priority]);

  const handleLogoLoad = () => {
    setLogoLoaded(true);
    setLogoError(false);
    onLogoLoad?.();
  };

  const handleLogoError = () => {
    setLogoError(true);
    setLogoLoaded(false);
    setShowLogo(false);
    onLogoError?.();
  };

  // If no logo path or logo failed to load, show text
  const currentLogoPath = logoPath || fetchedLogoPath;
  if (!currentLogoPath || logoError || !showLogo) {
    return (
      <div 
        className={`flex items-center justify-center ${config.minHeight} ${className}`}
      >
        <h1 
          className={`
            font-bold text-white leading-tight text-center
            ${config.textSize}
            ${textClassName}
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]
            text-shadow-lg
          `}
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          {title}
        </h1>
      </div>
    );
  }

  return (
    <div className={`logo-container ${config.minHeight} ${className}`}>
      {/* Logo Image */}
      <img
        src={getLogoUrl(currentLogoPath, config.logoSize)}
        alt={title}
        className={`
          w-auto h-auto object-contain transition-all duration-500
          ${config.maxHeight}
          ${logoLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          logo-glow logo-glow-hover
        `}
        onLoad={handleLogoLoad}
        onError={handleLogoError}
        loading="eager"
      />
      
      {/* Loading state - show text while logo loads */}
      {!logoLoaded && !logoError && (
        <div 
          className={`
            absolute inset-0 flex items-center justify-center
            transition-opacity duration-300
            ${logoLoaded ? 'opacity-0' : 'opacity-100'}
          `}
        >
          <h1 
            className={`
              font-bold text-white leading-tight text-center
              ${config.textSize}
              ${textClassName}
              drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]
            `}
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
            }}
          >
            {title}
          </h1>
        </div>
      )}
    </div>
  );
};

export default LogoImage; 