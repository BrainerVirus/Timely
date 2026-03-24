import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HolidayPreferencesPanel } from "@/features/settings/holiday-preferences-panel";
import { I18nProvider } from "@/core/runtime/i18n";
import * as tauriModule from "@/core/runtime/tauri";

import type { AppPreferences } from "@/shared/types/dashboard";

const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("@/core/runtime/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/runtime/tauri")>("@/core/runtime/tauri");
  return {
    ...actual,
    loadHolidayYear: vi.fn(),
  };
});

const basePreferences: AppPreferences = {
  themeMode: "system",
  motionPreference: "system",
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
    mockToastError.mockReset();
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
      <I18nProvider>
        <HolidayPreferencesPanel
          timezone="America/Santiago"
          preferences={basePreferences}
          countries={[{ code: "CL", label: "Chile" }]}
          onSavePreferences={vi.fn(async () => {})}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadHolidayYear).toHaveBeenCalled();
    });
  });

  it("enables switching back to detected mode when country is manual", async () => {
    const onSavePreferences = vi.fn(async (_value: AppPreferences) => {});

    render(
      <I18nProvider>
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
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use detected" }));

    await waitFor(() => {
      expect(onSavePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ holidayCountryMode: "auto", holidayCountryCode: "CL" }),
      );
    });
  });

  it("shows a toast and avoids inline error content when holiday loading fails", async () => {
    vi.mocked(tauriModule.loadHolidayYear).mockRejectedValue(new Error("holidays offline"));

    render(
      <I18nProvider>
        <HolidayPreferencesPanel
          timezone="America/Santiago"
          preferences={basePreferences}
          countries={[{ code: "CL", label: "Chile" }]}
          onSavePreferences={vi.fn(async () => {})}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Could not load holidays.", {
        description: "holidays offline",
        duration: 7000,
      });
    });

    expect(screen.queryByText("holidays offline")).not.toBeInTheDocument();
  });
});
