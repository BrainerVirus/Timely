import { toast } from "sonner";

import type { SyncResult } from "@/types/dashboard";

const notifyApi = {
  success(title: string, description?: string) {
    toast.success(title, { description, duration: 4000 });
  },

  error(title: string, description?: string, opts?: { retry?: () => void }) {
    toast.error(title, {
      description,
      duration: 8000,
      action: opts?.retry ? { label: "Retry", onClick: opts.retry } : undefined,
    });
  },

  info(title: string, description?: string) {
    toast.info(title, { description, duration: 4000 });
  },

  syncStart(): string | number {
    return toast.loading("Syncing GitLab data...", {
      description: "Fetching projects and time entries.",
      duration: Infinity,
    });
  },

  syncComplete(toastId: string | number, result: SyncResult) {
    toast.success("Sync complete", {
      id: toastId,
      description: `${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues synced.`,
      duration: 5000,
    });
  },

  syncFailed(toastId: string | number, error: string) {
    toast.error("Sync failed", {
      id: toastId,
      description: error,
      duration: 8000,
    });
  },
};

export function useNotify() {
  return notifyApi;
}
