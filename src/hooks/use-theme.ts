import { getAppPreferencesCached } from "@/core/runtime/preferences-cache";
import { getStartupFrameColor, writeStartupPrefs } from "@/core/runtime/startup-prefs";

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
  if (globalThis.window === undefined || typeof globalThis.matchMedia !== "function") {
    return null;
  }

  return globalThis.matchMedia(SYSTEM_THEME_QUERY);
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return getSystemMediaQuery()?.matches ? "dark" : "light";
}

function applyResolvedTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const frameColor = getStartupFrameColor(theme);
  root.style.backgroundColor = frameColor;
  if (document.body) {
    document.body.style.backgroundColor = frameColor;
  }
}

export function applyTheme(theme: Theme) {
  cleanupSystemThemeListener();

  const resolvedTheme = resolveTheme(theme);
  applyResolvedTheme(resolvedTheme);
  writeStartupPrefs({ themeMode: theme });

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
  const preferences = await getAppPreferencesCached();
  return normalizeTheme(preferences.themeMode);
}
