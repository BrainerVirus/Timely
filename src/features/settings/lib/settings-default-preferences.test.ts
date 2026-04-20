import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { createDefaultSettingsPreferences } from "@/features/settings/lib/settings-default-preferences";
import { getCountryCodeForTimezone } from "@/shared/lib/utils";

describe("createDefaultSettingsPreferences", () => {
  it("derives defaults from build info and timezone", () => {
    const preferences = createDefaultSettingsPreferences("America/Santiago");

    expect(preferences.updateChannel).toBe(buildInfo.defaultUpdateChannel);
    expect(preferences.holidayCountryCode).toBe(getCountryCodeForTimezone("America/Santiago"));
    expect(preferences.notificationsEnabled).toBe(true);
    expect(preferences.issueCodeTheme).toBe("timely-night");
    expect(preferences.notificationThresholds).toEqual({
      minutes45: true,
      minutes30: true,
      minutes15: true,
      minutes5: true,
    });
  });
});
