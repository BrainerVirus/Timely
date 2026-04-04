import { create } from "zustand";
import {
  getAppPreferencesCached,
  saveAppPreferencesCached,
} from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { clearStartupAppSnapshot } from "@/app/bootstrap/StartupAppState/startup-app-state";
import {
  listGitLabConnections,
  loadSetupState,
  loadBootstrapPayload,
  saveSetupState,
} from "@/app/desktop/TauriService/tauri";
import {
  createBootstrapAction,
  createStartSyncAction,
} from "@/app/state/AppStore/internal/app-store-actions";
import {
  getCompletedSetupState,
  getNextSetupState,
} from "@/app/state/AppStore/internal/app-store-setup-state";
import {
  initialStartupSnapshot,
  persistStartupSnapshotFromStore,
  syncTrayIcon,
} from "@/app/state/AppStore/internal/app-store-snapshot";
import { type AppState } from "@/app/state/AppStore/internal/app-store-types";

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

  bootstrap: createBootstrapAction(set, get),

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

  startSync: createStartSyncAction(set, get),
}));
