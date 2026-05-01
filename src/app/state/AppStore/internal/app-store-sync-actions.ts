import { listenSyncProgress, syncProviders } from "@/app/desktop/TauriService/tauri";
import {
  createSyncToastUsage,
  getAutoSyncDelayMessage,
  getSyncDelayMessage,
  SYNC_BACKOFF_MS,
} from "@/app/state/AppStore/internal/sync-progress-messages";

import type { AppStoreGet, AppStoreSet } from "@/app/state/AppStore/internal/app-store-types";

export function createStartSyncAction(set: AppStoreSet, get: AppStoreGet) {
  return async (manual = true) => {
    const { syncState, refreshPayload } = get();
    if (syncState.status === "syncing") return;

    const isManual = manual;
    set({ syncState: { status: "syncing", log: [] }, lastSyncWasManual: isManual });

    // Detect which provider is currently active from the live log stream
    let currentProvider: "gitlab" | "youtrack" | null = null;

    // ── Auto-sync: single gentle warning at 90s (no spam) ──────────────
    if (!isManual) {
      let autoToastFired = false;
      const autoTimer = setTimeout(() => {
        if (get().syncState.status !== "syncing" || autoToastFired) return;
        autoToastFired = true;
        import("sonner").then(({ toast }) => {
          toast.warning(getAutoSyncDelayMessage(currentProvider), { duration: 8000 });
        });
      }, 90_000);

      const cleanup = () => clearTimeout(autoTimer);
      let unlisten = () => {};
      try {
        unlisten = await listenSyncProgress((line) => {
          const current = get().syncState;
          if (line.includes("Starting GitLab sync")) currentProvider = "gitlab";
          else if (line.includes("Starting YouTrack sync")) currentProvider = "youtrack";
          set({ syncState: { ...current, log: [...current.log, line] } });
        });
      } catch {}
      try {
        const result = await syncProviders();
        cleanup();
        const current = get().syncState;
        set({
          syncState: {
            status: "done",
            result,
            log: [
              ...current.log,
              `Synced ${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues, ${result.assignedIssuesSynced} assigned.`,
            ],
          },
        });
        await refreshPayload();
      } catch (error) {
        cleanup();
        const message = String(error);
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
      return;
    }

    // ── Manual sync: recurring toasts with exponential backoff ────────────
    let toastIndex = 0;
    const syncToastUsage = createSyncToastUsage();

    const showNextToast = () => {
      import("sonner").then(({ toast }) => {
        toast.warning(getSyncDelayMessage(currentProvider, syncToastUsage), { duration: 12000 });
      });
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = (idx: number) => {
      if (idx >= SYNC_BACKOFF_MS.length) return;
      timerId = setTimeout(() => {
        if (get().syncState.status !== "syncing") return;
        showNextToast();
        toastIndex++;
        scheduleNext(toastIndex);
      }, SYNC_BACKOFF_MS[idx]);
    };
    scheduleNext(0); // first at 30s

    let unlisten = () => {};
    try {
      unlisten = await listenSyncProgress((line) => {
        const current = get().syncState;
        if (line.includes("Starting GitLab sync")) currentProvider = "gitlab";
        else if (line.includes("Starting YouTrack sync")) currentProvider = "youtrack";
        set({ syncState: { ...current, log: [...current.log, line] } });
      });
    } catch (error) {
      const message = String(error);
      const current = get().syncState;
      set({ syncState: { ...current, log: [...current.log, `WARN: ${message}`] } });
    }

    try {
      const result = await syncProviders();
      if (timerId != null) {
        clearTimeout(timerId);
      }
      const current = get().syncState;
      set({
        syncState: {
          status: "done",
          result,
          log: [
            ...current.log,
            `Synced ${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues, ${result.assignedIssuesSynced} assigned.`,
          ],
        },
      });
      await refreshPayload();
    } catch (error) {
      if (timerId != null) {
        clearTimeout(timerId);
      }
      const message = String(error);
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
  };
}
