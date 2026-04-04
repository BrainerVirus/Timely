import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import CircleX from "lucide-react/dist/esm/icons/circle-x.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { memo } from "react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { useTrayPanelController } from "@/features/tray/ui/TrayPanel/internal/use-tray-panel-controller";
import { Button } from "@/shared/ui/Button/Button";
import { PagerControl } from "@/shared/ui/PagerControl/PagerControl";

import type { TrayStatus } from "@/features/tray/ui/TrayPanel/internal/use-tray-panel-controller";
import type { BootstrapPayload } from "@/shared/types/dashboard";

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

export function TrayPanel({ payload, onClose, onActivated }: Readonly<TrayPanelProps>) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const {
    selectedDay,
    status,
    pagerBusy,
    pagerLabel,
    handleOpen,
    handleSync,
    handlePreviousDay,
    handleCurrentDay,
    handleNextDay,
  } = useTrayPanelController({
    payload,
    onClose,
    onActivated,
  });

  const progressLabel = `${fh(selectedDay.loggedHours)} / ${fh(selectedDay.targetHours)}`;

  return (
    <main className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-panel text-foreground">
      <div
        aria-hidden="true"
        className={
          allowDecorativeAnimation
            ? "pointer-events-none absolute inset-x-10 top-0 h-20 rounded-full bg-primary/10 blur-3xl"
            : "hidden"
        }
      />
      <div
        aria-hidden="true"
        className={
          allowDecorativeAnimation
            ? "pointer-events-none absolute right-0 bottom-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl"
            : "hidden"
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
        <header className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[1.15rem] font-semibold tracking-tight text-foreground">
            {t("worklog.daySummary")}
          </h1>
          <PagerControl
            label={pagerLabel}
            onPrevious={handlePreviousDay}
            onCurrent={handleCurrentDay}
            onNext={handleNextDay}
            disabled={pagerBusy}
            compact
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="rounded-2xl border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
            <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {t("worklog.logged")} / {t("worklog.target")}
            </p>
            <p className="mt-3 font-display text-[2rem] leading-none font-semibold tracking-tight text-foreground">
              {progressLabel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("worklog.loggedNote")}</p>
          </div>

          <TrayActionRow onOpen={handleOpen} onSync={handleSync} status={status} />
        </div>
      </div>
    </main>
  );
}

const TrayActionRow = memo(function TrayActionRow({
  status,
  onSync,
  onOpen,
}: {
  status: TrayStatus;
  onSync: () => Promise<void>;
  onOpen: () => Promise<void>;
}) {
  const { t } = useI18n();
  const syncing = status === "syncing";

  const getSyncIcon = () => {
    if (status === "success") {
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    }
    if (status === "error") {
      return <CircleX className="h-3.5 w-3.5" />;
    }
    if (syncing) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }
    return <RefreshCw className="h-3.5 w-3.5" />;
  };

  const getSyncLabel = () => {
    if (status === "success") {
      return t("sync.done");
    }
    if (status === "error") {
      return t("tray.syncFailed");
    }
    if (syncing) {
      return t("common.syncing");
    }
    return t("common.sync");
  };

  const syncIcon = getSyncIcon();
  const syncLabel = getSyncLabel();

  return (
    <div className="mt-1">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => void onSync()}
          disabled={syncing}
          variant="primary"
          size="sm"
          className="w-full gap-1.5 rounded-xl"
        >
          {syncIcon}
          {syncLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 rounded-xl"
          type="button"
          onClick={() => void onOpen()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("common.open")}
        </Button>
      </div>
    </div>
  );
});
