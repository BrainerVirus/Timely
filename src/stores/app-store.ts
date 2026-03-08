import {
  listGitLabConnections,
  listenSyncProgress,
  loadBootstrapPayload,
  syncGitLab,
  updateTrayIcon,
} from "@/lib/tauri";
import { toast } from "sonner";
import { create } from "zustand";

import type {
  BootstrapPayload,
  ProviderConnection,
  SyncState,
} from "@/types/dashboard";

function computeRemainingHours(payload: BootstrapPayload): number {
  const remaining = payload.today.targetHours - payload.today.loggedHours;
  return Math.max(remaining, 0);
}

interface AppState {
  // Data
  payload: BootstrapPayload | null;
  connections: ProviderConnection[];
  syncState: SyncState;

  // Lifecycle
  loading: boolean;
  error: string | null;

  // Actions
  bootstrap: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  startSync: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  payload: null,
  connections: [],
  syncState: { syncing: false, result: null, error: null, log: [] },
  loading: true,
  error: null,

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const [payload, connections] = await Promise.all([
        loadBootstrapPayload(),
        listGitLabConnections(),
      ]);
      set({ payload, connections, loading: false });
      updateTrayIcon(computeRemainingHours(payload));
    } catch (err) {
      set({ error: String(err), loading: false });
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
    set({ payload, connections });
    updateTrayIcon(computeRemainingHours(payload));
  },

  startSync: async () => {
    const { syncState, refreshPayload } = get();
    if (syncState.syncing) return;

    set({ syncState: { syncing: true, result: null, error: null, log: [] } });

    const unlisten = await listenSyncProgress((line) => {
      const current = get().syncState;
      set({ syncState: { ...current, log: [...current.log, line] } });
    });

    try {
      const result = await syncGitLab();
      const current = get().syncState;
      set({
        syncState: {
          syncing: false,
          result,
          error: null,
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
          syncing: false,
          result: null,
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
