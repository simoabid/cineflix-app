import { allThemes } from "./all";

export { defaultTheme } from "./default";
export { allThemes } from "./all";

/** Class names like "theme-blue" without the leading dot — used for Tailwind safelist. */
export const safeThemeList = [
  "theme-default",
  ...allThemes
    .flatMap((v) => v.selectors)
    .filter((v) => v.startsWith("."))
    .map((v) => v.slice(1)),
];
