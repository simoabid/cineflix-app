import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface ThemeStore {
  theme: string | null;
  setTheme(v: string | null): void;
}

export const useThemeStore = create(
  persist(
    immer<ThemeStore>((set) => ({
      theme: null,
      setTheme(v) {
        set((s) => {
          s.theme = v;
        });
      },
    })),
    {
      name: "__CINEFLIX::theme",
    },
  ),
);

export interface PreviewThemeStore {
  previewTheme: string | null;
  setPreviewTheme(v: string | null): void;
}

export const usePreviewThemeStore = create(
  immer<PreviewThemeStore>((set) => ({
    previewTheme: null,
    setPreviewTheme(v) {
      set((s) => {
        s.previewTheme = v;
      });
    },
  })),
);

/**
 * Applies the active (or preview) theme class to a wrapper and optionally to document body.
 * Themes are defined under root `themes/` and wired via tailwindcss-themer as `.theme-{name}`.
 */
export function ThemeProvider(props: {
  children?: ReactNode;
  applyGlobal?: boolean;
}) {
  const previewTheme = usePreviewThemeStore((s) => s.previewTheme);
  const theme = useThemeStore((s) => s.theme);

  const themeToDisplay = previewTheme ?? theme;
  // null / "default" both mean default theme class
  const themeId =
    !themeToDisplay || themeToDisplay === "default"
      ? "default"
      : themeToDisplay;
  const themeSelector = `theme-${themeId}`;

  return (
    <div className={themeSelector}>
      {props.applyGlobal ? (
        <Helmet>
          <body className={themeSelector} />
        </Helmet>
      ) : null}
      {props.children}
    </div>
  );
}
