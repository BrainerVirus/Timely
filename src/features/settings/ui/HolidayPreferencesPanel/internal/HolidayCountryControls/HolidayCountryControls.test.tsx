import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { HolidayCountryControls } from "@/features/settings/ui/HolidayPreferencesPanel/internal/HolidayCountryControls/HolidayCountryControls";

import type { AppPreferences } from "@/shared/types/dashboard";

const basePreferences: AppPreferences = {
  themeMode: "system",
  motionPreference: "system",
  language: "en",
  updateChannel: "stable",
  holidayCountryMode: "manual",
  holidayCountryCode: "AR",
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
};

describe("HolidayCountryControls", () => {
  it("calls the detected-country action", () => {
    const onUseDetectedCountry = vi.fn();

    render(
      <I18nProvider>
        <HolidayCountryControls
          countries={[
            { code: "CL", label: "Chile" },
            { code: "AR", label: "Argentina" },
          ]}
          detectedCountryCode="CL"
          onChangeCountry={vi.fn()}
          onUseDetectedCountry={onUseDetectedCountry}
          preferences={basePreferences}
          resolvedCountryCode="AR"
          resolvedCountryLabel="Argentina"
          t={(key) => key}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "settings.useDetected" }));
    expect(onUseDetectedCountry).toHaveBeenCalledTimes(1);
  });
});
