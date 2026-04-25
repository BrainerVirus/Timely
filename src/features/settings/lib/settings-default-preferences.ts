import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { DEFAULT_ISSUE_CODE_THEME } from "@/features/issues/lib/issue-code-theme";
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
    issueCodeTheme: DEFAULT_ISSUE_CODE_THEME,
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
