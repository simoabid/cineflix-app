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
import { useSmartPlayer } from '../../hooks/useSmartPlayer';

interface DetailHeroProps {
  readonly content: Movie | TVShow;
  readonly type: 'movie' | 'tv';
  readonly credits: MovieCredits | null;
  /** Real IMDb rating from OMDb API (e.g. "7.6"), or null */
  readonly imdbRating?: string | null;
  /** Source indicator: 'imdb' = real OMDb data, 'tmdb' = fallback */
  readonly ratingSource?: 'imdb' | 'tmdb' | 'none';
  /** True while the OMDb fetch is in-flight */
  readonly isRatingLoading?: boolean;
}

/**
 * Full-screen hero section for the detail page, displaying the backdrop,
 * poster, title logo, metadata badges, genres, and action buttons.
 */
const DetailHero: React.FC<DetailHeroProps> = ({ content, type, credits, imdbRating, ratingSource, isRatingLoading }) => {
  const navigate = useNavigate();
  const { openPlayer } = useSmartPlayer();
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
    <div className="relative">
      {/* Back Button (Global across viewports) */}
      <div className="fixed top-24 left-6 sm:left-10 z-[100]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-xl w-10 h-10 sm:w-auto sm:px-6 sm:py-3.5 rounded-full hover:bg-black/90 transition-all duration-300 border border-white/10 hover:border-netflix-red/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:-translate-x-1 transition-transform flex-shrink-0" />
          <span className="text-white font-bold text-sm sm:text-base tracking-wide uppercase hidden sm:inline">Back</span>
        </button>
      </div>

      {/* ============================================
          MOBILE / TABLET HERO LAYOUT (< lg)
          Widescreen Banner + Floating Overlapping Poster + Natural Scroll
          ============================================ */}
      <div className="lg:hidden relative w-full bg-[#0A0A1F] pb-6 flex flex-col">
        {/* Cinematic Widescreen Backdrop Banner */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
          <img
            src={getBackdropUrl(content.backdrop_path, 'w780')}
            alt={getTitle()}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPosterUrl(content.poster_path, 'original');
            }}
          />
          {/* Gradient transitions for dark theme integration */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Floating Poster & Title Row */}
        <div className="px-5 sm:px-8 -mt-16 sm:-mt-24 relative z-20 flex gap-4 sm:gap-6 items-end">
          {/* Floating Poster Card */}
          <div className="w-24 sm:w-32 md:w-36 flex-shrink-0">
            <img
              src={getPosterUrl(content.poster_path, 'w500')}
              alt={getTitle()}
              className="w-full rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 transform hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
              }}
            />
          </div>

          {/* Title Logo & Info Aligned to Right of Poster */}
          <div className="flex-1 pb-1 text-left">
            <div className="mb-2 max-w-[200px] sm:max-w-xs md:max-w-sm">
              <LogoImage
                logoPath={content.logo_path}
                title={getTitle()}
                size="lg"
                className="justify-start"
                textClassName="text-xl sm:text-2xl md:text-3xl font-extrabold text-left leading-tight"
                maxHeight="max-h-12 sm:max-h-16 md:max-h-20"
                contentId={content.id}
                contentType={type}
                enableOnDemandFetch={true}
              />
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-white/90">
              {/* TMDB Rating */}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span className="font-bold">{formatRating(content.vote_average)}</span>
                <span className="text-white/40 text-[10px] ml-0.5">TMDB</span>
              </div>
              {/* IMDb Rating */}
              {imdbRating && ratingSource === 'imdb' && (
                <>
                  <span className="text-white/40">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 font-bold">{imdbRating}</span>
                    <span className="text-yellow-400/70 text-[10px] font-semibold">IMDb</span>
                  </div>
                </>
              )}
              {isRatingLoading && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-yellow-400/50 text-[10px] font-semibold animate-pulse">IMDb ···</span>
                </>
              )}
              <span className="text-white/40">•</span>
              <span>{getReleaseYear()}</span>
              {getRuntime() && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{getRuntime()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions, Genres, and Plot Synopsis (Flows Naturally, Zero Screen Overflow) */}
        <div className="px-5 sm:px-8 mt-6 space-y-6 text-left">
          {/* Genres (Pill style) */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {content.genres?.slice(0, 3).map((genre) => (
              <span
                key={genre.id}
                className="bg-white/5 border border-white/10 text-white/80 px-3 py-1 rounded-full text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                {genre.name}
              </span>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Watch Now button */}
            <button
              onClick={() => openPlayer({ tmdbId: id, type })}
              className="hero-watch-btn flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm sm:text-base text-white hover:scale-105 active:scale-[0.97] transition-all shadow-[0_4px_20px_rgba(229,9,20,0.3)] w-full sm:w-auto"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <AddToListButton
                content={content}
                contentType={type}
                variant="button"
                showText={true}
                className="hero-glass-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[11px] sm:text-xs font-semibold text-white hover:scale-105 active:scale-[0.97] transition-all"
              />
              <LikeButton
                content={content}
                contentType={type}
                variant="button"
                showText={true}
                className="hero-glass-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[11px] sm:text-xs font-semibold text-white hover:scale-105 active:scale-[0.97] transition-all"
              />
              <button
                onClick={handleShare}
                className="hero-glass-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[11px] sm:text-xs font-semibold text-white hover:scale-105 active:scale-[0.97] transition-all"
                aria-label="Share this title"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Tagline & Plot Overview */}
          <div className="space-y-2">
            {content.tagline && (
              <p className="text-xs sm:text-sm text-gray-300 italic">
                "{content.tagline}"
              </p>
            )}
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-2xl">
              {content.overview}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================
          DESKTOP HERO LAYOUT (lg+)
          ============================================ */}
      <div className="hidden lg:block relative h-screen">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={getBackdropUrl(content.backdrop_path, 'original')}
            alt={getTitle()}
            className="w-full h-full object-cover transition-all duration-1000"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/fallback-backdrop.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A1F] via-[#0A0A1F]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-transparent to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-end pb-4 sm:pb-6 md:pb-16">
          <Container size="default" className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12 items-end">
            {/* Poster — Hidden on mobile */}
            <div className="lg:block lg:col-span-1">
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
                {/* TMDB Rating block */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-400 fill-current" />
                  <span className="font-semibold">{formatRating(content.vote_average)}</span>
                  <span className="text-gray-400 text-xs">TMDB</span>
                  <span className="text-gray-500 hidden sm:inline">({content.vote_count?.toLocaleString()} votes)</span>
                </div>
                {/* IMDb Rating block */}
                {imdbRating && ratingSource === 'imdb' && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-yellow-400">{imdbRating}</span>
                    <span className="text-yellow-500 text-xs font-semibold">IMDb</span>
                  </div>
                )}
                {isRatingLoading && (
                  <div className="flex items-center gap-1 sm:gap-2 animate-pulse">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400/40 fill-yellow-400/40" />
                    <span className="text-yellow-400/50 font-semibold text-xs">IMDb ···</span>
                  </div>
                )}
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
                  onClick={() => openPlayer({ tmdbId: id, type })}
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
    </div>
  );
};

export default DetailHero;
