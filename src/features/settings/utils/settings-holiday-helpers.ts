import { getCountryCodeForTimezone, normalizeHolidayCountryMode } from "@/shared/utils/utils";

import type { AppPreferences } from "@/shared/types/dashboard";

/**
 * Computes the next preferences to persist when timezone auto-detection changes
 * the holiday country. Returns null if no change is needed.
 */
export function resolveNextAutoHolidayPreferences(
  preferences: AppPreferences,
  timezone: string,
): AppPreferences | null {
  if (normalizeHolidayCountryMode(preferences.holidayCountryMode) !== "auto") {
    return null;
  }

  const detectedCountryCode = getCountryCodeForTimezone(timezone);
  if (!detectedCountryCode || detectedCountryCode === preferences.holidayCountryCode) {
    return null;
  }

  return {
    ...preferences,
    holidayCountryMode: "auto",
    holidayCountryCode: detectedCountryCode,
  };
}
