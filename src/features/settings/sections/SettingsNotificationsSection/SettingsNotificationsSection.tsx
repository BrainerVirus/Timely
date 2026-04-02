import Bell from "lucide-react/dist/esm/icons/bell.js";
import MonitorCog from "lucide-react/dist/esm/icons/monitor-cog.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Button } from "@/shared/ui/Button/Button";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";

import type { I18nContextValue } from "@/app/providers/I18nService/i18n";
import type { NotificationThresholdToggles } from "@/shared/types/dashboard";

export interface SettingsNotificationsSectionProps {
  remindersSummary: string;
  notificationsEnabled: boolean;
  notificationThresholds: NotificationThresholdToggles;
  notificationPermission: string;
  onToggleNotificationsEnabled: () => void;
  onToggleThreshold: (key: keyof NotificationThresholdToggles, enabled: boolean) => void;
  onOpenSystemSettings?: () => void;
  onSendTest: () => void;
}

function permissionDescription(code: string, t: I18nContextValue["t"]): string {
  switch (code) {
    case "granted":
      return t("settings.remindersPermissionGranted");
    case "denied":
      return t("settings.remindersPermissionDenied");
    case "prompt":
    case "prompt-with-rationale":
      return t("settings.remindersPermissionPrompt");
    default:
      return t("settings.remindersPermissionUnknown");
  }
}

function permissionDescriptionToneClass(code: string): string {
  if (code === "granted") {
    return "text-success";
  }
  if (code === "denied") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

export function SettingsNotificationsSection({
  remindersSummary,
  notificationsEnabled,
  notificationThresholds,
  notificationPermission,
  onToggleNotificationsEnabled,
  onToggleThreshold,
  onOpenSystemSettings = () => {},
  onSendTest,
}: Readonly<SettingsNotificationsSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  const thresholdRows: { key: keyof NotificationThresholdToggles; minutes: number }[] = [
    { key: "minutes45", minutes: 45 },
    { key: "minutes30", minutes: 30 },
    { key: "minutes15", minutes: 15 },
    { key: "minutes5", minutes: 5 },
  ];

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.remindersSection")}
        icon={Bell}
        summary={remindersSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t("settings.remindersMaster")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.remindersMasterDescription")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label={t("settings.remindersMaster")}
              onClick={onToggleNotificationsEnabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                notificationsEnabled
                  ? "border-primary/30 bg-primary"
                  : "border-border-subtle bg-field",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  notificationsEnabled ? "translate-x-5.5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {t("settings.remindersBeforeShiftEnd")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {thresholdRows.map((row) => {
                const on = notificationThresholds[row.key];
                return (
                  <button
                    key={row.key}
                    type="button"
                    disabled={!notificationsEnabled}
                    onClick={() => onToggleThreshold(row.key, !on)}
                    className={getChoiceButtonClassName(
                      notificationsEnabled && on,
                      "justify-start text-left disabled:pointer-events-none disabled:opacity-50",
                    )}
                  >
                    <span className="text-sm font-bold">
                      {t("settings.remindersMinutesLabel", { minutes: row.minutes })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-border-subtle bg-field p-4 shadow-clay-inset">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                {t("settings.remindersPermission")}
              </p>
              <p className={cn("text-sm", permissionDescriptionToneClass(notificationPermission))}>
                {permissionDescription(notificationPermission, t)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onOpenSystemSettings}>
                <MonitorCog className="mr-1.5 h-3.5 w-3.5" />
                {t("settings.remindersOpenSystemSettings")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSendTest}
                disabled={!notificationsEnabled}
              >
                {t("settings.remindersTest")}
              </Button>
            </div>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
