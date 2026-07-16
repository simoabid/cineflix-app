/**
 * CINEFLIX brand default theme.
 *
 * Absolute default for all users (including brand-new):
 * - Accent / logos / CTAs: Netflix red (#E50914 family)
 * - Surfaces: original dark-blue palette (#0A0A1F / #13132B / #1F1F35)
 *
 * Note: token keys like `buttons.purple` are slot names from the p-stream
 * theme system — values here are brand red, not purple.
 */

const tokens = {
  white: "#FFFFFF",
  black: {
    c50: "#000000",
    c75: "#050510",
    c80: "#020205",
    c100: "#0A0A1F",
    c125: "#0f0f28",
    c150: "#13132B",
    c200: "#1a1a35",
    c250: "#252540",
  },
  brand: {
    red: "#E50914",
    redHover: "#C7000C",
    redLight: "#ff1a1a",
    redSoft: "#fe8385",
    redMuted: "#ea5b5e",
    redDeep: "#8B0000",
  },
  surface: {
    bg: "#0A0A1F",
    card: "#13132B",
    accent: "#1F1F35",
    elevated: "#252540",
    deep: "#0d1117",
  },
  semantic: {
    red: {
      c100: "#F46E6E",
      c200: "#E44F4F",
      c300: "#D74747",
      c400: "#B43434",
    },
    green: {
      c100: "#60D26A",
      c200: "#40B44B",
      c300: "#31A33C",
      c400: "#237A2B",
    },
    silver: {
      c100: "#DEDEDE",
      c200: "#B6CAD7",
      c300: "#8EA3B0",
      c400: "#617A8A",
    },
    yellow: {
      c100: "#FFF599",
      c200: "#FCEC61",
      c300: "#D8C947",
      c400: "#AFA349",
    },
    rose: {
      c100: "#DB3D61",
      c200: "#8A293B",
      c300: "#812435",
      c400: "#701B2B",
    },
  },
  // Cool blue-grays for secondary UI chrome (matches original dark-blue UI)
  blue: {
    c50: "#c8cbe0",
    c100: "#9aa0c4",
    c200: "#7a82b0",
    c300: "#5a6396",
    c400: "#454d7a",
    c500: "#353b5f",
    c600: "#2a2f4d",
    c700: "#21253d",
    c800: "#181b2e",
    c900: "#0f111f",
  },
  // Accent slot — CINEFLIX red scale (fills "purple" token keys)
  purple: {
    c50: "#ffb3b3",
    c100: "#ff6b6b",
    c200: "#ff1a1a",
    c300: "#E50914",
    c400: "#C7000C",
    c500: "#a00810",
    c600: "#7a0610",
    c700: "#5c050e",
    c800: "#3d040a",
    c900: "#240206",
  },
  ash: {
    c50: "#9a9ab0",
    c100: "#7a7a94",
    c200: "#5e5e78",
    c300: "#45455c",
    c400: "#36364a",
    c500: "#2c2c3e",
    c600: "#242436",
    c700: "#1c1c2c",
    c800: "#161624",
    c900: "#10101a",
  },
  shade: {
    c25: "#a0a0b8",
    c50: "#8a8aa0",
    c100: "#6e6e88",
    c200: "#55556e",
    c300: "#42425a",
    c400: "#35354a",
    c500: "#2a2a40",
    c600: "#222238",
    c700: "#1a1a30",
    c800: "#13132B",
    c900: "#0A0A1F",
  },
};

