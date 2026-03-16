import { create } from "zustand";
import {
  listGitLabConnections,
  listenSyncProgress,
  loadAppPreferences,
  loadSetupState,
  loadBootstrapPayload,
  saveAppPreferences,
  saveSetupState,
  syncGitLab,
  updateTrayIcon,
} from "@/lib/tauri";
import { getCountryCodeForTimezone, normalizeHolidayCountryMode } from "@/lib/utils";

import type {
  BootstrapPayload,
  ProviderConnection,
  SetupState,
  SyncState,
  TimeFormat,
} from "@/types/dashboard";

function syncTrayIcon(payload: BootstrapPayload): void {
  updateTrayIcon(payload.today.loggedHours, payload.today.targetHours);
}

type AppLifecycle =
  | { phase: "loading" }
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
  setSyncLogOpen: (open: boolean) => void;
  requestSetupAssist: (mode: "connection") => void;
  clearSetupAssist: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  lifecycle: { phase: "loading" },
  connections: [],
  syncState: { status: "idle", log: [] },
  setupState: { currentStep: "welcome", isComplete: false, completedSteps: [] },
  timeFormat: "hm" as TimeFormat,
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 30,
  syncVersion: 0,
  lastSyncWasManual: true,
  syncLogOpen: false,
  setupAssistMode: "none",

  bootstrap: async () => {
    set({ lifecycle: { phase: "loading" } });
    try {
      let [payload, connections, setupState, preferences] = await Promise.all([
        loadBootstrapPayload(),
        listGitLabConnections(),
        loadSetupState(),
        loadAppPreferences(),
      ]);

      const detectedHolidayCountryCode = getCountryCodeForTimezone(payload.schedule.timezone);
      const shouldSyncAutoHolidayCountry =
        normalizeHolidayCountryMode(preferences.holidayCountryMode) === "auto" &&
        detectedHolidayCountryCode != null &&
        preferences.holidayCountryCode !== detectedHolidayCountryCode;

      if (shouldSyncAutoHolidayCountry) {
        preferences = await saveAppPreferences({
          ...preferences,
          holidayCountryMode: "auto",
          holidayCountryCode: detectedHolidayCountryCode,
        });
        payload = await loadBootstrapPayload();
      }

      set({
        lifecycle: { phase: "ready", payload },
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
      });
      syncTrayIcon(payload);
    } catch (err) {
      set({ lifecycle: { phase: "error", error: String(err) } });
    }
  },

  refreshConnections: async () => {
    const next = await listGitLabConnections();
    set({ connections: next });
  },

  refreshPayload: async () => {
    const [payload, connections, setupState] = await Promise.all([
      loadBootstrapPayload(),
      listGitLabConnections(),
      loadSetupState(),
    ]);
    set({ lifecycle: { phase: "ready", payload }, connections, setupState });
    syncTrayIcon(payload);
  },

  refreshSetupState: async () => {
    const setupState = await loadSetupState();
    set({ setupState });
  },

  setSetupState: async (next) => {
    const persisted = await saveSetupState(next);
    set({ setupState: persisted });
  },

  completeSetupStep: async (step) => {
    const current = get().setupState;
    const completedSteps = current.completedSteps.includes(step)
      ? current.completedSteps
      : [...current.completedSteps, step];
    const order = ["welcome", "schedule", "provider", "sync", "done"] as const;
    const stepIndex = order.indexOf(step);
    const currentStep = order[Math.min(stepIndex + 1, order.length - 1)] ?? "done";
    const persisted = await saveSetupState({
      currentStep,
      isComplete: currentStep === "done",
      completedSteps,
    });
    set({ setupState: persisted });
  },

  markSetupComplete: async () => {
    const current = get().setupState;
    if (!current.completedSteps.includes("schedule")) {
      return;
    }
    const persisted = await saveSetupState({
      currentStep: "done",
      isComplete: true,
      completedSteps: ["welcome", "schedule", "provider", "sync", "done"],
    });
    set({ setupState: persisted });
  },

  clearSetupState: async () => {
    const persisted = await saveSetupState({
      currentStep: "welcome",
      isComplete: false,
      completedSteps: [],
    });
    set({ setupState: persisted });
  },

  setTimeFormat: (format) => set({ timeFormat: format }),

  setSyncLogOpen: (open) => set({ syncLogOpen: open }),

  requestSetupAssist: (mode) => set({ setupAssistMode: mode }),

  clearSetupAssist: () => set({ setupAssistMode: "none" }),

  setAutoSyncPrefs: async (enabled, intervalMinutes) => {
    set({ autoSyncEnabled: enabled, autoSyncIntervalMinutes: intervalMinutes });
    try {
      const { timeFormat } = get();
      const currentPreferences = await loadAppPreferences();
      await saveAppPreferences({
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

    const unlisten = await listenSyncProgress((line) => {
      const current = get().syncState;
      set({ syncState: { ...current, log: [...current.log, line] } });
    });

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
