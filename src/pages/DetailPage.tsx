import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Share2,
  ChevronLeft,
  Star,
  Clock,
  Calendar,
  Users,
  Globe,
  ExternalLink,
  PlayCircle,
  User,
  Award,
  //Download,
  Film
} from 'lucide-react';
import {
  getMovieDetails,
  getTVShowDetails,
  getMovieVideos,
  getTVShowVideos,
  getMovieCredits,
  getTVShowCredits,
  getSimilarMovies,
  getSimilarTVShows,
  getEnhancedSimilarTVShows,
  getEnhancedSimilarMovies,
  getEnhancedRecommendationsMovies,
  getEnhancedRecommendationsTVShows,
  getMovieRecommendations,
  getTVShowRecommendations,
  getTVShowSeasons,
  getTVShowSeasonDetails,
  getPersonDetails,
  getPersonMovieCredits,
  getMovieExternalIds,
  getTVShowExternalIds,
  getImageUrl,
  getPosterUrl,
  getBackdropUrl
} from '../services/tmdb';
import { Movie, TVShow, Video, MovieCredits, CastMember, PersonDetails, PersonMovieCredits } from '../types';
import CastCrewSection from '../components/DetailPage/CastCrewSection';
import AddToListButton from '../components/AddToListButton';
import LikeButton from '../components/LikeButton';
import EpisodesList from '../components/EpisodesList';
import LogoImage from '../components/LogoImage';
import SimilarContent from '../components/WatchPage/SimilarContent';

interface DetailPageProps {
  type: 'movie' | 'tv';
}

