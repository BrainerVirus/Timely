import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { useEffect, useRef } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { ProviderSyncCard } from "@/domains/gitlab-connection/ui/ProviderSyncCard/ProviderSyncCard";
import { Button } from "@/shared/ui/Button/Button";

import type { BootstrapPayload, SyncState } from "@/shared/types/dashboard";

interface SetupSyncPageProps {
  payload: BootstrapPayload;
  syncState: SyncState;
  hasConnection: boolean;
  onBack: () => void;
  onNext: () => void;
  onStartSync: () => Promise<void>;
}

export function SetupSyncPage({
  payload,
  syncState,
  hasConnection,
  onBack,
  onNext,
  onStartSync,
}: Readonly<SetupSyncPageProps>) {
  const { t } = useI18n();
  const triggered = useRef(false);
  const syncing = syncState.status === "syncing";

  useEffect(() => {
    if (hasConnection && !triggered.current) {
      triggered.current = true;
      void onStartSync();
    }
  }, [hasConnection, onStartSync]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">{t("setup.syncTitle")}</h1>
        <p className="text-muted-foreground">
          {hasConnection
            ? t("setup.syncDescriptionConnected")
            : t("setup.syncDescriptionDisconnected")}
        </p>
      </div>

      {hasConnection ? (
        <ProviderSyncCard
          payload={payload}
          syncState={syncState}
          syncing={syncing}
          onStartSync={onStartSync}
          showManualSyncButton={false}
        />
      ) : (
        <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-border-subtle bg-panel p-8 shadow-clay">
          <RefreshCw className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("setup.noProviderYet")}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button onClick={onNext} disabled={syncing} className="w-full">
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.syncing")}
            </>
          ) : (
            t("setup.continueButton")
          )}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}
