import LogoLoop from '../LogoLoop/LogoLoop';
import type { Key, ReactNode } from 'react';

/* ── Platform logo data using public/PlatformsIcons ── */

interface PlatformLogo {
  src: string;
  alt: string;
}

const platformLogos: PlatformLogo[] = [
  { src: '/PlatformsIcons/Netflix Logo.png', alt: 'Netflix' },
  { src: '/PlatformsIcons/Disney+ Logo.png', alt: 'Disney+' },
  { src: '/PlatformsIcons/Amazon Prime Video Logo.png', alt: 'Amazon Prime Video' },
  { src: '/PlatformsIcons/HBO Max Logo.png', alt: 'HBO Max' },
  { src: '/PlatformsIcons/Apple TV Plus Logo.png', alt: 'Apple TV+' },
  { src: '/PlatformsIcons/Hulu Logo.png', alt: 'Hulu' },
  { src: '/PlatformsIcons/Paramount Plus Logo.png', alt: 'Paramount+' },
  { src: '/PlatformsIcons/YouTube TV Logo.png', alt: 'YouTube TV' },
  { src: '/PlatformsIcons/Tubi Logo.png', alt: 'Tubi' },
  { src: '/PlatformsIcons/Peacock Logo.png', alt: 'Peacock' },
  { src: '/PlatformsIcons/Crunchyroll.png', alt: 'Crunchyroll' },
  { src: '/PlatformsIcons/ESPN+ Logo.png', alt: 'ESPN+' },
  { src: '/PlatformsIcons/BBC iPlayer Logo.png', alt: 'BBC iPlayer' },
  { src: '/PlatformsIcons/Pluto TV Logo.png', alt: 'Pluto TV' },
  { src: '/PlatformsIcons/Curiosity Stream Logo.png', alt: 'Curiosity Stream' },
  { src: '/PlatformsIcons/Sky Logo.png', alt: 'Sky' },
  { src: '/PlatformsIcons/TOD.png', alt: 'TOD' },
];

/**
 * Custom render function for each logo item.
 * Displays logos in monochrome (white) by default, and reveals
 * real colors on hover via CSS filter transition.
 */
const renderPlatformItem = (item: unknown, key: Key): ReactNode => {
  const logo = item as PlatformLogo;
  return (
    <div key={key} className="platform-logo-card" title={logo.alt}>
      <img
        src={logo.src}
        alt={logo.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="platform-logo-img"
      />
    </div>
  );
};

/**
 * "All Your Favorite Platforms In One Place" section.
 * Infinite scrolling logo loop with monochrome-to-color hover effect.
 * Designed to be placed at the bottom of the page, before the footer.
 */
const PlatformsSection = (): JSX.Element => {
  return (
    <section
      className="relative w-full py-10 sm:py-14 md:py-16 overflow-hidden"
      aria-label="Supported streaming platforms"
    >
      {/* Section heading */}
      <div className="text-center mb-8 sm:mb-10 px-4">
        {/* STREAMING label with decorative lines */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[11px] sm:text-xs tracking-[0.25em] uppercase text-white/30 font-medium">
            Streaming
          </span>
          <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-white/20" />
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white/50 tracking-wide">
          All Your Favorite Platforms In One Place
        </h2>
      </div>

      {/* Logo loop container */}
      <div className="relative h-[80px] sm:h-[95px] md:h-[110px]">
        <LogoLoop
          logos={platformLogos}
          speed={60}
          direction="left"
          logoHeight={55}
          gap={50}
          hoverSpeed={15}
          fadeOut
          fadeOutColor="#09091c"
          ariaLabel="Streaming platform logos"
          renderItem={renderPlatformItem}
        />
      </div>
    </section>
  );
};

export default PlatformsSection;
