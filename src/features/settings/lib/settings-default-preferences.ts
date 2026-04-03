import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { getCountryCodeForTimezone } from "@/shared/lib/utils";

import type { AppPreferences } from "@/shared/types/dashboard";

export function createDefaultSettingsPreferences(timezone: string): AppPreferences {
  return {
    themeMode: "system",
    language: "auto",
    updateChannel: buildInfo.defaultUpdateChannel,
    lastInstalledVersion: undefined,
    lastSeenReleaseHighlightsVersion: undefined,
    holidayCountryMode: "auto",
    holidayCountryCode: getCountryCodeForTimezone(timezone),
    motionPreference: "system",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
    notificationsEnabled: true,
    notificationThresholds: {
      minutes45: true,
      minutes30: true,
      minutes15: true,
      minutes5: true,
    },
    notificationPermissionRequested: false,
  };
}
