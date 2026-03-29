import { create } from "zustand";
import { getBootElapsedMs } from "@/core/services/BootTiming/boot-timing";
import {
  getAppPreferencesCached,
  primeAppPreferencesCache,
  saveAppPreferencesCached,
} from "@/core/services/PreferencesCache/preferences-cache";
import {
  clearStartupAppSnapshot,
  createDefaultStartupAppSnapshot,
  readStartupAppSnapshot,
  writeStartupAppSnapshot,
} from "@/core/services/StartupAppState/startup-app-state";
import {
  syncStartupPrefsWithPreferences,
} from "@/core/services/StartupPrefs/startup-prefs";
import {
  listGitLabConnections,
  listenSyncProgress,
  loadAppPreferences,
  loadSetupState,
  loadBootstrapPayload,
  logFrontendBootTiming,
  requestNotificationPermission,
  saveSetupState,
  syncGitLab,
  updateTrayIcon,
} from "@/core/services/TauriService/tauri";
import { getCountryCodeForTimezone, normalizeHolidayCountryMode } from "@/shared/utils/utils";

import type {
  BootstrapPayload,
  ProviderConnection,
  SetupState,
  SyncState,
  TimeFormat,
} from "@/shared/types/dashboard";

function syncTrayIcon(payload: BootstrapPayload): void {
  updateTrayIcon(payload.today.loggedHours, payload.today.targetHours);
}

function logStoreBoot(message: string): void {
  const elapsed = getBootElapsedMs();
  void logFrontendBootTiming(`[app-store] ${message}`, elapsed).catch(() => {
    // best effort logging only
  });
}

async function timedStoreCall<T>(label: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const value = await run();
    logStoreBoot(`${label} ok in ${Math.round(performance.now() - start)}ms`);
    return value;
  } catch (error) {
    logStoreBoot(`${label} failed in ${Math.round(performance.now() - start)}ms`);
    throw error;
  }
}

const SETUP_STEP_ORDER = ["welcome", "schedule", "provider", "sync", "done"] as const;

function getNextSetupState(current: SetupState, step: SetupState["currentStep"]): SetupState {
  const completedSteps = current.completedSteps.includes(step)
    ? current.completedSteps
    : [...current.completedSteps, step];
  const stepIndex = SETUP_STEP_ORDER.indexOf(step);
  const currentStep =
    SETUP_STEP_ORDER[Math.min(stepIndex + 1, SETUP_STEP_ORDER.length - 1)] ?? "done";

  return {
    currentStep,
    isComplete: currentStep === "done",
    completedSteps,
  };
}

function getCompletedSetupState(): SetupState {
  return {
    currentStep: "done",
    isComplete: true,
    completedSteps: [...SETUP_STEP_ORDER],
  };
}

const initialStartupSnapshot = readStartupAppSnapshot().snapshot;

function persistStartupSnapshot(input: {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  setupState: SetupState;
  timeFormat: TimeFormat;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  onboardingCompleted: boolean;
}): void {
  writeStartupAppSnapshot({
    ...createDefaultStartupAppSnapshot(),
    ...input,
  });
}

function persistStartupSnapshotFromStore(state: AppState): void {
  if (state.lifecycle.phase !== "ready") {
    return;
  }

  persistStartupSnapshot({
    payload: state.lifecycle.payload,
    connections: state.connections,
    setupState: state.setupState,
    timeFormat: state.timeFormat,
    autoSyncEnabled: state.autoSyncEnabled,
    autoSyncIntervalMinutes: state.autoSyncIntervalMinutes,
    onboardingCompleted: state.onboardingCompleted,
  });
}

type AppLifecycle =
  | { phase: "ready"; payload: BootstrapPayload }
  | { phase: "error"; error: string };

interface AppState {
  // Lifecycle (discriminated union — no impossible loading+error combos)
  lifecycle: AppLifecycle;
  connections: ProviderConnection[];
  syncState: SyncState;
  setupState: SetupState;
  timeFormat: TimeFormat;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  onboardingCompleted: boolean;
  /** Increments after every successful sync — use as a dependency to trigger re-fetches */
  syncVersion: number;
  /** True if the last sync was triggered manually by the user */
  lastSyncWasManual: boolean;
  syncLogOpen: boolean;
  setupAssistMode: "none" | "connection";