export const defaultTheme = {
  extend: {
    colors: {
      themePreview: {
        primary: tokens.brand.red,
        secondary: tokens.surface.card,
        ghost: tokens.white,
      },

      pill: {
        background: tokens.surface.card,
        backgroundHover: tokens.surface.accent,
        highlight: tokens.brand.red,
        activeBackground: tokens.shade.c700,
      },

      global: {
        accentA: tokens.brand.red,
        accentB: tokens.brand.redHover,
      },

      lightBar: {
        light: tokens.purple.c700,
      },

      buttons: {
        toggle: tokens.brand.red,
        toggleDisabled: tokens.black.c200,
        danger: tokens.semantic.rose.c300,
        dangerHover: tokens.semantic.rose.c200,

        secondary: tokens.surface.card,
        secondaryText: tokens.semantic.silver.c300,
        secondaryHover: tokens.surface.accent,
        primary: tokens.white,
        primaryText: tokens.black.c50,
        primaryHover: tokens.semantic.silver.c100,
        // Brand CTA slot (name is historical; value is CINEFLIX red)
        purple: tokens.brand.red,
        purpleHover: tokens.brand.redHover,
        cancel: tokens.surface.card,
        cancelHover: tokens.surface.accent,
      },

      background: {
        main: tokens.surface.bg,
        secondary: tokens.surface.card,
        secondaryHover: tokens.surface.accent,
        accentA: tokens.brand.redDeep,
        accentB: tokens.surface.elevated,
      },

      modal: {
        background: tokens.surface.card,
      },

      type: {
        logo: tokens.brand.red,
        emphasis: tokens.white,
        text: tokens.shade.c50,
        dimmed: tokens.shade.c50,
        divider: tokens.ash.c500,
        secondary: tokens.ash.c100,
        danger: tokens.semantic.red.c100,
        success: tokens.semantic.green.c100,
        link: tokens.brand.redLight,
        linkHover: tokens.brand.redSoft,
      },

      search: {
        background: tokens.surface.card,
        hoverBackground: tokens.surface.accent,
        focused: tokens.surface.elevated,
        placeholder: tokens.shade.c200,
        icon: tokens.shade.c100,
        text: tokens.white,
      },

      mediaCard: {
        hoverBackground: tokens.surface.accent,
        hoverAccent: tokens.surface.elevated,
        hoverShadow: tokens.black.c50,
        shadow: tokens.shade.c800,
        barColor: tokens.ash.c200,
        barFillColor: tokens.brand.red,
        badge: tokens.shade.c700,
        badgeText: tokens.ash.c100,
      },

      largeCard: {
        background: tokens.surface.card,
        icon: tokens.brand.red,
      },

      dropdown: {
        background: tokens.surface.card,
        altBackground: tokens.surface.bg,
        hoverBackground: tokens.surface.accent,
        highlight: tokens.semantic.yellow.c400,
        highlightHover: tokens.semantic.yellow.c200,
        text: tokens.shade.c50,
        secondary: tokens.shade.c100,
        border: tokens.ash.c400,
        contentBackground: tokens.black.c80,
      },

      authentication: {
        border: tokens.ash.c300,
        inputBg: tokens.surface.card,
        inputBgHover: tokens.surface.accent,
        wordBackground: tokens.shade.c500,
        copyText: tokens.shade.c100,
        copyTextHover: tokens.ash.c50,
        errorText: tokens.semantic.rose.c100,
      },

      settings: {
        sidebar: {
          activeLink: tokens.surface.card,
          badge: tokens.shade.c900,
          type: {
            secondary: tokens.shade.c200,
            inactive: tokens.shade.c50,
            icon: tokens.black.c200,
            iconActivated: tokens.brand.red,
            activated: tokens.brand.redLight,
          },
        },
        card: {
          border: tokens.ash.c500,
          background: tokens.surface.card,
          altBackground: tokens.surface.accent,
        },
        saveBar: {
          background: tokens.black.c80,
        },
      },

      utils: {
        divider: tokens.ash.c300,
      },

      onboarding: {
        bar: tokens.shade.c400,
        barFilled: tokens.brand.red,
        divider: tokens.shade.c200,
        card: tokens.shade.c800,
        cardHover: tokens.shade.c700,
        border: tokens.shade.c600,
        good: tokens.brand.redLight,
        best: tokens.semantic.yellow.c100,
        link: tokens.brand.red,
      },

      errors: {
        card: tokens.surface.bg,
        border: tokens.ash.c500,
        type: {
          secondary: tokens.ash.c100,
        },
      },

      about: {
        circle: tokens.surface.card,
        circleText: tokens.ash.c50,
      },

      editBadge: {
        bg: tokens.ash.c500,
        bgHover: tokens.ash.c400,
        text: tokens.ash.c50,
      },

      progress: {
        background: tokens.ash.c400,
        preloaded: tokens.ash.c300,
        filled: tokens.brand.red,
      },

      video: {
        buttonBackground: tokens.ash.c600,
        autoPlay: {
          background: tokens.ash.c800,
          hover: tokens.ash.c600,
        },
        scraping: {
          card: tokens.black.c80,
          error: tokens.semantic.red.c200,
          success: tokens.semantic.green.c200,
          loading: tokens.brand.red,
          noresult: tokens.black.c200,
        },
        audio: {
          set: tokens.brand.red,
        },
        context: {
          background: tokens.black.c80,
          light: tokens.shade.c50,
          border: tokens.ash.c600,
          hoverColor: tokens.ash.c600,
          buttonFocus: tokens.ash.c500,
          flagBg: tokens.ash.c500,
          inputBg: tokens.surface.card,
          buttonOverInputHover: tokens.ash.c500,
          inputPlaceholder: tokens.ash.c200,
          cardBorder: tokens.ash.c700,
          slider: tokens.black.c200,
          sliderFilled: tokens.brand.red,
          error: tokens.semantic.red.c200,
          buttons: {
            list: tokens.ash.c700,
            active: tokens.ash.c900,
          },
          closeHover: tokens.ash.c800,
          type: {
            main: tokens.semantic.silver.c300,
            secondary: tokens.ash.c200,
            accent: tokens.brand.red,
          },
        },
      },
    },
  },
};
