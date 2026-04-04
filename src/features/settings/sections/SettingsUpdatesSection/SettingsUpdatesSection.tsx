import Download from "lucide-react/dist/esm/icons/download.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  formatByteProgress,
  parseUpdateDate,
} from "@/features/settings/lib/settings-update-helpers";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Button } from "@/shared/ui/Button/Button";
import { Label } from "@/shared/ui/Label/Label";

import type { UpdateSectionState } from "@/features/settings/lib/settings-summary-labels";
import type { AppUpdateChannel } from "@/shared/types/dashboard";

const UPDATE_CHANNEL_OPTIONS = [
  "stable",
  "unstable",
] as const satisfies readonly AppUpdateChannel[];

export interface SettingsUpdatesSectionProps {
  updatesSummary: string;
  installedVersion: string;
  releaseChannelLabel: string;
  selectedChannel: AppUpdateChannel;
  status: UpdateSectionState;
  onChangeChannel: (channel: AppUpdateChannel) => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onRestartToUpdate: () => void;
}

export function SettingsUpdatesSection({
  updatesSummary,
  installedVersion,
  releaseChannelLabel,
  selectedChannel,
  status,
  onChangeChannel,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
}: Readonly<SettingsUpdatesSectionProps>) {
  const { formatDateLong, t } = useI18n();
  const update =
    status.status === "available" ||
    status.status === "installing" ||
    status.status === "readyToRestart"
      ? status.update
      : null;
  const publishedDate = parseUpdateDate(update?.date);
  const progressLabel =
    status.status === "installing"
      ? formatByteProgress(status.downloadedBytes, status.totalBytes)
      : null;
  const progressPercent =
    status.status === "installing" && status.totalBytes && status.totalBytes > 0
      ? Math.min(100, (status.downloadedBytes / status.totalBytes) * 100)
      : null;
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.updates")}
        icon={Download}
        summary={updatesSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-border-subtle bg-field p-4 shadow-clay-inset">
            <p className="font-display text-sm font-semibold text-foreground">
              {t("settings.updatesOverviewTitle")}
            </p>

            <div className="mt-4 space-y-3 border-t-2 border-border-subtle pt-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("settings.updatesInstalledVersion")}
                </p>
                <p className="shrink-0 text-right font-display text-base font-semibold text-foreground">
                  v{installedVersion}
                </p>
              </div>

              <div className="border-t-2 border-border-subtle" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("settings.updatesReleaseChannel")}
                </p>
                <p className="max-w-44 shrink-0 text-right font-display text-base font-semibold text-foreground">
                  {releaseChannelLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("settings.updatesDescription")}</p>

            <div className="space-y-1.5">
              <Label>{t("settings.updatesChannel")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {UPDATE_CHANNEL_OPTIONS.map((option) => {
                  const active = selectedChannel === option;
                  const label =
                    option === "stable"
                      ? t("settings.updatesChannelStable")
                      : t("settings.updatesChannelUnstable");

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChangeChannel(option)}
                      className={getChoiceButtonClassName(active, "justify-start text-left")}
                    >
                      <span className="text-sm font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.updatesChannelHint")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(status.status === "idle" ||
                status.status === "checking" ||
                status.status === "upToDate" ||
                status.status === "error") && (
                <Button onClick={onCheckForUpdates} disabled={status.status === "checking"}>
                  <RefreshCw
                    className={cn(
                      "mr-1.5 h-3.5 w-3.5",
                      status.status === "checking" && "animate-spin",
                    )}
                  />
                  {status.status === "checking"
                    ? t("settings.updatesChecking")
                    : t("settings.updatesCheck")}
                </Button>
              )}

              {status.status === "available" && (
                <Button onClick={onInstallUpdate}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.updatesInstall")}
                </Button>
              )}

              {status.status === "installing" && (
                <Button disabled>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {t("settings.updatesInstalling")}
                </Button>
              )}

              {status.status === "readyToRestart" && (
                <Button onClick={onRestartToUpdate}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.updatesRestart")}
                </Button>
              )}
            </div>

            {status.status === "installing" ? (
              <div className="space-y-2 rounded-xl border-2 border-primary/20 bg-primary/8 p-3">
                <div className="h-2 overflow-hidden rounded-full border border-primary/20 bg-white/55">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progressPercent ?? 18}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progressLabel
                    ? t("settings.updatesDownloadProgress", { progress: progressLabel })
                    : t("settings.updatesUnknownProgress")}
                </p>
              </div>
            ) : null}

            {publishedDate ? (
              <p className="text-xs text-muted-foreground">
                {t("settings.updatesPublishedOn", { date: formatDateLong(publishedDate) })}
              </p>
            ) : null}

            {update?.body ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("settings.updatesReleaseNotes")}
                </p>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{update.body}</p>
              </div>
            ) : null}
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
