import classNames from "classnames";
import { Check } from "lucide-react";

import { usePreviewThemeStore, useThemeStore } from "@/stores/theme";

export const AVAILABLE_THEMES = [
  { id: "default", selector: "theme-default", name: "Cineflix" },
  { id: "dark-slate", selector: "theme-dark-slate", name: "Dark Slate" },
  { id: "classic", selector: "theme-classic", name: "Classic" },
  { id: "blue", selector: "theme-blue", name: "Blue" },
  { id: "teal", selector: "theme-teal", name: "Teal" },
  { id: "red", selector: "theme-red", name: "Red" },
  { id: "gray", selector: "theme-gray", name: "Gray" },
  { id: "green", selector: "theme-green", name: "Green" },
  { id: "forest", selector: "theme-forest", name: "Forest" },
  { id: "autumn", selector: "theme-autumn", name: "Autumn" },
  { id: "frost", selector: "theme-frost", name: "Frost" },
  { id: "mocha", selector: "theme-mocha", name: "Mocha" },
  { id: "pink", selector: "theme-pink", name: "Pink" },
  { id: "noir", selector: "theme-noir", name: "Noir" },
  { id: "ember", selector: "theme-ember", name: "Ember" },
  { id: "acid", selector: "theme-acid", name: "Acid" },
  { id: "spark", selector: "theme-spark", name: "Spark" },
  { id: "cobalt", selector: "theme-cobalt", name: "Cobalt" },
  { id: "grape", selector: "theme-grape", name: "Grape" },
  { id: "spiderman", selector: "theme-spiderman", name: "Spiderman" },
  { id: "wolverine", selector: "theme-wolverine", name: "Wolverine" },
  { id: "hulk", selector: "theme-hulk", name: "Hulk" },
  { id: "popsicle", selector: "theme-popsicle", name: "Popsicle" },
  { id: "christmas", selector: "theme-christmas", name: "Christmas" },
] as const;

function ThemePreviewCard(props: {
  selector: string;
  name: string;
  active: boolean;
  inUse: boolean;
  onClick: () => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  return (
    <div
      className={classNames(props.selector, "cursor-pointer group")}
      onClick={props.onClick}
      onMouseEnter={props.onPreview}
      onMouseLeave={props.onPreviewEnd}
      onFocus={props.onPreview}
      onBlur={props.onPreviewEnd}
      role="button"
      tabIndex={0}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onClick();
        }
      }}
    >
      <div
        className={classNames(
          "w-full h-28 relative rounded-lg border bg-gradient-to-br from-themePreview-primary/20 to-themePreview-secondary/10 transition-colors duration-150",
          props.active
            ? "border-themePreview-primary"
            : "border-transparent group-hover:border-white/20",
        )}
      >
        <div className="absolute top-2 left-2">
          <div className="h-5 w-5 bg-themePreview-primary rounded-full" />
          <div className="h-5 w-5 bg-themePreview-secondary rounded-full -mt-2" />
        </div>
        <Check
          className={classNames(
            "absolute top-3 right-3 w-4 h-4 text-white transition-opacity duration-150",
            props.active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-4/5 rounded-t-lg bg-background-main overflow-hidden">
          <div className="relative w-full h-full">
            <div className="bg-themePreview-primary/50 w-[130%] h-10 absolute left-1/2 -top-5 blur-xl -translate-x-1/2 rounded-full" />
            <div className="p-2 flex justify-between items-center">
              <div className="flex space-x-1">
                <div className="bg-themePreview-ghost/10 w-4 h-2 rounded-full" />
                <div className="bg-themePreview-ghost/10 w-2 h-2 rounded-full" />
              </div>
              <div className="bg-themePreview-ghost/10 w-2 h-2 rounded-full" />
            </div>
            <div className="mt-1 flex flex-col items-center gap-1">
              <div className="bg-themePreview-ghost/20 w-8 h-0.5 rounded-full" />
              <div className="bg-themePreview-ghost/10 w-16 h-2 mt-1 rounded-full" />
            </div>
            <div className="mt-3 px-2 flex gap-1">
              <div className="bg-themePreview-ghost/10 w-full h-10 rounded" />
              <div className="bg-themePreview-ghost/10 w-full h-10 rounded" />
              <div className="bg-themePreview-ghost/10 w-full h-10 rounded" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center gap-2">
        <span className="font-medium text-white text-sm truncate">{props.name}</span>
        <span
          className={classNames(
            "shrink-0 inline-block px-2 py-0.5 text-xs rounded-full bg-pill-activeBackground text-white/85 transition-opacity",
            props.inUse ? "opacity-100" : "opacity-0",
          )}
        >
          Active
        </span>
      </div>
    </div>
  );
}

/**
 * Theme selection grid for Account → Appearance.
 * Hover previews the theme; click persists it.
 */
export function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const previewTheme = usePreviewThemeStore((s) => s.previewTheme);
  const setPreviewTheme = usePreviewThemeStore((s) => s.setPreviewTheme);

  const activeId = theme ?? "default";
  const previewId = previewTheme ?? activeId;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {AVAILABLE_THEMES.map((t) => (
        <ThemePreviewCard
          key={t.id}
          selector={t.selector}
          name={t.name}
          active={previewId === t.id}
          inUse={activeId === t.id}
          onClick={() => setTheme(t.id === "default" ? null : t.id)}
          onPreview={() => setPreviewTheme(t.id === "default" ? "default" : t.id)}
          onPreviewEnd={() => setPreviewTheme(null)}
        />
      ))}
    </div>
  );
}
