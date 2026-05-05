import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { useAppStore } from "@/app/state/AppStore/app-store";

import type { SyncResult } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/app/desktop/TauriService/tauri")>(
    "@/app/desktop/TauriService/tauri",
  );
  return {
    ...actual,
    syncProviders: vi.fn(),
    listenSyncProgress: vi.fn(async () => () => {}),
    listProviderConnections: vi.fn(async () => []),
    loadBootstrapPayload: vi.fn(async () => {
      const { mockBootstrap } = await import("@/test/fixtures/mock-data");
      return mockBootstrap;
    }),
    loadSetupState: vi.fn(async () => ({
      currentStep: "done",
      isComplete: true,
      completedSteps: ["welcome", "schedule", "provider", "sync", "done"],
    })),
    loadAppPreferences: vi.fn(async () => ({
      themeMode: "system",
      issueCodeTheme: "timely-night",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
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
    })),
    saveAppPreferences: vi.fn(async (p) => p),
  };
});

const MOCK_RESULT: SyncResult = {
  projectsSynced: 3,
  entriesSynced: 42,
  issuesSynced: 10,
  assignedIssuesSynced: 5,
};

function resetStore() {
  useAppStore.setState({
    syncState: { status: "idle", log: [] },
    syncVersion: 0,
    lastSyncWasManual: true,
  });
}

beforeEach(() => {
  resetStore();
  vi.mocked(tauriModule.syncProviders).mockReset().mockResolvedValue(MOCK_RESULT);
  vi.mocked(tauriModule.listenSyncProgress)
    .mockReset()
    .mockResolvedValue(() => {});
});

describe("startSync", () => {
  it("increments syncVersion after a successful sync", async () => {
    expect(useAppStore.getState().syncVersion).toBe(0);

    await useAppStore.getState().startSync();

    expect(useAppStore.getState().syncVersion).toBe(1);
  });

  it("increments syncVersion on each successive sync", async () => {
    await useAppStore.getState().startSync();
    await useAppStore.getState().startSync();

    expect(useAppStore.getState().syncVersion).toBe(2);
  });

  it("sets lastSyncWasManual=true when called with manual=true (default)", async () => {
    await useAppStore.getState().startSync(true);
    expect(useAppStore.getState().lastSyncWasManual).toBe(true);
  });

  it("sets lastSyncWasManual=false for auto sync", async () => {
    await useAppStore.getState().startSync(false);
    expect(useAppStore.getState().lastSyncWasManual).toBe(false);
  });

  it("transitions syncState to done with correct result", async () => {
    await useAppStore.getState().startSync();

    const state = useAppStore.getState().syncState;
    expect(state.status).toBe("done");
    if (state.status === "done") {
      expect(state.result.entriesSynced).toBe(42);
      expect(state.result.projectsSynced).toBe(3);
    }
  });

  it("does NOT increment syncVersion when sync fails", async () => {
    vi.mocked(tauriModule.syncProviders).mockRejectedValue(new Error("network error"));

    await useAppStore.getState().startSync();

    expect(useAppStore.getState().syncVersion).toBe(0);
    expect(useAppStore.getState().syncState.status).toBe("error");
  });

  it("does not start a new sync while one is already running", async () => {
    // Set syncing state manually
    useAppStore.setState({ syncState: { status: "syncing", log: [] } });

    await useAppStore.getState().startSync();

    // syncProviders should NOT have been called since we were already syncing
    expect(tauriModule.syncProviders).not.toHaveBeenCalled();
  });

  it("appends a summary line to the log on success", async () => {
    await useAppStore.getState().startSync();

    const { log } = useAppStore.getState().syncState;
    expect(log.some((l) => l.includes("42 entries"))).toBe(true);
  });

  it("keeps syncing when progress listeners are unavailable", async () => {
    vi.mocked(tauriModule.listenSyncProgress).mockRejectedValue(new Error("listener offline"));

    await useAppStore.getState().startSync();

    const state = useAppStore.getState().syncState;
    expect(state.status).toBe("done");
    expect(state.log.some((line) => line.includes("WARN: Error: listener offline"))).toBe(true);
  });
});

describe("refreshPayload", () => {
  it("increments syncVersion so cached views invalidate after bootstrap reload", async () => {
    expect(useAppStore.getState().syncVersion).toBe(0);

    await useAppStore.getState().refreshPayload();

    expect(useAppStore.getState().syncVersion).toBe(1);
  });
});

describe("setAutoSyncPrefs", () => {
  it("updates autoSyncEnabled and autoSyncIntervalMinutes in the store", async () => {
    await useAppStore.getState().setAutoSyncPrefs(true, 60);

    expect(useAppStore.getState().autoSyncEnabled).toBe(true);
    expect(useAppStore.getState().autoSyncIntervalMinutes).toBe(60);
  });

  it("calls saveAppPreferences to persist the setting", async () => {
    await useAppStore.getState().setAutoSyncPrefs(true, 15);

    expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ autoSyncEnabled: true, autoSyncIntervalMinutes: 15 }),
    );
  });
});
