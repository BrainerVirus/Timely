import { listenSyncProgress, syncProviders } from "@/app/desktop/TauriService/tauri";
import {
  createSyncToastUsage,
  getAutoSyncDelayMessage,
  getSyncDelayMessage,
  SYNC_BACKOFF_MS,
} from "@/app/state/AppStore/internal/sync-progress-messages";

import type { AppStoreGet, AppStoreSet } from "@/app/state/AppStore/internal/app-store-types";
import type { ProviderSyncOutcome, SyncResult } from "@/shared/types/dashboard";

export function formatSyncResultSummary(result: SyncResult): string {
  const countSummary = [
    `${result.projectsSynced} projects`,
    `${result.entriesSynced} entries`,
    `${result.issuesSynced} issues`,
    `${result.assignedIssuesSynced} assigned`,
  ].join(", ");
  if (result.status === "partial") {
    const failed = result.providers
      .filter((provider) => provider.status !== "success")
      .map((provider) => formatProviderLabel(provider.provider));
    return `Partially synced ${countSummary}. ${failed.join(", ")} needs attention.`;
  }

  return `Synced ${countSummary}.`;
}

export function formatSyncFailureSummary(result: SyncResult): string {
  const failed = result.providers.filter((provider) => provider.status !== "success");
  if (failed.length === 0) {
    return "Sync failed before any provider completed.";
  }
  return `Sync could not complete. ${failed.map(formatProviderFailure).join(" ")}`;
}

function formatProviderFailure(provider: ProviderSyncOutcome): string {
  const label = formatProviderLabel(provider.provider);
  switch (provider.status) {
    case "retryable_network":
      return `${label} could not be reached. Try again when the connection is stable.`;
    case "auth_or_config":
      return `${label} needs sign-in or connection settings to be checked.`;
    case "provider_failed":
      return `${label} reported an error during sync.`;
    case "unknown_provider_error":
      return `${label} stopped for an unexpected reason.`;
    case "success":
      return `${label} synced successfully.`;
  }
}

function formatProviderLabel(provider: string): string {
  if (provider.toLowerCase() === "gitlab") return "GitLab";
  if (provider.toLowerCase() === "youtrack") return "YouTrack";
  return "Provider";
}

function formatProviderDiagnostics(result: SyncResult): string[] {
  return result.providers
    .filter((provider) => provider.status !== "success")
    .map((provider) => {
      const label = formatProviderLabel(provider.provider);
      return `DIAGNOSTIC: ${label} ${provider.status}: ${provider.diagnostic}`;
    });
}

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
        if (result.status === "failed") {
          set({
            syncState: {
              status: "error",
              error: formatSyncFailureSummary(result),
              log: [
                ...current.log,
                formatSyncFailureSummary(result),
                ...formatProviderDiagnostics(result),
              ],
            },
          });
          return;
        }
        set({
          syncState: {
            status: "done",
            result,
            log: [
              ...current.log,
              formatSyncResultSummary(result),
              ...formatProviderDiagnostics(result),
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
      if (result.status === "failed") {
        set({
          syncState: {
            status: "error",
            error: formatSyncFailureSummary(result),
            log: [
              ...current.log,
              formatSyncFailureSummary(result),
              ...formatProviderDiagnostics(result),
            ],
          },
        });
        return;
      }
      set({
        syncState: {
          status: "done",
          result,
          log: [
            ...current.log,
            formatSyncResultSummary(result),
            ...formatProviderDiagnostics(result),
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
