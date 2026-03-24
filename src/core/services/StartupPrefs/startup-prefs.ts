import type { AppPreferences, MotionPreference } from "@/shared/types/dashboard";

export type StartupThemeMode = "system" | "light" | "dark";
export type StartupResolvedTheme = "light" | "dark";
export type StartupResolvedMotion = "full" | "reduced";

export interface StartupPrefsSnapshot {
  version: 1;
  themeMode: StartupThemeMode;
  resolvedTheme: StartupResolvedTheme;
  motionPreference: MotionPreference;
}

export const STARTUP_PREFS_STORAGE_KEY = "timely-startup-prefs";
export const LIGHT_FRAME_COLOR = "oklch(0.894 0.014 68)";
export const DARK_FRAME_COLOR = "oklch(0.105 0.012 55)";

const STARTUP_PREFS_VERSION = 1 as const;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const VALID_THEME_MODES = new Set<StartupThemeMode>(["system", "light", "dark"]);
const VALID_MOTION_PREFERENCES = new Set<MotionPreference>(["system", "reduced", "full"]);

function hasBrowserWindow(): boolean {
  return globalThis.window !== undefined;
}

function canUseLocalStorage(): boolean {
  return hasBrowserWindow() && globalThis.localStorage !== undefined;
}

function safeMatchMedia(query: string): MediaQueryList | null {
  if (!hasBrowserWindow() || typeof globalThis.matchMedia !== "function") {
    return null;
  }

  return globalThis.matchMedia(query);
}

export function normalizeStartupThemeMode(value: string | null | undefined): StartupThemeMode {
  return VALID_THEME_MODES.has(value as StartupThemeMode) ? (value as StartupThemeMode) : "system";
}

export function normalizeStartupMotionPreference(
  value: string | null | undefined,
): MotionPreference {
  return VALID_MOTION_PREFERENCES.has(value as MotionPreference)
    ? (value as MotionPreference)
    : "system";
}

export function resolveStartupTheme(themeMode: StartupThemeMode): StartupResolvedTheme {
  if (themeMode === "light" || themeMode === "dark") {
    return themeMode;
  }

  return safeMatchMedia(SYSTEM_THEME_QUERY)?.matches ? "dark" : "light";
}

export function resolveStartupMotion(motionPreference: MotionPreference): StartupResolvedMotion {
  if (motionPreference === "reduced") {
    return "reduced";
  }

  if (motionPreference === "full") {
    return "full";
  }

  return safeMatchMedia(REDUCED_MOTION_QUERY)?.matches ? "reduced" : "full";
}

export function getStartupFrameColor(theme: StartupResolvedTheme): string {
  return theme === "dark" ? DARK_FRAME_COLOR : LIGHT_FRAME_COLOR;
}

function readStoredStartupPrefs(): Partial<StartupPrefsSnapshot> | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = globalThis.localStorage.getItem(STARTUP_PREFS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<StartupPrefsSnapshot>) : null;
  } catch {
    return null;
  }
}

function persistStartupPrefs(snapshot: StartupPrefsSnapshot): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(STARTUP_PREFS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // best effort only
  }
}

export function readStartupPrefs(): StartupPrefsSnapshot {
  const stored = readStoredStartupPrefs();
  const themeMode = normalizeStartupThemeMode(stored?.themeMode);
  const motionPreference = normalizeStartupMotionPreference(stored?.motionPreference);

  return {
    version: STARTUP_PREFS_VERSION,
    themeMode,
    resolvedTheme: resolveStartupTheme(themeMode),
    motionPreference,
  };
}

export function writeStartupPrefs(
  next: Partial<Pick<StartupPrefsSnapshot, "themeMode" | "motionPreference">>,
): StartupPrefsSnapshot {
  const current = readStartupPrefs();
  const themeMode = normalizeStartupThemeMode(next.themeMode ?? current.themeMode);
  const motionPreference = normalizeStartupMotionPreference(
    next.motionPreference ?? current.motionPreference,
  );
  const snapshot = {
    version: STARTUP_PREFS_VERSION,
    themeMode,
    resolvedTheme: resolveStartupTheme(themeMode),
    motionPreference,
  } satisfies StartupPrefsSnapshot;

  persistStartupPrefs(snapshot);
  return snapshot;
}

export function syncStartupPrefsWithPreferences(
  preferences: Pick<AppPreferences, "themeMode" | "motionPreference">,
): StartupPrefsSnapshot {
  return writeStartupPrefs({
    themeMode: preferences.themeMode,
    motionPreference: preferences.motionPreference,
  });
}

export function applyStartupPrefsToDocument(
  snapshot: StartupPrefsSnapshot = readStartupPrefs(),
): StartupPrefsSnapshot {
  if (typeof document === "undefined") {
    return snapshot;
  }

  const resolvedTheme = resolveStartupTheme(snapshot.themeMode);
  const nextSnapshot = {
    ...snapshot,
    resolvedTheme,
  } satisfies StartupPrefsSnapshot;
  const root = document.documentElement;
  const frameColor = getStartupFrameColor(resolvedTheme);

  root.dataset.theme = resolvedTheme;
  root.dataset.motion = resolveStartupMotion(snapshot.motionPreference);
  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = frameColor;

  if (document.body) {
    document.body.style.backgroundColor = frameColor;
  }

  persistStartupPrefs(nextSnapshot);
  return nextSnapshot;
}
