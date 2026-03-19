import { loadAppPreferences } from "@/lib/tauri";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<Theme, "system">;

const VALID_THEMES = new Set<Theme>(["system", "light", "dark"]);
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

let disposeSystemThemeListener: (() => void) | null = null;

function cleanupSystemThemeListener() {
  disposeSystemThemeListener?.();
  disposeSystemThemeListener = null;
}

function getSystemMediaQuery() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(SYSTEM_THEME_QUERY);
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return getSystemMediaQuery()?.matches ? "dark" : "light";
}

function applyResolvedTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export function applyTheme(theme: Theme) {
  cleanupSystemThemeListener();

  const resolvedTheme = resolveTheme(theme);
  applyResolvedTheme(resolvedTheme);

  if (theme === "system") {
    const mediaQuery = getSystemMediaQuery();

    if (mediaQuery) {
      const handleChange = (event: MediaQueryListEvent) => {
        applyResolvedTheme(event.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      disposeSystemThemeListener = () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }

  return resolvedTheme;
}

export function normalizeTheme(value: string | undefined): Theme {
  return VALID_THEMES.has(value as Theme) ? (value as Theme) : "system";
}

export async function loadPersistedTheme(): Promise<Theme> {
  const preferences = await loadAppPreferences();
  return normalizeTheme(preferences.themeMode);
}
