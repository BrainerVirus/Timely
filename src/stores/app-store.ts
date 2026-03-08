import { toast } from "sonner";
import { create } from "zustand";
import {
  listGitLabConnections,
  listenSyncProgress,
  loadBootstrapPayload,
  syncGitLab,
  updateTrayIcon,
} from "@/lib/tauri";

import type { BootstrapPayload, ProviderConnection, SyncState } from "@/types/dashboard";

function computeRemainingHours(payload: BootstrapPayload): number {
  const remaining = payload.today.targetHours - payload.today.loggedHours;
  return Math.max(remaining, 0);
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

  // Actions
  bootstrap: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  startSync: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  lifecycle: { phase: "loading" },
  connections: [],
  syncState: { status: "idle", log: [] },

  bootstrap: async () => {
    set({ lifecycle: { phase: "loading" } });
    try {
      const [payload, connections] = await Promise.all([
        loadBootstrapPayload(),
        listGitLabConnections(),
      ]);
      set({ lifecycle: { phase: "ready", payload }, connections });
      updateTrayIcon(computeRemainingHours(payload));
    } catch (err) {
      set({ lifecycle: { phase: "error", error: String(err) } });
    }
  },

  refreshConnections: async () => {
    const next = await listGitLabConnections();
    set({ connections: next });
  },

  refreshPayload: async () => {
    const [payload, connections] = await Promise.all([
      loadBootstrapPayload(),
      listGitLabConnections(),
    ]);
    set({ lifecycle: { phase: "ready", payload }, connections });
    updateTrayIcon(computeRemainingHours(payload));
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
