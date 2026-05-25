import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { Movie, TVShow, CastMember, PersonDetails, PersonMovieCredits } from '../types';
import {
  getPersonDetails,
  getPersonMovieCredits,
} from '../services/tmdb';
import { useDetailPageData } from '../hooks/useDetailPageData';
import { logger } from '../utils/logger';

import DetailHero from '../components/DetailPage/DetailHero';
import OverviewSection from '../components/DetailPage/OverviewSection';
import MetadataGrid from '../components/DetailPage/MetadataGrid';
import WhereToWatchSection from '../components/DetailPage/WhereToWatchSection';
import ProductionCompaniesSection from '../components/DetailPage/ProductionCompaniesSection';
import ExternalLinksSection from '../components/DetailPage/ExternalLinksSection';
import SeasonsEpisodesSection from '../components/DetailPage/SeasonsEpisodesSection';
import VideoTrailersSection from '../components/DetailPage/VideoTrailersSection';
import CastCrewSection from '../components/DetailPage/CastCrewSection';
import CastMemberModal from '../components/DetailPage/CastMemberModal';
import ActorDetailsModal from '../components/DetailPage/ActorDetailsModal';
import SectionHeader from '../components/DetailPage/SectionHeader';
import SimilarContent from '../components/WatchPage/SimilarContent';
import LoadingScreen from '../components/feedback/LoadingScreen';
import ErrorState from '../components/feedback/ErrorState';

interface DetailPageProps {
  type: 'movie' | 'tv';
}

/**
 * The main detail page for movies and TV shows. Composes a cinematic hero,
 * a metadata-rich content grid, and a number of feature sections (cast,
 * trailers, episodes, similar titles) along with a suite of person modals.
 */
