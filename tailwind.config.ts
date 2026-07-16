import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindScrollbar from "tailwind-scrollbar";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const themer = require("tailwindcss-themer");

import { allThemes, defaultTheme, safeThemeList } from "./themes";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: safeThemeList,
  theme: {
    extend: {
      screens: {
        xs: "350px",
        ssm: "400px",
        laptop: "1536px",
        "2xl": "1921px",
        "3xl": "2650px",
        "4xl": "3840px",
      },
      // Temporary bridge colors during migration — remove once no netflix/brand/surface/glass refs remain
      colors: {
        netflix: {
          black: "#141414",
          red: "#E50914",
          dark: "#221F1F",
          darker: "#111",
          light: "#564D4D",
          gray: "#808080",
          lightgray: "#B3B3B3",
          "dark-purple": "#0f0e14",
          "purple-blue": "#181524",
          "deep-blue": "#0d1117",
        },
        brand: {
          red: "#E50914",
          "red-hover": "#C7000C",
          "red-light": "#ff1a1a",
          "red-glow": "rgba(229, 9, 20, 0.4)",
        },
        glass: {
          background: "rgba(19, 19, 43, 0.7)",
          "background-dark": "rgba(10, 10, 31, 0.85)",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.12)",
        },
        surface: {
          background: "#0A0A1F",
          card: "#13132B",
          accent: "#1F1F35",
          elevated: "#252540",
        },
      },
      backdropBlur: {
        xs: "2px",
        md: "12px",
        xl: "24px",
        "2xl": "40px",
      },
      fontFamily: {
        netflix: ["Netflix Sans", "Helvetica Neue", "Arial", "sans-serif"],
        main: ["'DM Sans'", "Helvetica Neue", "Arial", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "fade-in-up": "fadeInUp 0.8s ease-out",
        "stagger-fade": "staggerFade 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        staggerFade: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [
    tailwindScrollbar,
    themer({
      defaultTheme,
      themes: [
        {
          name: "default",
          selectors: [".theme-default"],
          ...defaultTheme,
        },
        ...allThemes,
      ],
    }),
    plugin(({ addUtilities, addVariant }) => {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
      addVariant("dir-neutral", "[dir] &");
    }),
  ],
};

export default config;
