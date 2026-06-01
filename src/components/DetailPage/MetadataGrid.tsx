import React from 'react';
import {
  CheckCircle2,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Film,
  Tv,
  Users,
  Star,
} from 'lucide-react';
import { Movie, TVShow } from '../../types';
import InfoCard from './InfoCard';

interface MetadataGridProps {
  readonly content: Movie | TVShow;
  readonly type: 'movie' | 'tv';
  readonly director?: string;
  readonly runtime?: string;
  readonly columns?: 1 | 2 | 3;
  /** Real IMDb rating string from OMDb (e.g. "7.6"), or null if unavailable */
  readonly imdbRating?: string | null;
  /** Source of the rating: 'imdb' for real OMDb data, 'tmdb' for fallback */
  readonly ratingSource?: 'imdb' | 'tmdb' | 'none';
}

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

/**
 * Renders a responsive grid of InfoCard tiles surfacing the most relevant
 * metadata for the title. Automatically adapts between movie and TV show data.
 */
const MetadataGrid: React.FC<MetadataGridProps> = ({
  content,
  type,
  director,
  runtime,
  columns = 2,
  imdbRating,
  ratingSource,
}) => {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[columns];

  const releaseDateStr =
    type === 'movie' ? (content as Movie).release_date : (content as TVShow).first_air_date;

  const releaseDateFormatted = releaseDateStr
    ? new Date(releaseDateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : 'TBA';

  return (
    <div className={`grid ${cols} gap-3 sm:gap-4`}>
      {content.status && (
        <InfoCard
          icon={CheckCircle2}
          label="Status"
          value={content.status}
          accent="green"
        />
      )}

      <InfoCard
        icon={Star}
        label="TMDB Rating"
        value={`${(Math.round(content.vote_average * 10) / 10).toFixed(1)} / 10`}
        subValue={`${content.vote_count?.toLocaleString() || 0} votes`}
        accent="yellow"
      />

      {imdbRating && ratingSource === 'imdb' && (
        <InfoCard
          icon={Star}
          label="IMDb Rating"
          value={`${imdbRating} / 10`}
          subValue="Source: IMDb via OMDb"
          accent="yellow"
        />
      )}

      {runtime && (
        <InfoCard
          icon={Clock}
          label={type === 'movie' ? 'Runtime' : 'Episode'}
          value={runtime}
          accent="blue"
        />
      )}

      <InfoCard
        icon={Calendar}
        label={type === 'movie' ? 'Release Date' : 'First Aired'}
        value={releaseDateFormatted}
        accent="purple"
      />

      <InfoCard
        icon={Globe}
        label="Language"
        value={content.spoken_languages?.[0]?.english_name || 'English'}
        accent="blue"
      />

      {director && (
        <InfoCard
          icon={Users}
          label={type === 'movie' ? 'Director' : 'Creator'}
          value={director}
          accent="red"
        />
      )}

      {type === 'tv' && (content as TVShow).number_of_seasons !== undefined && (
        <InfoCard
          icon={Tv}
          label="Seasons"
          value={(content as TVShow).number_of_seasons || 0}
          accent="orange"
        />
      )}

      {type === 'tv' && (content as TVShow).number_of_episodes !== undefined && (
        <InfoCard
          icon={Film}
          label="Episodes"
          value={(content as TVShow).number_of_episodes || 0}
          accent="purple"
        />
      )}

      {type === 'movie' && !!(content as Movie).budget && (content as Movie).budget! > 0 && (
        <InfoCard
          icon={DollarSign}
          label="Budget"
          value={formatCurrency((content as Movie).budget!)}
          accent="yellow"
        />
      )}

      {type === 'movie' && !!(content as Movie).revenue && (content as Movie).revenue! > 0 && (
        <InfoCard
          icon={TrendingUp}
          label="Revenue"
          value={formatCurrency((content as Movie).revenue!)}
          accent="green"
        />
      )}
    </div>
  );
};

export default MetadataGrid;
