import { act, render, screen, waitFor } from "@testing-library/react";
import { Calendar } from "@/shared/components/Calendar/Calendar";
import { I18nProvider } from "@/core/runtime/i18n";
import * as tauriModule from "@/core/runtime/tauri";

vi.mock("@/core/runtime/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/runtime/tauri")>("@/core/runtime/tauri");
  return {
    ...actual,
    loadAppPreferences: vi.fn(),
  };
});

describe("Calendar", () => {
  beforeEach(() => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "es",
      updateChannel: "stable",
      holidayCountryMode: "auto",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
    });
  });

  it("renders month and navigation labels in Spanish", async () => {
    render(
      <I18nProvider>
        <Calendar month={new Date(2026, 2, 12)} />
      </I18nProvider>,
    );

    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByText(/marzo/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("hides outside days in range mode so dual months do not duplicate dates", async () => {
    render(
      <I18nProvider>
        <Calendar month={new Date(2026, 2, 12)} />
      </I18nProvider>,
    );

    await act(async () => {});

    render(
      <I18nProvider>
        <Calendar mode="range" month={new Date(2026, 2, 12)} numberOfMonths={2} />
      </I18nProvider>,
    );

    await act(async () => {});

    const outsideDays = document.querySelectorAll("[data-outside='true']");
    expect(outsideDays.length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-outside='true'] button")).toHaveLength(0);
  });
});
