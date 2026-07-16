import { Link, useLocation } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import {
  selectShouldShowSupportBanner,
  useSupportStore,
} from '../stores/support';
import {
  SUPPORT_CTA_LABEL,
  SUPPORT_MESSAGE,
  SUPPORT_URL,
} from '../setup/constants';

/**
 * Soft, non-blocking support prompt.
 * Hidden on /watch and auth pages; dismissible for ~1 week (see support store).
 */
export function SupportBanner(): JSX.Element | null {
  const { pathname } = useLocation();
  const dismissSupportBanner = useSupportStore((s) => s.dismissSupportBanner);
  const show = useSupportStore((s) => selectShouldShowSupportBanner(s, pathname));

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Support CINEFLIX"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-4"
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-start gap-3 rounded-xl border border-white/10 bg-background-secondary/95 px-4 py-3 shadow-2xl backdrop-blur-md sm:items-center sm:gap-4 sm:px-5 sm:py-3.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-buttons-purple/20 sm:mt-0">
          <Heart className="h-4 w-4 text-type-logo" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-type-secondary sm:text-[0.9375rem]">
            {SUPPORT_MESSAGE}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-buttons-purple px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-buttons-purpleHover"
            >
              {SUPPORT_CTA_LABEL}
            </a>
            <Link
              to="/support"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-type-secondary transition-colors hover:text-type-emphasis"
            >
              Learn more
            </Link>
            <Link
              to="/account#support"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-type-dimmed transition-colors hover:text-type-secondary"
            >
              Ad preferences
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dismissSupportBanner()}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-type-dimmed transition-colors hover:bg-white/5 hover:text-type-emphasis"
          aria-label="Dismiss support message for a week"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default SupportBanner;
