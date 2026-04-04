import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text.js";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { SyncLogPanel } from "@/domains/gitlab-connection/ui/ProviderSyncCard/internal/SyncLogPanel/SyncLogPanel";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";

import type { BootstrapPayload, SyncState } from "@/shared/types/dashboard";

export function ProviderSyncCard({
  payload,
  syncState,
  syncing,
  onStartSync,
  onViewLog,
  showManualSyncButton = true,
}: Readonly<{
  payload: BootstrapPayload;
  syncState: SyncState;
  syncing: boolean;
  onStartSync: () => Promise<void>;
  onViewLog?: () => void;
  /** When false, hides Sync now (e.g. setup wizard triggers sync automatically). */
  showManualSyncButton?: boolean;
}>) {
  const { t } = useI18n();
  const shouldShowLog = syncing || syncState.log.length > 0;
  const hasLog = syncState.log.length > 0;
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (syncState.status !== "error") {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === syncState.error) {
      return;
    }

    lastErrorRef.current = syncState.error;
    toast.error(t("sync.toastFailedTitle"), {
      description: syncState.error,
      duration: 8000,
    });
  }, [syncState, t]);

  return (
    <Card>
      <div className="space-y-3">
        <div
          className={
            showManualSyncButton ? "flex items-center justify-between" : "flex flex-col gap-1"
          }
        >
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("settings.providerSync")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {payload.demoMode ? t("setup.syncDescriptionConnected") : t("settings.pullLatest")}
            </p>
          </div>
          {showManualSyncButton ? (
            <div className="flex items-center gap-2">
              {hasLog && onViewLog && !syncing && (
                <Button variant="ghost" onClick={onViewLog}>
                  <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                  {t("common.viewLog")}
                </Button>
              )}
              <Button onClick={onStartSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {syncing ? t("common.syncing") : t("settings.syncNow")}
              </Button>
            </div>
          ) : null}
        </div>

        {shouldShowLog ? <SyncLogPanel log={syncState.log} syncing={syncing} /> : null}

        {syncState.status === "done" ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-success/35 bg-success/8 p-3 text-sm shadow-clay">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="text-foreground">
              {t("sync.toastCompleteDescription", {
                projects: syncState.result.projectsSynced,
                entries: syncState.result.entriesSynced,
                issues: syncState.result.issuesSynced,
              })}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
