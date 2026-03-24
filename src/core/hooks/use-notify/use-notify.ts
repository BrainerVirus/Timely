import { toast } from "sonner";
import { useI18n } from "@/core/services/I18nService/i18n";

import type { SyncResult } from "@/shared/types/dashboard";

export function useNotify() {
  const { t } = useI18n();

  return {
    success(title: string, description?: string) {
      toast.success(title, { description, duration: 4000 });
    },

    error(title: string, description?: string, opts?: { retry?: () => void }) {
      toast.error(title, {
        description,
        duration: 8000,
        action: opts?.retry ? { label: t("common.retry"), onClick: opts.retry } : undefined,
      });
    },

    info(title: string, description?: string) {
      toast.info(title, { description, duration: 4000 });
    },

    syncStart(): string | number {
      return toast.loading(t("common.syncing"), {
        description: t("settings.pullLatest"),
        duration: Infinity,
      });
    },

    syncComplete(toastId: string | number, result: SyncResult) {
      toast.success(t("sync.toastCompleteTitle"), {
        id: toastId,
        description: t("sync.toastCompleteDescription", {
          projects: result.projectsSynced,
          entries: result.entriesSynced,
          issues: result.issuesSynced,
        }),
        duration: 5000,
      });
    },

    syncFailed(toastId: string | number, error: string) {
      toast.error(t("sync.toastFailedTitle"), {
        id: toastId,
        description: error,
        duration: 8000,
      });
    },
  };
}
