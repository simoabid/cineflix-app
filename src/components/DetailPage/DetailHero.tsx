import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Share2,
  ChevronLeft,
  Star,
  Clock,
  Calendar,
  Users,
} from 'lucide-react';
import { getPosterUrl, getBackdropUrl } from '../../services/tmdb';
import { Movie, TVShow, MovieCredits } from '../../types';
import AddToListButton from '../AddToListButton';
import LikeButton from '../LikeButton';
import LogoImage from '../LogoImage';
import { Container } from '../layout';

interface DetailHeroProps {
  readonly content: Movie | TVShow;
  readonly type: 'movie' | 'tv';
  readonly credits: MovieCredits | null;
}

/**
 * Full-screen hero section for the detail page, displaying the backdrop,
 * poster, title logo, metadata badges, genres, and action buttons.
 */
const DetailHero: React.FC<DetailHeroProps> = ({ content, type, credits }) => {
  const navigate = useNavigate();
  const id = content.id;

  const getTitle = (): string => {
    return type === 'movie' ? (content as Movie).title : (content as TVShow).name;
  };

  const getReleaseYear = (): string => {
    const date = type === 'movie'
      ? (content as Movie).release_date
      : (content as TVShow).first_air_date;
    return date ? String(new Date(date).getFullYear()) : '';
  };

  const getRuntime = (): string => {
    if (type === 'movie') {
      const runtime = (content as Movie).runtime;
      if (!runtime) return '';
      const hours = Math.floor(runtime / 60);
      const minutes = runtime % 60;
      return `${hours}h ${minutes}m`;
    }
    const runtime = (content as TVShow).episode_run_time?.[0];
    return runtime ? `${runtime} min/ep` : '';
  };

  const formatRating = (rating: number): string => {
    return String(Math.round(rating * 10) / 10);
  };

  const getDirector = (): string => {
    if (!credits) return 'Unknown';
    if (type === 'movie') {
      const director = credits.crew.find(member => member.job === 'Director');
      return director ? director.name : 'Unknown';
    }
    const creator = credits.crew.find(member =>
      member.job === 'Creator' ||
      member.job === 'Executive Producer' ||
      member.job === 'Director'
    );
    return creator ? creator.name : 'Unknown';
  };

  const handleShare = (): void => {
    if (navigator.share) {
      navigator.share({
        title: getTitle(),
        text: content.overview,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="relative h-screen">
      {/* Background Image — Responsive poster (mobile) / backdrop (desktop) */}
      <div className="absolute inset-0">
        <img
          src={getPosterUrl(content.poster_path, 'w780')}
          alt={getTitle()}
          className="lg:hidden w-full h-full object-cover transition-all duration-1000"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
          }}
        />
        <img
          src={getBackdropUrl(content.backdrop_path, 'original')}
          alt={getTitle()}
          className="hidden lg:block w-full h-full object-cover transition-all duration-1000"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/fallback-backdrop.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A1F] via-[#0A0A1F]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-transparent to-transparent"></div>
      </div>

      {/* Back Button */}
      <div className="fixed top-24 left-6 sm:left-10 z-[100]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-xl px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full hover:bg-black/90 transition-all duration-300 border border-white/10 hover:border-netflix-red/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-white font-bold text-sm sm:text-base tracking-wide uppercase">Back</span>
        </button>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 h-full flex items-end pb-4 sm:pb-6 md:pb-16">
        <Container size="default" className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12 items-end">
          {/* Poster — Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="max-w-2xl mx-auto lg:mx-0 transform lg:-translate-y-8">
              <img
                src={getPosterUrl(content.poster_path, 'w780')}
                alt={getTitle()}
                className="w-full rounded-xl shadow-2xl border-4 border-white/10 hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                }}
              />
            </div>
          </div>

          {/* Content Info */}
          <div className="col-span-1 lg:col-span-3 space-y-4 md:space-y-6 lg:pl-8">
            {/* Title with Logo */}
            <div>
              <div className="mb-2 md:mb-4">
                <LogoImage
                  logoPath={content.logo_path}
                  title={getTitle()}
                  size="xl"
                  className="justify-start"
                  textClassName="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
                  maxHeight="max-h-20 md:max-h-28 lg:max-h-32"
                  contentId={content.id}
                  contentType={type}
                  enableOnDemandFetch={true}
                />
              </div>
              {content.tagline && (
                <p className="text-base md:text-lg lg:text-xl text-gray-300 italic mb-2 md:mb-4">
                  "{content.tagline}"
                </p>
              )}
              <div className="mb-3 md:mb-6">
                <p className="text-sm md:text-base lg:text-lg text-gray-200 leading-relaxed line-clamp-2 max-w-4xl">
                  {content.overview}
                </p>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm md:text-base lg:text-lg">
              <div className="flex items-center gap-1 sm:gap-2">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-400 fill-current" />
                <span className="font-semibold">{formatRating(content.vote_average)}</span>
                <span className="text-gray-400 hidden sm:inline">({content.vote_count?.toLocaleString()} votes)</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                <span>{getReleaseYear()}</span>
              </div>
              {getRuntime() && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                  <span>{getRuntime()}</span>
                </div>
              )}
              <div className="flex items-center gap-1 sm:gap-2 hidden md:flex">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-400 mr-1 sm:mr-2">{type === 'movie' ? 'Director:' : 'Creator:'}</span>
                <span className="truncate max-w-32">{getDirector()}</span>
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-3">
              {content.genres?.map((genre) => (
                <span
                  key={genre.id}
                  className="bg-netflix-red/20 border border-netflix-red/30 text-netflix-red px-4 py-2 rounded-full text-sm font-medium"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <button
                onClick={() => navigate(`/watch/${type}/${id}`)}
                className="flex items-center justify-center gap-2 sm:gap-3 bg-netflix-red hover:bg-netflix-red/80 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-xl hover:scale-105 w-full sm:w-auto"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                <span>Watch Now</span>
              </button>
              <AddToListButton
                content={content}
                contentType={type}
                variant="button"
                showText={true}
                className="flex items-center justify-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105 w-full sm:w-auto"
              />
              <LikeButton
                content={content}
                contentType={type}
                variant="button"
                showText={true}
                className="flex items-center justify-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105 w-full sm:w-auto"
              />
              <button
                onClick={handleShare}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
              >
                <Share2 className="w-6 h-6" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default DetailHero;
