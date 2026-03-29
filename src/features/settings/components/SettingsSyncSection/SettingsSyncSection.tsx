import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Repeat from "lucide-react/dist/esm/icons/repeat.js";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text.js";
import { AnimatePresence, m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Button } from "@/shared/components/Button/Button";
import { Label } from "@/shared/components/Label/Label";
import { staggerItem } from "@/shared/utils/animations";
import { getSegmentedControlClassName } from "@/shared/utils/control-styles";
import { cn } from "@/shared/utils/utils";

import type { SyncState } from "@/shared/types/dashboard";

const SYNC_INTERVAL_OPTIONS = [15, 30, 60, 120, 240] as const;

export interface SettingsSyncSectionProps {
  syncSummary: string;
  syncState: SyncState;
  syncing: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  formatSyncIntervalLabel: (minutes: number) => string;
  onStartSync: () => void;
  onToggleAutoSync: () => void;
  onSetAutoSyncInterval: (minutes: number) => void;
  onOpenLog: () => void;
}

export function SettingsSyncSection({
  syncSummary,
  syncState,
  syncing,
  autoSyncEnabled,
  autoSyncIntervalMinutes,
  formatSyncIntervalLabel,
  onStartSync,
  onToggleAutoSync,
  onSetAutoSyncInterval,
  onOpenLog,
}: Readonly<SettingsSyncSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const intervalControls = (
    <div className="space-y-1.5">
      <Label>{t("settings.syncInterval")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {SYNC_INTERVAL_OPTIONS.map((minutes) => {
          const active = autoSyncIntervalMinutes === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => onSetAutoSyncInterval(minutes)}
              className={getSegmentedControlClassName(active, "min-w-20 text-xs")}
            >
              {formatSyncIntervalLabel(minutes)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const showIntervalControls = allowDecorativeAnimation ? false : autoSyncEnabled;

  let renderedIntervalControls: React.ReactNode;
  if (allowDecorativeAnimation) {
    renderedIntervalControls = (
      <AnimatePresence initial={false}>
        {autoSyncEnabled && (
          <m.div
            key="interval-chips"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {intervalControls}
          </m.div>
        )}
      </AnimatePresence>
    );
  } else if (showIntervalControls) {
    renderedIntervalControls = intervalControls;
  } else {
    renderedIntervalControls = null;
  }

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.sync")}
        icon={Repeat}
        summary={syncSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("settings.syncNow")}</p>
              <p className="text-xs text-muted-foreground">
                {syncState.status === "done"
                  ? t("settings.lastSyncEntries", { count: syncState.result.entriesSynced })
                  : t("settings.pullLatest")}
              </p>
            </div>
            <Button onClick={onStartSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {syncing ? t("common.syncing") : t("settings.syncNow")}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("settings.autoSync")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.autoSyncDescription")}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoSyncEnabled}
                aria-label={t("settings.autoSync")}
                onClick={onToggleAutoSync}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                  autoSyncEnabled
                    ? "border-primary/30 bg-primary"
                    : "border-border-subtle bg-field",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    autoSyncEnabled ? "translate-x-5.5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {renderedIntervalControls}
          </div>

          {syncState.log.length > 0 && !syncing ? (
            <div className="border-t-2 border-border pt-3">
              <Button variant="ghost" onClick={onOpenLog}>
                <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                {t("common.viewLog")}
              </Button>
            </div>
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}
