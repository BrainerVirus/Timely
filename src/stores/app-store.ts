import { toast } from "sonner";
import { create } from "zustand";
import {
  listGitLabConnections,
  listenSyncProgress,
  loadSetupState,
  loadBootstrapPayload,
  saveSetupState,
  syncGitLab,
  updateTrayIcon,
} from "@/lib/tauri";

import type { BootstrapPayload, ProviderConnection, SetupState, SyncState } from "@/types/dashboard";

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

  // Actions
  bootstrap: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  startSync: () => Promise<void>;
  refreshSetupState: () => Promise<void>;
  setSetupState: (next: SetupState) => Promise<void>;
  completeSetupStep: (step: SetupState["currentStep"]) => Promise<void>;
  markSetupComplete: () => Promise<void>;
  clearSetupState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  lifecycle: { phase: "loading" },
  connections: [],
  syncState: { status: "idle", log: [] },
  setupState: { currentStep: "welcome", isComplete: false, completedSteps: [] },

  bootstrap: async () => {
    set({ lifecycle: { phase: "loading" } });
    try {
      const [payload, connections, setupState] = await Promise.all([
        loadBootstrapPayload(),
        listGitLabConnections(),
        loadSetupState(),
      ]);
      set({ lifecycle: { phase: "ready", payload }, connections, setupState });
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

  startSync: async () => {
    const { syncState, refreshPayload } = get();
    if (syncState.status === "syncing") return;

    set({ syncState: { status: "syncing", log: [] } });

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
      toast.success("Sync complete", {
        description: `${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues synced.`,
        duration: 5000,
      });
      await refreshPayload();
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
      toast.error("Sync failed", { description: message, duration: 8000 });
    } finally {
      unlisten();
    }
  },
}));