  // Actions
  bootstrap: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  /** manual=true (default) fires a toast on completion; manual=false (auto-poll) is silent */
  startSync: (manual?: boolean) => Promise<void>;
  refreshSetupState: () => Promise<void>;
  setSetupState: (next: SetupState) => Promise<void>;
  completeSetupStep: (step: SetupState["currentStep"]) => Promise<void>;
  markSetupComplete: () => Promise<void>;
  clearSetupState: () => Promise<void>;
  setTimeFormat: (format: TimeFormat) => void;
  /** Persist auto-sync preferences to SQLite and update the store */
  setAutoSyncPrefs: (enabled: boolean, intervalMinutes: number) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  setSyncLogOpen: (open: boolean) => void;
  requestSetupAssist: (mode: "connection") => void;
  clearSetupAssist: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  lifecycle: { phase: "ready", payload: initialStartupSnapshot.payload },
  connections: initialStartupSnapshot.connections,
  syncState: { status: "idle", log: [] },
  setupState: initialStartupSnapshot.setupState,
  timeFormat: initialStartupSnapshot.timeFormat,
  autoSyncEnabled: initialStartupSnapshot.autoSyncEnabled,
  autoSyncIntervalMinutes: initialStartupSnapshot.autoSyncIntervalMinutes,
  onboardingCompleted: initialStartupSnapshot.onboardingCompleted,
  syncVersion: 0,
  lastSyncWasManual: true,
  syncLogOpen: false,
  setupAssistMode: "none",