const DetailPage: React.FC<DetailPageProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const { data, setSelectedSeason } = useDetailPageData(id, type);
  const {
    content,
    videos,
    credits,
    similar,
    recommended,
    externalIds,
    seasons,
    selectedSeason,
    selectedSeasonDetails,
    loading,
    loadingSeasons,
    error,
  } = data;

  // ─── Cast / Person Modal State ──────────────────────────────────────────
  const [selectedCastMember, setSelectedCastMember] = useState<CastMember | null>(null);
  const [showCastModal, setShowCastModal] = useState(false);
  const [showActorDetailsModal, setShowActorDetailsModal] = useState(false);
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [personFilmography, setPersonFilmography] = useState<PersonMovieCredits | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);
  const [displayedMoviesCount, setDisplayedMoviesCount] = useState(6);

  // ─── Scroll restoration ─────────────────────────────────────────────────
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

  // ─── Person data fetching ───────────────────────────────────────────────
  const fetchPersonData = useCallback(async (personId: number) => {
    try {
      setLoadingPerson(true);
      const [details, filmography] = await Promise.all([
        getPersonDetails(personId),
        getPersonMovieCredits(personId),
      ]);
      setPersonDetails(details);
      setPersonFilmography(filmography);
    } catch (err) {
      logger.error('Error fetching person data:', err);
    } finally {
      setLoadingPerson(false);
    }
  }, []);

  const handleCastMemberClick = useCallback(async (castMember: CastMember) => {
    setSelectedCastMember(castMember);
    setShowCastModal(true);
    setDisplayedMoviesCount(6);
    await fetchPersonData(castMember.id);
  }, [fetchPersonData]);

  const closeCastModal = useCallback(() => {
    setShowCastModal(false);
    setSelectedCastMember(null);
    setPersonDetails(null);
    setPersonFilmography(null);
    setDisplayedMoviesCount(6);
  }, []);

  const closeActorDetailsModal = useCallback(() => {
    setShowActorDetailsModal(false);
    setPersonDetails(null);
    setPersonFilmography(null);
  }, []);

  const handleMoreInfo = useCallback(async () => {
    if (!selectedCastMember) return;
    if (!personDetails) {
      await fetchPersonData(selectedCastMember.id);
    }
    setShowCastModal(false);
    setShowActorDetailsModal(true);
  }, [selectedCastMember, personDetails, fetchPersonData]);

  // ─── Image download helper ──────────────────────────────────────────────
  const downloadActorImage = useCallback(async (imageUrl: string, actorName: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${actorName.replace(/[/\\?%*:|"<>]/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      // Delay revocation to prevent race conditions on slow browsers
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      logger.error('Error downloading image:', err);
    }
  }, []);

  // ─── Computed helpers ───────────────────────────────────────────────────
  const title = useMemo((): string => {
    if (!content) return '';
    return type === 'movie' ? (content as Movie).title : (content as TVShow).name;
  }, [content, type]);

  const runtime = useMemo((): string => {
    if (!content) return '';
    if (type === 'movie') {
      const runtimeVal = (content as Movie).runtime;
      if (!runtimeVal) return '';
      const hours = Math.floor(runtimeVal / 60);
      const minutes = runtimeVal % 60;
      return `${hours}h ${minutes}m`;
    }
    const runtimeVal = (content as TVShow).episode_run_time?.[0];
    return runtimeVal ? `${runtimeVal} min/ep` : '';
  }, [content, type]);

  const director = useMemo((): string => {
    if (!credits) return 'Unknown';
    if (type === 'movie') {
      const dir = credits.crew.find(member => member.job === 'Director');
      return dir ? dir.name : 'Unknown';
    }
    const creator = credits.crew.find(member =>
      member.job === 'Creator' ||
      member.job === 'Executive Producer' ||
      member.job === 'Director',
    );
    return creator ? creator.name : 'Unknown';
  }, [credits, type]);

  // ─── Render Guards ──────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen message="Loading title..." subMessage="Fetching cast, trailers and more" />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0A1F] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorState
            inline
            title="Failed to load content"
            message={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="min-h-screen bg-[#0A0A1F] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorState
            inline
            title="Content not found"
            message="The title you're looking for couldn't be located. It may have been removed or the link is incorrect."
          />
          <div className="flex justify-center mt-6">
            <Link
              to="/"
              key="return-home"
              id="return-to-home-link"
              className="inline-block bg-netflix-red hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A1F] text-white">
      {/* ═══════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════ */}
      <DetailHero content={content} type={type} credits={credits} />

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT GRID
          ═══════════════════════════════════════════════ */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-16 space-y-12 sm:space-y-16">

        {/* TV-only Seasons & Episodes (full width, top priority) */}
        {type === 'tv' && seasons.length > 0 && (
          <SeasonsEpisodesSection
            seasons={seasons}
            selectedSeason={selectedSeason}
            selectedSeasonDetails={selectedSeasonDetails}
            loading={loadingSeasons}
            onSeasonChange={setSelectedSeason}
            seriesId={id}
          />
        )}

        {/* About / Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            <section>
              <SectionHeader
                eyebrow="About this title"
                icon={ScrollText}
                title={type === 'movie' ? 'Movie Details' : 'Show Details'}
              />
              <div className="space-y-6">
                <OverviewSection
                  overview={content.overview}
                  tagline={content.tagline}
                />
                <MetadataGrid
                  content={content}
                  type={type}
                  director={director}
                  runtime={runtime}
                  columns={2}
                />
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            <WhereToWatchSection contentId={content.id} type={type} />
            {content.production_companies && content.production_companies.length > 0 && (
              <ProductionCompaniesSection companies={content.production_companies} />
            )}
            <ExternalLinksSection externalIds={externalIds} homepage={content.homepage} />
          </aside>
        </div>

        {/* Videos & Trailers */}
        <VideoTrailersSection videos={videos} />

        {/* Cast & Crew */}
        <CastCrewSection
          credits={credits}
          onActorClick={handleCastMemberClick}
          onDownloadClick={downloadActorImage}
        />

        {/* Similar / Recommended */}
        <SimilarContent
          similar={similar}
          recommended={recommended}
          title={title}
          type={type}
        />
      </div>

      {/* ═══════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════ */}
      <CastMemberModal
        open={showCastModal}
        member={selectedCastMember}
        personDetails={personDetails}
        filmography={personFilmography}
        displayedMoviesCount={displayedMoviesCount}
        loading={loadingPerson}
        onClose={closeCastModal}
        onLoadMore={() => setDisplayedMoviesCount((c) => c + 6)}
        onMoreInfo={handleMoreInfo}
        onDownloadImage={downloadActorImage}
      />

      <ActorDetailsModal
        open={showActorDetailsModal}
        personDetails={personDetails}
        onClose={closeActorDetailsModal}
      />
    </main>
  );
};

export default DetailPage;
