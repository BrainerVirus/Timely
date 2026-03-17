import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsPage } from "@/features/settings/settings-page";
import { I18nProvider } from "@/lib/i18n";
import { mockBootstrap } from "@/lib/mock-data";
import * as tauriModule from "@/lib/tauri";

import type { AppPreferences, SyncState } from "@/types/dashboard";

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    loadAppPreferences: vi.fn(),
    loadHolidayCountries: vi.fn(async () => []),
    saveAppPreferences: vi.fn(async (preferences) => preferences),
  };
});

const basePreferences: AppPreferences = {
  themeMode: "system",
  language: "auto",
  holidayCountryMode: "auto",
  holidayCountryCode: undefined,
  timeFormat: "hm",
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 30,
  trayEnabled: true,
  closeToTray: true,
  onboardingCompleted: false,
};

const idleSyncState: SyncState = {
  status: "idle",
  log: [],
};

function renderSettingsPage() {
  return render(
    <I18nProvider>
      <SettingsPage
        payload={mockBootstrap}
        connections={[]}
        syncState={idleSyncState}
        onStartSync={vi.fn(async () => {})}
        onSaveConnection={vi.fn() as never}
        onSavePat={vi.fn() as never}
        onBeginOAuth={vi.fn() as never}
        onResolveCallback={vi.fn() as never}
        onResetAllData={vi.fn(async () => {})}
      />
    </I18nProvider>,
  );
}

async function openWindowBehaviorSection() {
  const trigger = await screen.findByRole("button", { name: /window.*tray/i });
  fireEvent.click(trigger);
}

describe("SettingsPage tray settings", () => {
  beforeEach(() => {
    vi.mocked(tauriModule.loadAppPreferences).mockReset().mockResolvedValue(basePreferences);
    vi.mocked(tauriModule.saveAppPreferences)
      .mockReset()
      .mockImplementation(async (preferences) => preferences);
  });

  it("persists disabling the tray icon", async () => {
    renderSettingsPage();
    await openWindowBehaviorSection();

    const traySwitch = await screen.findByRole("switch", { name: /show tray icon/i });
    fireEvent.click(traySwitch);

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ trayEnabled: false, closeToTray: false }),
      );
    });
  });

  it("persists changing the close action to quit", async () => {
    renderSettingsPage();
    await openWindowBehaviorSection();

    fireEvent.click(await screen.findByRole("button", { name: /quit app/i }));

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ trayEnabled: true, closeToTray: false }),
      );
    });
  });
});
