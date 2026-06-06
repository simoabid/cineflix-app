import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import { BrandPill } from "@/components/layout/BrandPill";
import { Player } from "@/components/player";
import { SkipSegmentButton } from "@/components/player/atoms/SkipSegmentButton";
import { ThumbsFeedback } from "@/components/player/atoms/ThumbsFeedback";
import { WatchPartyStatus } from "@/components/player/atoms/WatchPartyStatus";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import {
  type SegmentData,
  useSkipTime,
} from "@/components/player/hooks/useSkipTime";
import { PauseOverlay } from "@/components/player/overlays/PauseOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { type PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useWatchPartyStore } from "@/stores/watchParty";

export interface PStreamPlayerProps {
  children?: ReactNode;
  backUrl?: string;
  onBack?: () => void;
  onLoad?: () => void;
  onMetaChange?: (meta: PlayerMeta) => void;
}

export function PStreamPlayer(props: PStreamPlayerProps) {
  const { showTargets, showTouchTargets } = useShouldShowControls();
  const status = usePlayerStore((s) => s.status);
  const displayMode = usePlayerStore((s) => s.displayMode);
  const iframeSource = usePlayerStore((s) => s.iframeSource);
  const switchToNative = usePlayerStore((s) => s.switchToNative);
  const sourceOrigin = usePlayerStore((s) => s.sourceOrigin);
  const cineproProviderName = usePlayerStore((s) => s.cineproProviderName);
  const { isMobile } = useIsMobile();
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );
  const isLoading = usePlayerStore((s) => s.mediaPlaying.isLoading);
  const { isHost, enabled } = useWatchPartyStore();
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);

  const inControl = !enabled || isHost;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;

  const [isShifting, setIsShifting] = useState(false);
  const [isHoldingFullscreen, setIsHoldingFullscreen] = useState(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShifting(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShifting(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  const handleTouchStart = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(true);
    }, 100);
  };

  const handleTouchEnd = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(false);
    }, 1000);
  };

  const [thumbsFeedbackData, setThumbsFeedbackData] = useState<{
    segment: SegmentData;
    skipTime: number;
  } | null>(null);

  const segments = useSkipTime();

  const handleSkipTriggered = useCallback(
    (segment: SegmentData, skipTime: number) => {
      setThumbsFeedbackData({ segment, skipTime });
    },
    [],
  );

  const handleThumbsFeedback = useCallback(() => {
    setThumbsFeedbackData(null);
  }, []);

  return (
    <Player.Container onLoad={props.onLoad} showingControls={displayMode === "native" ? showTargets : false}>
      {props.children}
      {displayMode === "native" && <PauseOverlay />}
      <Player.BlackOverlay
        show={showTargets && status === playerStatus.PLAYING && displayMode === "native"}
      />
      <Player.EpisodesRouter onChange={props.onMetaChange} />
      <Player.SettingsRouter />
      {displayMode === "native" && <Player.SubtitleView controlsShown={showTargets} />}

      {displayMode === "iframe" && (
        <div className="absolute top-4 left-4 z-[60] flex items-center space-x-3 pointer-events-auto">
          <button
            onClick={props.onBack}
            className="flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-md w-10 h-10 rounded-full border border-white/10 hover:border-white/30 text-white transition-all shadow-lg active:scale-95"
            aria-label="Close player"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-gray-300">
            Classic: {iframeSource?.name || "External"}
          </span>
          <button
            onClick={() => switchToNative()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#e50914] hover:bg-red-700 text-white transition-all shadow-lg active:scale-95 border border-red-500/10"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Smart Scraper</span>
          </button>
        </div>
      )}

      {status === playerStatus.PLAYING && displayMode === "native" ? (
        <Player.CenterControls>
          <Player.LoadingSpinner />
          <Player.AutoPlayStart />
          <Player.CastingNotification />
        </Player.CenterControls>
      ) : null}

      {displayMode === "native" && (
        <Player.CenterMobileControls
          className="text-white"
          show={showTouchTargets && status === playerStatus.PLAYING}
        >
          <Player.SkipBackward iconSizeClass="text-3xl" inControl={inControl} />
          <Player.Pause
            iconSizeClass="text-5xl"
            className={isLoading ? "opacity-0" : "opacity-100"}
          />
          <Player.SkipForward iconSizeClass="text-3xl" inControl={inControl} />
        </Player.CenterMobileControls>
      )}

      {displayMode === "native" && (
        <div
          className={`absolute right-4 z-50 transition-all duration-300 ease-in-out ${
            showTargets ? "top-16" : "top-1"
          }`}
        >
          <WatchPartyStatus />
        </div>
      )}

      <Player.TopControls show={showTargets && displayMode === "native"}>
        <div className="grid grid-cols-[1fr,auto] xl:grid-cols-3 items-center">
          <div className="flex space-x-3 items-center">
            <Player.BackLink
              url={props.backUrl ?? "/"}
              onBack={props.onBack}
            />
            <span className="text mx-3 text-type-secondary">/</span>
            <Player.Title />

            {isMobile && meta?.type === "show" && (
              <span className="text-type-secondary text-sm whitespace-nowrap flex-shrink-0">
                {t("media.episodeDisplay", {
                  season: meta?.season?.number,
                  episode: meta?.episode?.number,
                })}
              </span>
            )}

            {sourceOrigin === "cinepro" && cineproProviderName && (
              <span className="ml-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                CinePro: {cineproProviderName}
              </span>
            )}

            <Player.InfoButton />
            <Player.BookmarkButton />
          </div>
          <div className="text-center hidden xl:flex justify-center items-center">
            <Player.EpisodeTitle />
          </div>
          <div className="hidden lg:flex items-center justify-end">
            <BrandPill />
          </div>
          <div className="flex lg:hidden items-center justify-end">
            {status === playerStatus.PLAYING ? (
              <>
                <Player.Airplay />
                <Player.Chromecast />
              </>
            ) : null}
          </div>
        </div>
      </Player.TopControls>

      <Player.BottomControls show={showTargets && displayMode === "native"}>
        {status !== playerStatus.PLAYING && !manualSourceSelection && displayMode === "native" ? (
          <div className="text-type-secondary text-center text-sm font-semibold">
            {t("player.scraping.items.pending")}
          </div>
        ) : null}
        <div className="flex items-center justify-center space-x-3 h-full">
          {status === playerStatus.PLAYING && displayMode === "native" ? (
            <>
              {isMobile ? <Player.Time short /> : null}
              <Player.ProgressBar />
            </>
          ) : null}
        </div>
        <div className="hidden lg:flex justify-between" dir="ltr">
          <Player.LeftSideControls>
            {displayMode === "iframe" ? (
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 text-xs font-semibold rounded-md bg-purple-600/30 text-purple-400 border border-purple-500/20 backdrop-blur whitespace-nowrap">
                  Classic: {iframeSource?.name || "External"}
                </span>
                <button
                  onClick={() => switchToNative()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#e50914] hover:bg-red-700 text-white transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Smart Scraper</span>
                </button>
              </div>
            ) : (
              status === playerStatus.PLAYING ? (
                <>
                  <Player.Pause />
                  <Player.SkipBackward inControl={inControl} />
                  <Player.SkipForward inControl={inControl} />
                  <Player.Volume />
                  <Player.Time />
                </>
              ) : null
            )}
          </Player.LeftSideControls>
          <div className="flex items-center space-x-3">
            <Player.Episodes inControl={inControl} />
            {displayMode === "native" && (
              <Player.SkipEpisodeButton
                inControl={inControl}
                onChange={props.onMetaChange}
              />
            )}
            {status === playerStatus.PLAYING && displayMode === "native" ? (
              <>
                <Player.Pip />
                <Player.Airplay />
                <Player.Chromecast />
              </>
            ) : null}
            {(status === playerStatus.PLAYBACK_ERROR ||
            status === playerStatus.PLAYING) && displayMode === "native" ? (
              <Player.Captions />
            ) : null}
            <Player.Settings />
            {isShifting || isHoldingFullscreen ? (
              <Player.Widescreen />
            ) : (
              <Player.Fullscreen />
            )}
          </div>
        </div>
        <div className="grid grid-cols-[2.5rem,1fr,2.5rem] gap-3 lg:hidden">
          <div />
          <div className="flex justify-center space-x-3">
            {!(isPWA && isIOS) && status === playerStatus.PLAYING && displayMode === "native" && (
              <Player.Pip />
            )}
            <Player.Episodes inControl={inControl} />
            {status === playerStatus.PLAYING && displayMode === "native" ? (
              <div className="hidden ssm:block">
                <Player.Captions />
              </div>
            ) : null}
            {displayMode === "iframe" && (
              <button
                onClick={() => switchToNative()}
                className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-[#e50914] text-white hover:bg-red-700 active:scale-95 transition-all"
              >
                <span>Scraper</span>
              </button>
            )}
            <Player.Settings />
          </div>
          <div>
            {(status === playerStatus.PLAYING || displayMode === "iframe") && (
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="select-none touch-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {isHoldingFullscreen ? (
                  <Player.Widescreen />
                ) : (
                  <Player.Fullscreen />
                )}
              </div>
            )}
          </div>
        </div>
      </Player.BottomControls>

      <Player.VolumeChangedPopout />
      <Player.SubtitleDelayPopout />
      <Player.SpeedChangedPopout />
      <Player.TIDBSubmissionSuccessPopout />
      <Player.UnreleasedEpisodeOverlay />

      <Player.NextEpisodeButton
        controlsShowing={showTargets}
        onChange={props.onMetaChange}
        inControl={inControl}
      />

      <SkipSegmentButton
        controlsShowing={showTargets}
        segments={segments}
        inControl={inControl}
        onChangeMeta={props.onMetaChange}
        onSkipTriggered={handleSkipTriggered}
      />

      <ThumbsFeedback
        controlsShowing={showTargets}
        feedbackData={thumbsFeedbackData}
        onAction={handleThumbsFeedback}
      />
    </Player.Container>
  );
}