const DetailPage: React.FC<DetailPageProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State management
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [credits, setCredits] = useState<MovieCredits | null>(null);
  const [similarContent, setSimilarContent] = useState<(Movie | TVShow)[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<(Movie | TVShow)[]>([]);
  const [externalIds, setExternalIds] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCastMember, setSelectedCastMember] = useState<CastMember | null>(null);
  const [showCastModal, setShowCastModal] = useState(false);
  const [showFilmographyModal, setShowFilmographyModal] = useState(false);
  const [showActorDetailsModal, setShowActorDetailsModal] = useState(false);
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [personFilmography, setPersonFilmography] = useState<PersonMovieCredits | null>(null);
  const [loadingPersonData, setLoadingPersonData] = useState(false);

  const [displayedMoviesCount, setDisplayedMoviesCount] = useState(6);

  // TV Show specific state
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [selectedSeasonDetails, setSelectedSeasonDetails] = useState<any>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);

  const scrollToTopInstant = useCallback(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootBehavior = root.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    root.scrollTop = 0;
    body.scrollTop = 0;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousRootBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    });
  }, []);

  useLayoutEffect(() => {
    scrollToTopInstant();
  }, [scrollToTopInstant, id, type]);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = 'auto';
    };
  }, []);

  useEffect(() => {
    scrollToTopInstant();
  }, [loading, scrollToTopInstant]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        if (type === 'movie') {
          // Fetch all movie data in parallel
          const [movieData, videosData, creditsData, externalIdsData] = await Promise.all([
            getMovieDetails(parseInt(id)),
            getMovieVideos(parseInt(id)),
            getMovieCredits(parseInt(id)),
            getMovieExternalIds(parseInt(id))
          ]);

          setContent(movieData);
          setVideos(videosData.filter(video => video.site === 'YouTube' && video.type === 'Trailer'));
          setCredits(creditsData);
          setExternalIds(externalIdsData);

          // Fetch enhanced similar and recommended content
          try {
            const [enhancedSimilar, enhancedRecommended] = await Promise.all([
              getEnhancedSimilarMovies(movieData),
              getEnhancedRecommendationsMovies(movieData)
            ]);

            setSimilarContent(enhancedSimilar.slice(0, 12));
            setRecommendedContent(enhancedRecommended.slice(0, 12));
          } catch (error) {
            console.error('Error fetching enhanced content:', error);
            // Minimal fallback
            const [similarData, recommendedData] = await Promise.all([
              getSimilarMovies(movieData.id),
              getMovieRecommendations(movieData.id)
            ]);
            setSimilarContent((similarData.results || []).slice(0, 12));
            setRecommendedContent((recommendedData.results || []).slice(0, 12));
          }
        } else {
          // Fetch all TV show data in parallel
          const [tvData, videosData, creditsData, seasonsData, externalIdsData] = await Promise.all([
            getTVShowDetails(parseInt(id)),
            getTVShowVideos(parseInt(id)),
            getTVShowCredits(parseInt(id)),
            getTVShowSeasons(parseInt(id)),
            getTVShowExternalIds(parseInt(id))
          ]);

          setContent(tvData);
          setVideos(videosData.filter(video => video.site === 'YouTube' && video.type === 'Trailer'));
          setCredits(creditsData);
          setSeasons(seasonsData || []);
          setExternalIds(externalIdsData);

          // Fetch enhanced similar and recommended content
          try {
            const [enhancedSimilar, enhancedRecommended] = await Promise.all([
              getEnhancedSimilarTVShows(tvData),
              getEnhancedRecommendationsTVShows(tvData)
            ]);

            setSimilarContent(enhancedSimilar.slice(0, 12));
            setRecommendedContent(enhancedRecommended.slice(0, 12));
          } catch (error) {
            console.error('Error fetching enhanced content:', error);
            const [similarData, recommendedData] = await Promise.all([
              getSimilarTVShows(tvData.id),
              getTVShowRecommendations(tvData.id)
            ]);
            setSimilarContent((similarData.results || []).slice(0, 12));
            setRecommendedContent((recommendedData.results || []).slice(0, 12));
          }

          // Set first season as default if available
          if (seasonsData && seasonsData.length > 0) {
            const firstRegularSeason = seasonsData.find((s: any) => s.season_number > 0) || seasonsData[0];
            setSelectedSeason(firstRegularSeason);
            // Fetch details for first season
            try {
              const seasonDetails = await getTVShowSeasonDetails(parseInt(id), firstRegularSeason.season_number);
              setSelectedSeasonDetails(seasonDetails);
            } catch (error) {
              console.error('Error fetching season details:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id, type]);

  const getTitle = () => {
    if (!content) return '';
    return type === 'movie' ? (content as Movie).title : (content as TVShow).name;
  };

  const getReleaseYear = () => {
    if (!content) return '';
    const date = type === 'movie'
      ? (content as Movie).release_date
      : (content as TVShow).first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  const getRuntime = () => {
    if (!content) return '';
    if (type === 'movie') {
      const runtime = (content as Movie).runtime;
      if (runtime) {
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        return `${hours}h ${minutes}m`;
      }
    } else {
      const runtime = (content as TVShow).episode_run_time?.[0];
      return runtime ? `${runtime} min/ep` : '';
    }
    return '';
  };

  const formatRating = (rating: number) => {
    return Math.round(rating * 10) / 10;
  };

  const getDirector = () => {
    if (!credits) return 'Unknown';

    if (type === 'movie') {
      const director = credits.crew.find(member => member.job === 'Director');
      return director ? director.name : 'Unknown';
    } else {
      // For TV shows, look for creators, executive producers, or directors
      const creator = credits.crew.find(member =>
        member.job === 'Creator' ||
        member.job === 'Executive Producer' ||
        member.job === 'Director'
      );
      return creator ? creator.name : 'Unknown';
    }
  };


  const handleCastMemberClick = async (castMember: CastMember) => {
    setSelectedCastMember(castMember);
    setShowCastModal(true);
    setDisplayedMoviesCount(6);

    // Fetch person data immediately when opening modal
    await fetchPersonData(castMember.id);
  };

  const closeCastModal = () => {
    setShowCastModal(false);
    setSelectedCastMember(null);
    setPersonDetails(null);
    setPersonFilmography(null);
    setDisplayedMoviesCount(6);
  };

  const handleLoadMoreMovies = () => {
    setDisplayedMoviesCount(prev => prev + 6);
  };

  const fetchPersonData = async (personId: number) => {
    try {
      setLoadingPersonData(true);
      const [details, filmography] = await Promise.all([
        getPersonDetails(personId),
        getPersonMovieCredits(personId)
      ]);
      setPersonDetails(details);
      setPersonFilmography(filmography);
    } catch (error) {
      console.error('Error fetching person data:', error);
    } finally {
      setLoadingPersonData(false);
    }
  };



  const handleMoreInfo = async () => {
    if (!selectedCastMember) return;

    await fetchPersonData(selectedCastMember.id);
    setShowCastModal(false);
    setShowActorDetailsModal(true);
  };

  const closeFilmographyModal = () => {
    setShowFilmographyModal(false);
    setPersonDetails(null);
    setPersonFilmography(null);
  };

  const closeActorDetailsModal = () => {
    setShowActorDetailsModal(false);
    setPersonDetails(null);
    setPersonFilmography(null);
  };


  const handleMovieClick = (movieId: number) => {
    navigate(`/movie/${movieId}`);
  };

  // Season and Episode handlers
  const handleSeasonChange = async (season: any) => {
    if (!id || !season) return;

    setLoadingSeasons(true);
    setSelectedSeason(season);
    setExpandedEpisode(null);

    try {
      const seasonDetails = await getTVShowSeasonDetails(parseInt(id), season.season_number);
      setSelectedSeasonDetails(seasonDetails);
    } catch (error) {
      console.error('Error fetching season details:', error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const toggleEpisodeWatched = (episodeId: string) => {
    const newWatchedEpisodes = new Set(watchedEpisodes);
    if (newWatchedEpisodes.has(episodeId)) {
      newWatchedEpisodes.delete(episodeId);
    } else {
      newWatchedEpisodes.add(episodeId);
    }
    setWatchedEpisodes(newWatchedEpisodes);
    // Here you could save to localStorage or send to backend
  };



  const handleWatchTrailer = (video: Video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  // Download actor image function
  const downloadActorImage = async (imageUrl: string, actorName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${actorName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Generate social media links from external IDs
  const getSocialMediaLinks = () => {
    if (!externalIds) return [];

    const links = [];

    if (externalIds.facebook_id) {
      links.push({
        name: 'Facebook',
        url: `https://www.facebook.com/${externalIds.facebook_id}`,
        icon: 'facebook',
        color: 'bg-blue-600'
      });
    }

    if (externalIds.instagram_id) {
      links.push({
        name: 'Instagram',
        url: `https://www.instagram.com/${externalIds.instagram_id}`,
        icon: 'instagram',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500'
      });
    }

    if (externalIds.twitter_id) {
      links.push({
        name: 'Twitter',
        url: `https://twitter.com/${externalIds.twitter_id}`,
        icon: 'twitter',
        color: 'bg-blue-400'
      });
    }

    if (externalIds.imdb_id) {
      links.push({
        name: 'IMDb',
        url: `https://www.imdb.com/title/${externalIds.imdb_id}`,
        icon: 'imdb',
        color: 'bg-yellow-600'
      });
    }

    if (content?.homepage) {
      links.push({
        name: 'Official Website',
        url: content.homepage,
        icon: 'website',
        color: 'bg-gray-600'
      });
    }

    return links;
  };


  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showVideoModal) {
          closeVideoModal();
        } else if (showFilmographyModal) {
          closeFilmographyModal();
        } else if (showActorDetailsModal) {
          closeActorDetailsModal();
        } else if (showCastModal) {
          closeCastModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showVideoModal, showCastModal, showFilmographyModal, showActorDetailsModal]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A1F] flex items-center justify-center z-50">
        <div className="relative">
          {/* Main thick spinner */}
          <div className="h-32 w-32 netflix-spinner-thick" />

          {/* Ripple effects */}
          <div className="h-32 w-32 netflix-ripple" />
          <div className="h-32 w-32 netflix-ripple" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-[#0A0A1F] flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Link to="/" className="text-netflix-red hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-white">
      {/* Hero Section */}
      <div className="relative h-screen">
        {/* Background Image - Responsive: Vertical poster for mobile/tablet, horizontal backdrop for desktop */}
        <div className="absolute inset-0">
          {/* Mobile/Tablet: Vertical Poster */}
          <img
            src={getPosterUrl(content.poster_path, 'w780')}
            alt={getTitle()}
            className="lg:hidden w-full h-full object-cover transition-all duration-1000"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
            }}
          />
          {/* Desktop: Horizontal Backdrop */}
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

        {/* Back Button - Fixed Bubble */}
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
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12 items-end">
            {/* Movie Poster - Hidden on mobile and small screens */}
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

            {/* Movie Info - Full width on mobile, 3/4 width on desktop */}
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
                {/* Movie Description - 2 lines max */}
                <div className="mb-3 md:mb-6">
                  <p className="text-sm md:text-base lg:text-lg text-gray-200 leading-relaxed line-clamp-2 max-w-4xl">
                    {content.overview}
                  </p>
                </div>
              </div>

              {/* Metadata */}
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
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: getTitle(),
                        text: content.overview,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      // You could add a toast notification here
                    }
                  }}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:scale-105"
                >
                  <Share2 className="w-6 h-6" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="w-full px-8 py-16">
        {type === 'tv' ? (
          // TV Show Layout: 3-column layout with main sections
          <>
            {/* Row 1: 3-Column Layout - Optimized for space usage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
              {/* Column 1 (Left): Seasons & Episodes - Takes more space */}
              <div className="lg:col-span-5">
                <section className="bg-gradient-to-br from-netflix-red/5 to-transparent rounded-2xl p-8 border border-netflix-red/20">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-netflix-red rounded-full"></div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Seasons & Episodes
                      </h2>
                    </div>
                    {selectedSeason && (
                      <div className="flex items-center gap-2 bg-black/30 rounded-lg px-4 py-2">
                        <Film className="w-5 h-5 text-netflix-red" />
                        <span className="text-white font-semibold">Season {selectedSeason.season_number}</span>
                        <span className="text-gray-400">• {selectedSeasonDetails?.episodes?.length || 0} episodes</span>
                      </div>
                    )}
                  </div>

                  {/* Season Selector */}
                  {seasons.length > 0 && (
                    <div className="mb-8">
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {seasons
                          .filter(season => season.season_number >= 0)
                          .map((season) => (
                            <button
                              key={season.id}
                              onClick={() => handleSeasonChange(season)}
                              className={`flex-shrink-0 group relative overflow-hidden rounded-xl transition-all duration-300 ${selectedSeason?.id === season.id
                                ? 'ring-2 ring-netflix-red scale-105'
                                : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                                }`}
                            >
                              <div className="w-32 h-48 relative">
                                {season.poster_path ? (
                                  <img
                                    src={getPosterUrl(season.poster_path, 'w300')}
                                    alt={season.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                                    <Film className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <p className="text-white font-bold text-sm text-center leading-tight">
                                    {season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`}
                                  </p>
                                  <p className="text-gray-300 text-xs text-center mt-1">
                                    {season.episode_count} episodes
                                  </p>
                                </div>
                                {selectedSeason?.id === season.id && (
                                  <div className="absolute top-2 right-2 w-6 h-6 bg-netflix-red rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Episodes List */}
                  {loadingSeasons ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="relative">
                        <div className="h-16 w-16 netflix-spinner-thick" />
                        <div className="h-16 w-16 netflix-ripple" />
                      </div>
                    </div>
                  ) : selectedSeasonDetails?.episodes ? (
                    <EpisodesList
                      episodes={selectedSeasonDetails.episodes}
                      selectedSeason={selectedSeason}
                      watchedEpisodes={watchedEpisodes}
                      expandedEpisode={expandedEpisode}
                      onToggleWatched={toggleEpisodeWatched}
                      onToggleExpanded={setExpandedEpisode}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No episodes available</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Column 2 (Center): Overview & Where to Watch - Medium space */}
              <div className="lg:col-span-4 space-y-8">
                {/* Overview Section */}
                <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Overview
                    </h2>
                  </div>

                  {/* Story Description */}
                  <div className="bg-black/20 rounded-xl p-4 border border-gray-700/30 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-netflix-red" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      Plot Synopsis
                    </h3>
                    <p className="text-gray-200 leading-relaxed text-sm">
                      {content.overview}
                    </p>
                  </div>

                  {/* TV Show Details Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Status</span>
                      </div>
                      <p className="text-white font-semibold">{content.status}</p>
                    </div>

                    {(content as TVShow).number_of_seasons && (
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Film className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="text-gray-400 text-sm font-medium">Seasons</span>
                        </div>
                        <p className="text-white font-semibold">{(content as TVShow).number_of_seasons}</p>
                      </div>
                    )}

                    {(content as TVShow).number_of_episodes && (
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <PlayCircle className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="text-gray-400 text-sm font-medium">Episodes</span>
                        </div>
                        <p className="text-white font-semibold">{(content as TVShow).number_of_episodes}</p>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Language</span>
                      </div>
                      <p className="text-white font-semibold">{content.spoken_languages?.[0]?.english_name || 'English'}</p>
                    </div>
                  </div>
                </section>

                {/* Where to Watch */}
                <section className="bg-gradient-to-br from-netflix-red/10 to-transparent rounded-2xl p-6 border border-netflix-red/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Where to Watch
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="group relative bg-gradient-to-r from-netflix-red/20 to-netflix-red/10 rounded-xl p-4 border border-netflix-red/30 hover:border-netflix-red/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-netflix-red rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Play className="w-6 h-6 fill-current text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white">CineFlix</p>
                          <p className="text-sm text-green-400 font-medium">✓ Available now</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        FREE
                      </div>
                    </div>

                    <div className="group relative bg-gradient-to-r from-blue-600/20 to-blue-600/10 rounded-xl p-4 border border-blue-600/30 hover:border-blue-600/50 transition-all cursor-pointer opacity-75">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white">Netflix</p>
                          <p className="text-sm text-blue-400 font-medium">Subscription</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 3 (Right): Production & Links - Smaller space */}
              <div className="lg:col-span-3 space-y-8">
                {/* Production Companies */}
                {content.production_companies && content.production_companies.length > 0 && (
                  <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Production
                      </h2>
                      <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                        {content.production_companies.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {content.production_companies.slice(0, 4).map((company) => (
                        <div
                          key={company.id}
                          className="group bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-lg p-3 border border-gray-700/30 hover:border-netflix-red/30 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-gray-600/50 transition-colors">
                              {company.logo_path ? (
                                <img
                                  src={getImageUrl(company.logo_path, 'w200')}
                                  alt={company.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <Award className="w-5 h-5 text-netflix-red" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white text-sm group-hover:text-netflix-red transition-colors truncate">
                                {company.name}
                              </h3>
                              <p className="text-xs text-gray-400">{company.origin_country}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Links & Resources */}
                <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Links
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {getSocialMediaLinks().map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                      >
                        <div className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center`}>
                          {link.icon === 'facebook' && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          )}
                          {link.icon === 'instagram' && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                            </svg>
                          )}
                          {link.icon === 'twitter' && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                          )}
                          {link.icon === 'imdb' && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M0 0h24v24H0V0z" fill="none" />
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          )}
                          {link.icon === 'website' && (
                            <Globe className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold group-hover:text-netflix-red transition-colors text-sm">{link.name}</p>
                          <p className="text-xs text-gray-400">
                            {link.icon === 'website' ? 'Visit homepage' : `Follow on ${link.name}`}
                          </p>
                        </div>
                      </a>
                    ))}

                    {getSocialMediaLinks().length === 0 && (
                      <div className="text-center py-6">
                        <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No social media links available</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Full-width sections below the 3-column layout for TV */}
            <div className="space-y-10 mt-10">
              {/* Videos & Trailers for TV */}
              {videos.length > 0 && (
                <section>
                  <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-netflix-red rounded-full"></div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Videos & Trailers</h2>
                      </div>
                      <span className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">{videos.length} videos</span>
                    </div>

                    {/* Horizontal Scrolling Video Grid */}
                    <div className="relative -mx-6 sm:-mx-8 lg:-mx-12">
                      <div className="flex gap-4 overflow-x-auto pb-4 px-6 sm:px-8 lg:px-12 scrollbar-hide">
                        {videos.slice(0, 4).map((video) => (
                          <div
                            key={video.id}
                            className="flex-shrink-0 w-80 group cursor-pointer"
                            onClick={() => handleWatchTrailer(video)}
                          >
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-3">
                              <img
                                src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                                alt={video.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
                                }}
                              />

                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                                </div>
                              </div>

                              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                {video.type === 'Trailer' ? '2:30' : '1:45'}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h3 className="font-semibold text-white group-hover:text-netflix-red transition-colors line-clamp-2 leading-tight">
                                {video.name}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {video.type} • {new Date(video.published_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Cast & Crew for TV */}
              <CastCrewSection
                credits={credits}
                onActorClick={handleCastMemberClick}
                onDownloadClick={downloadActorImage}
              />
              <SimilarContent
                similar={similarContent}
                recommended={recommendedContent}
                title={getTitle()}
                type={type}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Movie Layout: Enhanced 3-column layout matching TV shows */}
      {type === 'movie' && (
        <div className="w-full px-8 pt-8 pb-16">
          {/* Row 1: 3-Column Layout - Optimized for space usage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            {/* Column 1 (Left): Movie Details & Overview - Takes more space */}
            <div className="lg:col-span-5">
              <section className="bg-gradient-to-br from-netflix-red/5 to-transparent rounded-2xl p-8 border border-netflix-red/20">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-netflix-red rounded-full"></div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Movie Details
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg px-4 py-2">
                    <Film className="w-5 h-5 text-netflix-red" />
                    <span className="text-white font-semibold">{getRuntime()}</span>
                    <span className="text-gray-400">• {getReleaseYear()}</span>
                  </div>
                </div>

                {/* Story Description */}
                <div className="bg-black/20 rounded-xl p-6 border border-gray-700/30 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-netflix-red" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Plot Synopsis
                  </h3>
                  <p className="text-gray-200 leading-relaxed text-sm">
                    {content.overview}
                  </p>
                </div>

                {/* Movie Details Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Status</span>
                    </div>
                    <p className="text-white font-semibold">{content.status}</p>
                  </div>

                  {type === 'movie' && (content as Movie).budget && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Budget</span>
                      </div>
                      <p className="text-white font-semibold">${(content as Movie).budget?.toLocaleString()}</p>
                    </div>
                  )}

                  {type === 'movie' && (content as Movie).revenue && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Revenue</span>
                      </div>
                      <p className="text-white font-semibold">${(content as Movie).revenue?.toLocaleString()}</p>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Language</span>
                    </div>
                    <p className="text-white font-semibold">{content.spoken_languages?.[0]?.english_name || 'English'}</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Release Date</span>
                    </div>
                    <p className="text-white font-semibold">{new Date((content as Movie).release_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Column 2 (Center): Where to Watch & Overview - Medium space */}
            <div className="lg:col-span-4 space-y-8">
              {/* Where to Watch */}
              <section className="bg-gradient-to-br from-netflix-red/10 to-transparent rounded-2xl p-6 border border-netflix-red/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Where to Watch
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="group relative bg-gradient-to-r from-netflix-red/20 to-netflix-red/10 rounded-xl p-4 border border-netflix-red/30 hover:border-netflix-red/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-netflix-red rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Play className="w-6 h-6 fill-current text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">CineFlix</p>
                        <p className="text-sm text-green-400 font-medium">✓ Available now</p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      FREE
                    </div>
                  </div>

                  <div className="group relative bg-gradient-to-r from-blue-600/20 to-blue-600/10 rounded-xl p-4 border border-blue-600/30 hover:border-blue-600/50 transition-all cursor-pointer opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <PlayCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">Prime Video</p>
                        <p className="text-sm text-blue-400 font-medium">Rent/Buy</p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      $3.99
                    </div>
                  </div>

                  <div className="group relative bg-gradient-to-r from-purple-600/20 to-purple-600/10 rounded-xl p-4 border border-purple-600/30 hover:border-purple-600/50 transition-all cursor-pointer opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">Disney+</p>
                        <p className="text-sm text-purple-400 font-medium">Subscription</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Movie Stats */}
              <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Movie Stats
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Rating</span>
                    </div>
                    <p className="text-white font-semibold">{formatRating(content.vote_average)}/10</p>
                    <p className="text-gray-400 text-xs">{content.vote_count?.toLocaleString()} votes</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Runtime</span>
                    </div>
                    <p className="text-white font-semibold">{getRuntime()}</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-netflix-red/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-gray-400 text-sm font-medium">Director</span>
                    </div>
                    <p className="text-white font-semibold">{getDirector()}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Column 3 (Right): Production & Links - Smaller space */}
            <div className="lg:col-span-3 space-y-8">
              {/* Production Companies */}
              {content.production_companies && content.production_companies.length > 0 && (
                <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Production
                    </h2>
                    <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                      {content.production_companies.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {content.production_companies.slice(0, 4).map((company) => (
                      <div
                        key={company.id}
                        className="group bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-lg p-3 border border-gray-700/30 hover:border-netflix-red/30 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-gray-600/50 transition-colors">
                            {company.logo_path ? (
                              <img
                                src={getImageUrl(company.logo_path, 'w200')}
                                alt={company.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Award className="w-5 h-5 text-netflix-red" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm group-hover:text-netflix-red transition-colors truncate">
                              {company.name}
                            </h3>
                            <p className="text-xs text-gray-400">{company.origin_country}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Links & Resources */}
              <section className="bg-gradient-to-br from-gray-900/30 to-transparent rounded-2xl p-6 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-netflix-red rounded-full"></div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Links
                  </h2>
                </div>

                <div className="space-y-3">
                  {getSocialMediaLinks().map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                    >
                      <div className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center`}>
                        {link.icon === 'facebook' && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        )}
                        {link.icon === 'instagram' && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                          </svg>
                        )}
                        {link.icon === 'twitter' && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                          </svg>
                        )}
                        {link.icon === 'imdb' && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                        {link.icon === 'website' && (
                          <Globe className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold group-hover:text-netflix-red transition-colors text-sm">{link.name}</p>
                        <p className="text-xs text-gray-400">
                          {link.icon === 'website' ? 'Visit homepage' : `Follow on ${link.name}`}
                        </p>
                      </div>
                    </a>
                  ))}

                  {getSocialMediaLinks().length === 0 && (
                    <div className="text-center py-6">
                      <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No social media links available</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Full-width sections below the 3-column layout for Movies */}
          <div className="space-y-10 mt-10">
            {/* Videos & Trailers for Movies */}
            {videos.length > 0 && (
              <section>
                <div className="max-w-8xl mx-auto px-6 sm:px-8 lg:px-12">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-netflix-red rounded-full"></div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Videos & Trailers</h2>
                    </div>
                    <span className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">{videos.length} videos</span>
                  </div>

                  {/* Horizontal Scrolling Video Grid */}
                  <div className="relative -mx-6 sm:-mx-8 lg:-mx-12">
                    <div className="flex gap-4 overflow-x-auto pb-4 px-6 sm:px-8 lg:px-12 scrollbar-hide">
                      {videos.slice(0, 4).map((video) => (
                        <div
                          key={video.id}
                          className="flex-shrink-0 w-80 group cursor-pointer"
                          onClick={() => handleWatchTrailer(video)}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-3">
                            <img
                              src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                              alt={video.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
                              }}
                            />

                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-8 h-8 text-white fill-current ml-1" />
                              </div>
                            </div>

                            <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                              {video.type === 'Trailer' ? '2:30' : '1:45'}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-semibold text-white group-hover:text-netflix-red transition-colors line-clamp-2 leading-tight">
                              {video.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {video.type} • {new Date(video.published_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Cast & Crew Carousel */}
            <CastCrewSection
              credits={credits}
              onActorClick={handleCastMemberClick}
              onDownloadClick={downloadActorImage}
            />

            <SimilarContent
              similar={similarContent}
              recommended={recommendedContent}
              title={getTitle()}
              type={type}
            />
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeVideoModal}
        >
          <div
            className="relative w-full max-w-4xl bg-[#0A0A1F] rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeVideoModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video Player */}
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                className="w-full h-full"
                allowFullScreen
                title={selectedVideo.name}
                allow="autoplay; encrypted-media"
              />
            </div>

            {/* Video Info */}
            <div className="p-6 bg-gradient-to-t from-[#0A0A1F] to-transparent">
              <h3 className="text-xl font-bold text-white mb-2">{selectedVideo.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="bg-netflix-red/20 text-netflix-red px-2 py-1 rounded">
                  {selectedVideo.type}
                </span>
                <span>{new Date(selectedVideo.published_at).toLocaleDateString()}</span>
                <span>{selectedVideo.official ? 'Official' : 'Fan Made'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cast Member Detail Modal - Redesigned Extended Version */}
      {showCastModal && selectedCastMember && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeCastModal}
        >
          <div
            className="relative w-full max-w-6xl bg-[#0A0A1F] rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeCastModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Section */}
            <div className="bg-gradient-to-r from-netflix-red/20 to-transparent p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Image */}
                <div className="w-full md:w-48 aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  {selectedCastMember.profile_path ? (
                    <img
                      src={getImageUrl(selectedCastMember.profile_path, 'w500')}
                      alt={selectedCastMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Actor Info */}
                <div className="flex-1 space-y-4">
                  {/* Name and Character */}
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedCastMember.name}</h2>
                    <p className="text-xl text-gray-300 mb-3">"{selectedCastMember.character}"</p>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm font-medium">
                        Main Cast
                      </span>
                      {selectedCastMember.order < 5 && (
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                          Lead Role #{selectedCastMember.order + 1}
                        </span>
                      )}
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                        {selectedCastMember.order < 3 ? 'Lead Actor' : selectedCastMember.order < 8 ? 'Supporting Actor' : 'Ensemble Cast'}
                      </span>
                    </div>
                  </div>

                  {/* Actor Details */}
                  {personDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {personDetails.birthday && (
                        <div>
                          <span className="text-gray-400">Born:</span>
                          <p className="text-white font-medium">
                            {new Date(personDetails.birthday).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {personDetails.place_of_birth && (
                            <p className="text-gray-400 text-xs">{personDetails.place_of_birth}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <span className="text-gray-400">Known For:</span>
                        <p className="text-white font-medium">{personDetails?.known_for_department || 'Acting'}</p>
                        <p className="text-gray-400 text-xs">Popularity: {Math.round(personDetails?.popularity || 0)}</p>
                      </div>
                    </div>
                  )}

                  {/* Biography */}
                  {personDetails?.biography && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Biography</h3>
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                        {personDetails.biography}
                      </p>
                    </div>
                  )}

                  {/* Loading State */}
                  {loadingPersonData && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <div className="relative w-5 h-5">
                        <div className="w-5 h-5 netflix-spinner" />
                      </div>
                      <span>Loading actor information...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filmography Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Movies & TV Shows</h3>
                {personFilmography && (
                  <span className="text-gray-400">
                    {personFilmography.cast.length} total credits
                  </span>
                )}
              </div>

              {/* Movies Grid */}
              {personFilmography && personFilmography.cast.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    {personFilmography.cast
                      .sort((a, b) => new Date(b.release_date || '').getTime() - new Date(a.release_date || '').getTime())
                      .slice(0, displayedMoviesCount)
                      .map((movie) => (
                        <div
                          key={movie.id}
                          className="group cursor-pointer"
                          onClick={() => handleMovieClick(movie.id)}
                        >
                          <div className="aspect-[2/3] mb-3 rounded-lg overflow-hidden bg-gray-800">
                            <img
                              src={getPosterUrl(movie.poster_path, 'w300')}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                              }}
                            />
                          </div>
                          <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-netflix-red transition-colors line-clamp-2">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{Math.round(movie.vote_average * 10) / 10}</span>
                            <span>•</span>
                            <span>{new Date(movie.release_date).getFullYear()}</span>
                          </div>
                          {movie.character && (
                            <p className="text-xs text-gray-500 italic truncate">as {movie.character}</p>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Load More Button */}
                  {personFilmography.cast.length > displayedMoviesCount && (
                    <div className="text-center">
                      <button
                        onClick={handleLoadMoreMovies}
                        className="bg-netflix-red hover:bg-netflix-red/80 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Load More Movies ({personFilmography.cast.length - displayedMoviesCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              ) : loadingPersonData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 netflix-spinner-thick" />
                      <div className="h-12 w-12 netflix-ripple" />
                    </div>
                    <p className="text-gray-400 loading-text">Loading filmography...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Film className="w-12 h-12 mx-auto mb-2" />
                    <p>No filmography available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-900/50 p-6 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleMoreInfo}
                  disabled={loadingPersonData}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  View Full Biography
                </button>
                {personDetails?.imdb_id && (
                  <a
                    href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on IMDb
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filmography Modal */}
      {showFilmographyModal && personDetails && personFilmography && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeFilmographyModal}
        >
          <div
            className="relative w-full max-w-6xl bg-netflix-black rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeFilmographyModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-netflix-red/20 to-transparent p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800">
                  {personDetails.profile_path ? (
                    <img
                      src={getImageUrl(personDetails.profile_path, 'w200')}
                      alt={personDetails.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{personDetails.name}</h2>
                  <p className="text-gray-400">Filmography • {personFilmography.cast.length} movies</p>
                </div>
              </div>
            </div>

            {/* Movies Grid */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Movies as Actor</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {personFilmography.cast
                  .sort((a, b) => new Date(b.release_date || '').getTime() - new Date(a.release_date || '').getTime())
                  .slice(0, 20)
                  .map((movie) => (
                    <div
                      key={movie.id}
                      className="group cursor-pointer"
                      onClick={() => handleMovieClick(movie.id)}
                    >
                      <div className="aspect-[2/3] mb-3 rounded-lg overflow-hidden bg-gray-800">
                        <img
                          src={getPosterUrl(movie.poster_path, 'w300')}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                          }}
                        />
                      </div>
                      <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-netflix-red transition-colors line-clamp-2">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{Math.round(movie.vote_average * 10) / 10}</span>
                        <span>•</span>
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                      </div>
                      {movie.character && (
                        <p className="text-xs text-gray-500 italic truncate">as {movie.character}</p>
                      )}
                    </div>
                  ))}
              </div>

              {/* Show All Button */}
              {personFilmography.cast.length > 20 && (
                <div className="text-center mt-8">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors border border-white/20">
                    View All {personFilmography.cast.length} Movies
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actor Details Modal */}
      {showActorDetailsModal && personDetails && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeActorDetailsModal}
        >
          <div
            className="relative w-full max-w-4xl bg-netflix-black rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeActorDetailsModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="flex flex-col md:flex-row">
              {/* Profile Image */}
              <div className="md:w-1/3 aspect-[3/4] md:aspect-auto">
                {personDetails.profile_path ? (
                  <img
                    src={getImageUrl(personDetails.profile_path, 'w500')}
                    alt={personDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <User className="w-24 h-24 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="md:w-2/3 p-6 space-y-6">
                {/* Name and Basic Info */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">{personDetails.name}</h2>

                  {/* Also Known As */}
                  {personDetails.also_known_as.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">Also Known As</h3>
                      <div className="flex flex-wrap gap-2">
                        {personDetails.also_known_as.slice(0, 3).map((name, index) => (
                          <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {personDetails.birthday && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Born</h3>
                      <p className="text-gray-300">
                        {new Date(personDetails.birthday).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {personDetails.place_of_birth && (
                        <p className="text-gray-400 text-sm mt-1">{personDetails.place_of_birth}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Known For</h3>
                    <p className="text-gray-300">{personDetails.known_for_department}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Popularity: {Math.round(personDetails.popularity)}
                    </p>
                  </div>
                </div>

                {/* Biography */}
                {personDetails.biography && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Biography</h3>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                      {personDetails.biography.split('\n\n').slice(0, 3).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Links */}
                <div className="flex gap-3 pt-4">
                  {personDetails.imdb_id && (
                    <a
                      href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      IMDb
                    </a>
                  )}
                  {personDetails.homepage && (
                    <a
                      href={personDetails.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPage;