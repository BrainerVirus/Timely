import MonitorDown from "lucide-react/dist/esm/icons/monitor-down.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { staggerItem } from "@/shared/utils/animations";
import { getChoiceButtonClassName } from "@/shared/utils/control-styles";
import { cn } from "@/shared/utils/utils";

export interface SettingsWindowBehaviorSectionProps {
  traySummary: string;
  trayEnabled: boolean;
  closeToTray: boolean;
  onToggleTrayEnabled: () => void;
  onSetCloseToTray: (enabled: boolean) => void;
}

export function SettingsWindowBehaviorSection({
  traySummary,
  trayEnabled,
  closeToTray,
  onToggleTrayEnabled,
  onSetCloseToTray,
}: Readonly<SettingsWindowBehaviorSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.windowBehavior")}
        icon={MonitorDown}
        summary={traySummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t("settings.showTrayIcon")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.showTrayIconDescription")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={trayEnabled}
              aria-label={t("settings.showTrayIcon")}
              onClick={onToggleTrayEnabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                trayEnabled ? "border-primary/30 bg-primary" : "border-border-subtle bg-field",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  trayEnabled ? "translate-x-5.5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.closeButtonAction")}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSetCloseToTray(true)}
                disabled={!trayEnabled}
                className={getChoiceButtonClassName(
                  trayEnabled && closeToTray,
                  "justify-start text-left disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <span className="text-sm font-bold">{t("settings.closeActionMinimizeToTray")}</span>
              </button>
              <button
                type="button"
                onClick={() => onSetCloseToTray(false)}
                className={getChoiceButtonClassName(!closeToTray, "justify-start text-left")}
              >
                <span className="text-sm font-bold">{t("settings.closeActionQuit")}</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.closeButtonActionDescription")}
            </p>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
