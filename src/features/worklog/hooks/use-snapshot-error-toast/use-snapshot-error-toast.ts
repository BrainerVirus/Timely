import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/core/services/I18nService/i18n";

type DisplayModeKey = "day" | "week" | "period";

interface UseSnapshotErrorToastParams {
  status: "idle" | "ready" | "error";
  requestKey: string | null;
  normalizedError: string | null;
  displayMode: DisplayModeKey;
}

/**
 * Shows a toast when snapshot load fails. Skips the first error for week/period
 * modes to avoid flashing a toast before the UI has rendered.
 */
export function useSnapshotErrorToast({
  status,
  requestKey,
  normalizedError,
  displayMode,
}: UseSnapshotErrorToastParams): void {
  const { t } = useI18n();
  const lastShownErrorRef = useRef<string | null>(null);
  const hasSkippedInitialErrorRef = useRef<Record<DisplayModeKey, boolean>>({
    day: false,
    week: false,
    period: false,
  });

  useEffect(() => {
    if (status !== "error" || !normalizedError) {
      lastShownErrorRef.current = null;
      return;
    }

    const toastKey = `${requestKey ?? "none"}:${normalizedError}`;

    if (
      (displayMode === "week" || displayMode === "period") &&
      hasSkippedInitialErrorRef.current[displayMode] === false
    ) {
      hasSkippedInitialErrorRef.current[displayMode] = true;
      return;
    }

    if (lastShownErrorRef.current === toastKey) {
      return;
    }

    lastShownErrorRef.current = toastKey;
    toast.error(t("worklog.failedToLoadTitle"), {
      description: normalizedError,
      duration: 7000,
    });
  }, [displayMode, normalizedError, requestKey, status, t]);
}
