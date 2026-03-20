import { syncStartupPrefsWithPreferences } from "@/lib/startup-prefs";
import { loadAppPreferences, saveAppPreferences } from "@/lib/tauri";

import type { AppPreferences } from "@/types/dashboard";

let cachedPreferences: AppPreferences | null = null;
let inFlightPreferencesPromise: Promise<AppPreferences> | null = null;

function primeCache(preferences: AppPreferences): AppPreferences {
  cachedPreferences = preferences;
  syncStartupPrefsWithPreferences(preferences);
  return preferences;
}

export function getCachedPreferences(): AppPreferences | null {
  return cachedPreferences;
}

export function clearPreferencesCache(): void {
  cachedPreferences = null;
  inFlightPreferencesPromise = null;
}

export async function getAppPreferencesCached(options?: {
  forceRefresh?: boolean;
}): Promise<AppPreferences> {
  if (!options?.forceRefresh && cachedPreferences) {
    return cachedPreferences;
  }

  if (inFlightPreferencesPromise) {
    return inFlightPreferencesPromise;
  }

  inFlightPreferencesPromise = loadAppPreferences()
    .then((preferences) => primeCache(preferences))
    .finally(() => {
      inFlightPreferencesPromise = null;
    });

  return inFlightPreferencesPromise;
}

export async function saveAppPreferencesCached(
  preferencesInput: AppPreferences,
): Promise<AppPreferences> {
  const persisted = await saveAppPreferences(preferencesInput);
  return primeCache(persisted);
}

export function primeAppPreferencesCache(preferences: AppPreferences): void {
  primeCache(preferences);
}
