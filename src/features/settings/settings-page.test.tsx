import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsPage } from "@/features/settings/settings-page";
import { I18nProvider } from "@/lib/i18n";
import { mockBootstrap } from "@/lib/mock-data";
import * as tauriModule from "@/lib/tauri";

import type {
  AppPreferences,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  SyncState,
} from "@/types/dashboard";

vi.mock("@/lib/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.1",
    isPrerelease: true,
    defaultUpdateChannel: "unstable",
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.1",
  },
}));

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
  updateChannel: "stable",
  lastInstalledVersion: undefined,
  lastSeenReleaseHighlightsVersion: undefined,
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
  const onCheckForUpdates = vi.fn(async () => null);
  const onInstallUpdate = vi.fn(async () => {});
  const onRestartToUpdate = vi.fn(async () => {});

  render(
    <I18nProvider>
      <SettingsPage
        payload={mockBootstrap}
        connections={[]}
        syncState={idleSyncState}
        onStartSync={vi.fn(async () => {})}
        onCheckForUpdates={onCheckForUpdates}
        onInstallUpdate={onInstallUpdate}
        onRestartToUpdate={onRestartToUpdate}
        onSaveConnection={vi.fn() as never}
        onSavePat={vi.fn() as never}
        onBeginOAuth={vi.fn() as never}
        onResolveCallback={vi.fn() as never}
        onResetAllData={vi.fn(async () => {})}
      />
    </I18nProvider>,
  );

  return {
    onCheckForUpdates,
    onInstallUpdate,
    onRestartToUpdate,
  };
}

const availableUpdate: AppUpdateInfo = {
  currentVersion: "0.1.0-beta.1",
  version: "0.1.1",
  channel: "stable",
  date: "2026-03-17T10:00:00Z",
  body: "- Fix updater flow",
};

async function openUpdatesSection() {
  fireEvent.click(await screen.findByRole("button", { name: /updates/i }));
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

  it("persists the selected update channel", async () => {
    renderSettingsPage();

    fireEvent.click(await screen.findByRole("button", { name: /updates/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Unstable" }));

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ updateChannel: "unstable" }),
      );
    });
  });

  it("checks updates using the selected channel", async () => {
    const { onCheckForUpdates } = renderSettingsPage();

    await openUpdatesSection();
    fireEvent.click(await screen.findByRole("button", { name: /check for updates/i }));

    await waitFor(() => {
      expect(onCheckForUpdates).toHaveBeenCalledWith("stable");
    });
  });

  it("uses the build channel as the default update channel fallback", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockReset().mockRejectedValue(new Error("boom"));
    const { onCheckForUpdates } = renderSettingsPage();

    await openUpdatesSection();
    fireEvent.click(await screen.findByRole("button", { name: /check for updates/i }));

    await waitFor(() => {
      expect(onCheckForUpdates).toHaveBeenCalledWith("unstable");
    });
  });

  it("shows install progress and restart state after installing an update", async () => {
    const onCheckForUpdates = vi.fn(async () => availableUpdate);
    const onInstallUpdate = vi.fn(
      async (_channel: AppPreferences["updateChannel"], onEvent?: (event: AppUpdateDownloadEvent) => void) => {
        onEvent?.({ event: "Started", data: { contentLength: 2 * 1024 * 1024 } });
        onEvent?.({ event: "Progress", data: { chunkLength: 512 * 1024 } });
        onEvent?.({ event: "Finished" });
      },
    );

    render(
      <I18nProvider>
        <SettingsPage
          payload={mockBootstrap}
          connections={[]}
          syncState={idleSyncState}
          onStartSync={vi.fn(async () => {})}
          onCheckForUpdates={onCheckForUpdates}
          onInstallUpdate={onInstallUpdate}
          onRestartToUpdate={vi.fn(async () => {})}
          onSaveConnection={vi.fn() as never}
          onSavePat={vi.fn() as never}
          onBeginOAuth={vi.fn() as never}
          onResolveCallback={vi.fn() as never}
          onResetAllData={vi.fn(async () => {})}
        />
      </I18nProvider>,
    );

    await openUpdatesSection();
    fireEvent.click(await screen.findByRole("button", { name: /check for updates/i }));

    expect(await screen.findByRole("button", { name: /install update/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /install update/i }));

    await waitFor(() => {
      expect(onInstallUpdate).toHaveBeenCalledWith("stable", expect.any(Function));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /restart to update/i })).toBeInTheDocument();
    });
  });

  it("surfaces install failures explicitly", async () => {
    const onCheckForUpdates = vi.fn(async () => availableUpdate);
    const onInstallUpdate = vi.fn(async () => {
      throw new Error("Updater endpoint unreachable");
    });

    render(
      <I18nProvider>
        <SettingsPage
          payload={mockBootstrap}
          connections={[]}
          syncState={idleSyncState}
          onStartSync={vi.fn(async () => {})}
          onCheckForUpdates={onCheckForUpdates}
          onInstallUpdate={onInstallUpdate}
          onRestartToUpdate={vi.fn(async () => {})}
          onSaveConnection={vi.fn() as never}
          onSavePat={vi.fn() as never}
          onBeginOAuth={vi.fn() as never}
          onResolveCallback={vi.fn() as never}
          onResetAllData={vi.fn(async () => {})}
        />
      </I18nProvider>,
    );

    await openUpdatesSection();
    fireEvent.click(await screen.findByRole("button", { name: /check for updates/i }));
    fireEvent.click(await screen.findByRole("button", { name: /install update/i }));

    await waitFor(() => {
      expect(onInstallUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it("restarts through the explicit restart action once ready", async () => {
    const onCheckForUpdates = vi.fn(async () => availableUpdate);
    const onInstallUpdate = vi.fn(
      async (_channel: AppPreferences["updateChannel"], onEvent?: (event: AppUpdateDownloadEvent) => void) => {
        onEvent?.({ event: "Finished" });
      },
    );
    const onRestartToUpdate = vi.fn(async () => {});

    render(
      <I18nProvider>
        <SettingsPage
          payload={mockBootstrap}
          connections={[]}
          syncState={idleSyncState}
          onStartSync={vi.fn(async () => {})}
          onCheckForUpdates={onCheckForUpdates}
          onInstallUpdate={onInstallUpdate}
          onRestartToUpdate={onRestartToUpdate}
          onSaveConnection={vi.fn() as never}
          onSavePat={vi.fn() as never}
          onBeginOAuth={vi.fn() as never}
          onResolveCallback={vi.fn() as never}
          onResetAllData={vi.fn(async () => {})}
        />
      </I18nProvider>,
    );

    await openUpdatesSection();
    fireEvent.click(await screen.findByRole("button", { name: /check for updates/i }));
    fireEvent.click(await screen.findByRole("button", { name: /install update/i }));
    fireEvent.click(await screen.findByRole("button", { name: /restart to update/i }));

    await waitFor(() => {
      expect(onRestartToUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
