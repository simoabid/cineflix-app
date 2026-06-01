import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSmartPlayer } from '@/hooks/useSmartPlayer';
import LoadingScreen from '@/components/feedback/LoadingScreen';

interface WatchRedirectProps {
  type: 'movie' | 'tv';
}

/**
 * WatchRedirect intercepts legacy '/watch/movie/:id' and '/watch/tv/:id' URLs
 * and transitions them to the modally integrated Smart Player.
 */
export const WatchRedirect: React.FC<WatchRedirectProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { openPlayer } = useSmartPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const tmdbId = parseInt(id, 10);
      const season = searchParams.get('season') ? parseInt(searchParams.get('season')!, 10) : 1;
      const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!, 10) : 1;

      // Open player modally
      openPlayer({
        tmdbId,
        type,
        season,
        episode
      });

      // Redirect the routing background to home page
      navigate('/', { replace: true });
    }
  }, [id, type, searchParams, openPlayer, navigate]);

  return <LoadingScreen message="Redirecting to smart stream player..." />;
};

export default WatchRedirect;
