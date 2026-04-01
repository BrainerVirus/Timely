import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { ScheduleWorkspace } from "@/features/settings/components/ScheduleWorkspace/ScheduleWorkspace";
import {
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { staggerItem } from "@/shared/utils/animations";

export interface SettingsScheduleSectionProps {
  scheduleSummary: string;
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: WeekdayCode[];
  onSetWeekdayEnabled: (day: WeekdayCode, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayCode,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayCode, targetDays: WeekdayCode[]) => void;
}

export function SettingsScheduleSection({
  scheduleSummary,
  weekdaySchedules,
  orderedWorkdays,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<SettingsScheduleSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.schedule")}
        icon={Timer}
        summary={scheduleSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-4">
          <div className="space-y-1 px-1">
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("settings.weeklySchedule")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("settings.weeklyScheduleDescription")}
            </p>
          </div>

          <ScheduleWorkspace
            weekdaySchedules={weekdaySchedules}
            orderedWorkdays={orderedWorkdays}
            onSetWeekdayEnabled={onSetWeekdayEnabled}
            onSetWeekdayField={onSetWeekdayField}
            onCopyWeekdaySchedule={onCopyWeekdaySchedule}
          />
        </div>
      </AccordionItem>
    </m.div>
  );
}
