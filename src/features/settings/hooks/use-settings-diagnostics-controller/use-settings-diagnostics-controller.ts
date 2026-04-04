import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearDiagnostics,
  exportDiagnostics,
  listDiagnostics,
  openSystemNotificationSettings,
  sendTestNotification,
} from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";

import type { DiagnosticLogEntry } from "@/shared/types/dashboard";

type TranslateFn = ReturnType<typeof useI18n>["t"];

export function normalizeDiagnosticsFeatureFilter(
  diagnosticsFeatureFilter: string,
): string | undefined {
  return diagnosticsFeatureFilter === "all" ? undefined : diagnosticsFeatureFilter;
}

interface UseSettingsDiagnosticsControllerOptions {
  notificationPermission: string;
  t: TranslateFn;
}

export function useSettingsDiagnosticsController({
  notificationPermission,
  t,
}: UseSettingsDiagnosticsControllerOptions) {
  const [notificationDiagnostics, setNotificationDiagnostics] = useState<DiagnosticLogEntry[]>([]);
  const [notificationDiagnosticsBusy, setNotificationDiagnosticsBusy] = useState(false);
  const [diagnosticsFeatureFilter, setDiagnosticsFeatureFilter] = useState("all");
  const diagnosticsFeatureFilterValue = normalizeDiagnosticsFeatureFilter(diagnosticsFeatureFilter);

  async function refreshNotificationDiagnostics() {
    setNotificationDiagnosticsBusy(true);
    try {
      const next = await listDiagnostics({ feature: diagnosticsFeatureFilterValue });
      setNotificationDiagnostics(next);
    } catch {
      setNotificationDiagnostics([]);
    } finally {
      setNotificationDiagnosticsBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setNotificationDiagnosticsBusy(true);
    void listDiagnostics({ feature: diagnosticsFeatureFilterValue })
      .then((next) => {
        if (!cancelled) {
          setNotificationDiagnostics(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotificationDiagnostics([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNotificationDiagnosticsBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [diagnosticsFeatureFilterValue]);

  async function handleClearNotificationDiagnostics() {
    setNotificationDiagnosticsBusy(true);
    try {
      await clearDiagnostics(diagnosticsFeatureFilterValue);
      setNotificationDiagnostics([]);
      toast.success(t("settings.remindersDiagnosticsCleared"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsClearFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    } finally {
      setNotificationDiagnosticsBusy(false);
    }
  }

  async function handleCopyNotificationDiagnostics() {
    try {
      const report = await exportDiagnostics({
        feature: diagnosticsFeatureFilterValue,
      });
      await navigator.clipboard.writeText(report);
      toast.success(t("settings.remindersDiagnosticsCopied"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsCopyFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleExportNotificationDiagnostics() {
    try {
      const report = await exportDiagnostics({
        feature: diagnosticsFeatureFilterValue,
      });
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const scope = diagnosticsFeatureFilter === "all" ? "all" : diagnosticsFeatureFilter;
      anchor.download = `timely-diagnostics-${scope}-${new Date().toISOString().slice(0, 10)}.log`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.remindersDiagnosticsExported"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsExportFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleOpenNotificationSystemSettings() {
    try {
      await openSystemNotificationSettings();
      toast.success(t("settings.remindersOpenSystemSettingsSuccess"));
    } catch (error) {
      toast.error(t("settings.remindersOpenSystemSettingsFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleSendTestNotification() {
    if (notificationPermission === "denied") {
      toast.error(t("settings.remindersTestFailed"), {
        description: t("settings.remindersPermissionDeniedCannotSend"),
        duration: 5000,
      });
      return;
    }

    try {
      await sendTestNotification({
        title: t("settings.remindersTestTitle"),
        body: t("settings.remindersTestBody"),
      });
      toast.success(t("settings.remindersTestSent"));
      void refreshNotificationDiagnostics();
    } catch (error) {
      toast.error(t("settings.remindersTestFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
      void refreshNotificationDiagnostics();
    }
  }

  return {
    notificationDiagnostics,
    notificationDiagnosticsBusy,
    diagnosticsFeatureFilter,
    handleRefreshNotificationDiagnostics: () => void refreshNotificationDiagnostics(),
    handleDiagnosticsFeatureFilterChange: setDiagnosticsFeatureFilter,
    handleClearNotificationDiagnostics,
    handleCopyNotificationDiagnostics,
    handleExportNotificationDiagnostics,
    handleOpenNotificationSystemSettings,
    handleSendTestNotification,
  };
}
