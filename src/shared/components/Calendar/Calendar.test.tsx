import { act, render, screen, waitFor } from "@testing-library/react";
import * as tauriModule from "@/core/services/TauriService/tauri";
import { Calendar } from "@/shared/components/Calendar/Calendar";

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>(
    "@/core/services/TauriService/tauri",
  );
  return {
    ...actual,
    loadAppPreferences: vi.fn(),
  };
});

const spanishLabels = {
  labelNav: () => "Calendario",
  labelNext: () => "Siguiente",
  labelPrevious: () => "Anterior",
};

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
      notificationsEnabled: true,
      notificationThresholds: {
        minutes45: true,
        minutes30: true,
        minutes15: true,
        minutes5: true,
      },
    });
  });

  it("renders month and navigation labels in Spanish", async () => {
    render(<Calendar month={new Date(2026, 2, 12)} locale="es" labels={spanishLabels} />);

    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByText(/marzo/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("hides outside days in range mode so dual months do not duplicate dates", async () => {
    render(<Calendar month={new Date(2026, 2, 12)} locale="es" labels={spanishLabels} />);

    await act(async () => {});

    render(
      <Calendar
        mode="range"
        month={new Date(2026, 2, 12)}
        numberOfMonths={2}
        locale="es"
        labels={spanishLabels}
      />,
    );

    await act(async () => {});

    const outsideDays = document.querySelectorAll("[data-outside='true']");
    expect(outsideDays.length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-outside='true'] button")).toHaveLength(0);
  });
});