  bootstrap: async () => {
    const bootstrapStart = performance.now();
    logStoreBoot("bootstrap started");

    try {
      let [payload, connections, setupState, preferences] = await Promise.all([
        timedStoreCall("bootstrap_dashboard", () => loadBootstrapPayload()),
        timedStoreCall("list_gitlab_connections", () => listGitLabConnections()),
        timedStoreCall("load_setup_state", () => loadSetupState()),
        timedStoreCall("load_app_preferences", () => loadAppPreferences()),
      ]);

      if (!setupState.isComplete) {
        setupState = {
          currentStep: "welcome",
          isComplete: false,
          completedSteps: [],
        };

        void saveSetupState(setupState).catch(() => {
          // best effort; runtime state remains normalized to welcome
        });
      }

      const detectedHolidayCountryCode = getCountryCodeForTimezone(payload.schedule.timezone);
      const shouldSyncAutoHolidayCountry =
        normalizeHolidayCountryMode(preferences.holidayCountryMode) === "auto" &&
        detectedHolidayCountryCode != null &&
        preferences.holidayCountryCode !== detectedHolidayCountryCode;

      if (shouldSyncAutoHolidayCountry) {
        preferences = await timedStoreCall("save_app_preferences(auto-holiday)", () =>
          saveAppPreferencesCached({
            ...preferences,
            holidayCountryMode: "auto",
            holidayCountryCode: detectedHolidayCountryCode,
          }),
        );
        payload = await timedStoreCall("bootstrap_dashboard(auto-holiday-refresh)", () =>
          loadBootstrapPayload(),
        );
      }

      if (!preferences.notificationPermissionRequested) {
        try {
          await requestNotificationPermission();
        } catch {
          // best effort: some desktop targets do not support interactive prompts
        }

        const nextPreferences = {
          ...preferences,
          notificationPermissionRequested: true,
        };

        try {
          preferences = await timedStoreCall("save_app_preferences(notification-permission)", () =>
            saveAppPreferencesCached(nextPreferences),
          );
        } catch {
          preferences = nextPreferences;
        }
      }

      set({
        lifecycle: { phase: "ready", payload },
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      persistStartupSnapshot({
        payload,
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      syncStartupPrefsWithPreferences(preferences);
      primeAppPreferencesCache(preferences);
      syncTrayIcon(payload);
      logStoreBoot(`bootstrap finished in ${Math.round(performance.now() - bootstrapStart)}ms`);
    } catch (err) {
      logStoreBoot(`bootstrap failed in ${Math.round(performance.now() - bootstrapStart)}ms`);
      if (get().lifecycle.phase !== "ready") {
        set({ lifecycle: { phase: "error", error: String(err) } });
      }
    }
  },

  refreshConnections: async () => {
    const next = await listGitLabConnections();
    set({ connections: next });
    persistStartupSnapshotFromStore(get());
  },

  refreshPayload: async () => {
    const [payload, connections, setupState] = await Promise.all([
      loadBootstrapPayload(),
      listGitLabConnections(),
      loadSetupState(),
    ]);
    set({ lifecycle: { phase: "ready", payload }, connections, setupState });
    persistStartupSnapshotFromStore(get());
    syncTrayIcon(payload);
  },

  refreshSetupState: async () => {
    const setupState = await loadSetupState();
    set({ setupState });
    persistStartupSnapshotFromStore(get());
  },

  setSetupState: async (next) => {
    const persisted = await saveSetupState(next);
    set({ setupState: persisted });
    persistStartupSnapshotFromStore(get());
  },

  completeSetupStep: async (step) => {
    const current = get().setupState;
    const next = getNextSetupState(current, step);
    set({ setupState: next });

    const persisted = await saveSetupState(next);
    set({ setupState: persisted });
    persistStartupSnapshotFromStore(get());
  },

  markSetupComplete: async () => {
    const current = get().setupState;
    if (!current.completedSteps.includes("schedule")) {
      return;
    }
    const next = getCompletedSetupState();
    set({ setupState: next });

    const persisted = await saveSetupState(next);
    set({ setupState: persisted });
    persistStartupSnapshotFromStore(get());
  },

  clearSetupState: async () => {
    clearStartupAppSnapshot();
    const persisted = await saveSetupState({
      currentStep: "welcome",
      isComplete: false,
      completedSteps: [],
    });
    set({ setupState: persisted });
    persistStartupSnapshotFromStore(get());
  },

  setTimeFormat: (format) => {
    set({ timeFormat: format });
    persistStartupSnapshotFromStore(get());
  },

  setSyncLogOpen: (open) => set({ syncLogOpen: open }),

  markOnboardingComplete: async () => {
    set({ onboardingCompleted: true });
    persistStartupSnapshotFromStore(get());
    try {
      const currentPreferences = await getAppPreferencesCached();
      await saveAppPreferencesCached({
        ...currentPreferences,
        onboardingCompleted: true,
      });
    } catch {
      // Best effort; keep the current session closed even if persistence fails.
    }
  },

  requestSetupAssist: (mode) => set({ setupAssistMode: mode }),

  clearSetupAssist: () => set({ setupAssistMode: "none" }),

  setAutoSyncPrefs: async (enabled, intervalMinutes) => {
    set({ autoSyncEnabled: enabled, autoSyncIntervalMinutes: intervalMinutes });
    persistStartupSnapshotFromStore(get());
    try {
      const { timeFormat } = get();
      const currentPreferences = await getAppPreferencesCached();
      await saveAppPreferencesCached({
        ...currentPreferences,
        timeFormat,
        autoSyncEnabled: enabled,
        autoSyncIntervalMinutes: intervalMinutes,
      });
    } catch {
      // best-effort — store already updated optimistically
    }
  },

  startSync: async (manual = true) => {
    const { syncState, refreshPayload } = get();
    if (syncState.status === "syncing") return;

    set({ syncState: { status: "syncing", log: [] }, lastSyncWasManual: manual });

    let unlisten = () => {};

    try {
      unlisten = await listenSyncProgress((line) => {
        const current = get().syncState;
        set({ syncState: { ...current, log: [...current.log, line] } });
      });
    } catch (err) {
      const message = String(err);
      const current = get().syncState;
      set({
        syncState: {
          ...current,
          log: [...current.log, `WARN: ${message}`],
        },
      });
    }

    try {
      const result = await syncGitLab();
      const current = get().syncState;
      set({
        syncState: {
          status: "done",
          result,
          log: [
            ...current.log,
            `Synced ${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues.`,
          ],
        },
      });
      await refreshPayload();
      // Increment syncVersion so any component with it as a dep will re-fetch
      set((s) => ({ syncVersion: s.syncVersion + 1 }));
    } catch (err) {
      const message = String(err);
      const current = get().syncState;
      set({
        syncState: {
          status: "error",
          error: message,
          log: [...current.log, `ERROR: ${message}`],
        },
      });
    } finally {
      unlisten();
    }
  },
}));
