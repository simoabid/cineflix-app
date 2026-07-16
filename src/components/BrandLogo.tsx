import classNames from "classnames";

type BrandLogoProps = {
  /** Tailwind size classes, e.g. `h-8 sm:h-10`. Width follows logo aspect ratio. */
  className?: string;
  title?: string;
};

/**
 * Themeable CINEFLIX wordmark.
 *
 * Uses the solid-red PNG as a CSS mask so the painted color is `currentColor`
 * (defaults to `text-type-logo` from the active theme). This recolors correctly
 * across themes — unlike a PNG-in-SVG converter export, which embeds a bitmap
 * and cannot change fill.
 *
 * Logo asset: `public/cineflix-logo.png` (monochrome red on transparent).
 */
export function BrandLogo({
  className,
  title = "CINEFLIX",
}: BrandLogoProps) {
  const logoUrl = `${import.meta.env.BASE_URL}cineflix-logo.png`;

  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={classNames(
        "inline-block shrink-0 align-middle bg-current text-type-logo",
        "aspect-[1123/317]",
        className,
      )}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
      }}
    />
  );
}

export default BrandLogo;
