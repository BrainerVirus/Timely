import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { clearPreferencesCache } from "@/core/services/PreferencesCache/preferences-cache";
import * as tauriModule from "@/core/services/TauriService/tauri";
import { SettingsPage } from "@/features/settings/pages/SettingsPage/SettingsPage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type {
  AppPreferences,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  SyncState,
} from "@/shared/types/dashboard";

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.1",
    isPrerelease: true,
    defaultUpdateChannel: "unstable",
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.1",
  },
}));

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>(
    "@/core/services/TauriService/tauri",
  );
  return {
    ...actual,
    loadAppPreferences: vi.fn(),
    loadHolidayCountries: vi.fn(async () => []),
    saveAppPreferences: vi.fn(async (preferences) => preferences),
    listDiagnostics: vi.fn(async () => []),
    clearDiagnostics: vi.fn(async () => {}),
    exportDiagnostics: vi.fn(async () => "diagnostics report"),
    openSystemNotificationSettings: vi.fn(async () => {}),
    getNotificationPermissionCapability: vi.fn(async () => "system-settings"),
    getNotificationPermissionState: vi.fn(async () => "granted"),
    requestNotificationPermission: vi.fn(async () => "granted"),
    sendTestNotification: vi.fn(async () => {}),
  };
});

const basePreferences: AppPreferences = {
  themeMode: "system",
  motionPreference: "system",
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
  notificationsEnabled: true,
  notificationThresholds: {
    minutes45: true,
    minutes30: true,
    minutes15: true,
    minutes5: true,
  },
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

async function openAccessibilitySection() {
  fireEvent.click(await screen.findByRole("button", { name: /accessibility/i }));
}

async function openScheduleSection() {
  fireEvent.click(await screen.findByRole("button", { name: /schedule/i }));
}

async function openAppearanceSection() {
  fireEvent.click(await screen.findByRole("button", { name: /appearance/i }));
}

async function openDiagnosticsSection() {
  fireEvent.click(await screen.findByRole("button", { name: /diagnostic/i }));
}

async function openDiagnosticsConsole() {
  fireEvent.click(await screen.findByRole("button", { name: /diagnostics console/i }));
}

describe("SettingsPage tray settings", () => {
  beforeEach(() => {
    clearPreferencesCache();
    vi.mocked(tauriModule.loadAppPreferences).mockReset().mockResolvedValue(basePreferences);
    vi.mocked(tauriModule.saveAppPreferences)
      .mockReset()
      .mockImplementation(async (preferences) => preferences);
    vi.mocked(tauriModule.listDiagnostics).mockReset().mockResolvedValue([]);
    vi.mocked(tauriModule.clearDiagnostics).mockReset().mockResolvedValue();
    vi.mocked(tauriModule.exportDiagnostics).mockReset().mockResolvedValue("diagnostics report");
    vi.mocked(tauriModule.openSystemNotificationSettings).mockReset().mockResolvedValue();
    vi.mocked(tauriModule.getNotificationPermissionCapability)
      .mockReset()
      .mockResolvedValue("system-settings");
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

  it("moves language controls to Accessibility", async () => {
    renderSettingsPage();
    await openAccessibilitySection();

    expect(screen.getAllByRole("button", { name: /Auto \(System\)/i }).length).toBeGreaterThan(0);

    await openAccessibilitySection();

    await openAppearanceSection();
    expect(screen.queryByText(/^Language$/i)).not.toBeInTheDocument();
  });

  it("moves time format controls to Schedule", async () => {
    renderSettingsPage();
    await openScheduleSection();

    expect(screen.getByText(/^Time format$/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Decimal/i }));

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ timeFormat: "decimal" }),
      );
    });

    await openScheduleSection();

    await openAppearanceSection();
    expect(screen.queryByText(/^Time format$/i)).not.toBeInTheDocument();
  });

  it("removes the manual system permission action from reminders", async () => {
    renderSettingsPage();

    fireEvent.click(await screen.findByRole("button", { name: /reminders/i }));

    expect(screen.queryByRole("button", { name: /ask the system/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open system settings/i }),
    ).toBeInTheDocument();
  });

  it("orders settings sections in a more natural progression", async () => {
    renderSettingsPage();

    const sectionTitles = [
      "Connection",
      "Schedule",
      "Calendar & Holidays",
      "Reminders",
      "Sync",
      "Updates",
      "Appearance",
      "Accessibility",
      "Window & tray",
      "Diagnostics",
      "About",
      "Data Management",
    ] as const;

    await screen.findByText("Connection", { selector: "span" });

    const headingElements = sectionTitles.map((title) =>
      screen.getByText(title, { selector: "span" }),
    );

    for (let index = 0; index < headingElements.length - 1; index += 1) {
      expect(
        headingElements[index].compareDocumentPosition(headingElements[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
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
      async (
        _channel: AppPreferences["updateChannel"],
        onEvent?: (event: AppUpdateDownloadEvent) => void,
      ) => {
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
      async (
        _channel: AppPreferences["updateChannel"],
        onEvent?: (event: AppUpdateDownloadEvent) => void,
      ) => {
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

  it("loads diagnostics with no feature filter when 'All' is selected", async () => {
    renderSettingsPage();
    await openDiagnosticsSection();
    await openDiagnosticsConsole();

    await waitFor(() => {
      expect(tauriModule.listDiagnostics).toHaveBeenCalledWith({ feature: undefined });
    });
  });
});
