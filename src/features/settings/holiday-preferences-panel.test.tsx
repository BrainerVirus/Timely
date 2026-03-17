import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HolidayPreferencesPanel } from "@/features/settings/holiday-preferences-panel";
import * as tauriModule from "@/lib/tauri";

import type { AppPreferences } from "@/types/dashboard";

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    loadHolidayYear: vi.fn(),
  };
});

const basePreferences: AppPreferences = {
  themeMode: "system",
  language: "en",
  updateChannel: "stable",
  holidayCountryMode: "auto",
  holidayCountryCode: "CL",
  timeFormat: "hm",
  autoSyncEnabled: false,
  autoSyncIntervalMinutes: 30,
  trayEnabled: true,
  closeToTray: true,
  onboardingCompleted: false,
};

describe("HolidayPreferencesPanel", () => {
  beforeEach(() => {
    vi.mocked(tauriModule.loadHolidayYear)
      .mockReset()
      .mockResolvedValue({
        countryCode: "CL",
        year: 2026,
        holidays: [
          { date: "2026-01-01", name: "Año Nuevo" },
          { date: "2026-04-03", name: "Viernes Santo" },
        ],
      });
  });

  it("loads the current year holidays for the resolved country", async () => {
    render(
      <HolidayPreferencesPanel
        timezone="America/Santiago"
        preferences={basePreferences}
        countries={[{ code: "CL", label: "Chile" }]}
        onSavePreferences={vi.fn(async () => {})}
      />,
    );

    await waitFor(() => {
      expect(tauriModule.loadHolidayYear).toHaveBeenCalled();
    });
  });

  it("enables switching back to detected mode when country is manual", async () => {
    const onSavePreferences = vi.fn(async (_value: AppPreferences) => {});

    render(
      <HolidayPreferencesPanel
        timezone="America/Santiago"
        preferences={{
          ...basePreferences,
          holidayCountryMode: "manual",
          holidayCountryCode: "AR",
        }}
        countries={[
          { code: "CL", label: "Chile" },
          { code: "AR", label: "Argentina" },
        ]}
        onSavePreferences={onSavePreferences}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use detected" }));

    await waitFor(() => {
      expect(onSavePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ holidayCountryMode: "auto", holidayCountryCode: "CL" }),
      );
    });
  });
});
