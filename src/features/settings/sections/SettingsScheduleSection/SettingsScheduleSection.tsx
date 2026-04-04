import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  type SchedulePhase,
  type WeekStartPreference,
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { SchedulePreferencesFields } from "@/domains/schedule/ui/SchedulePreferencesFields/SchedulePreferencesFields";
import { ScheduleWorkspace } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";
import { ScheduleSaveButton } from "@/features/settings/ui/ScheduleSaveButton/ScheduleSaveButton";
import { staggerItem } from "@/shared/lib/animations/animations";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";

import type { TimeFormat } from "@/shared/types/dashboard";

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
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  weekStart: WeekStartPreference;
  timeFormat: TimeFormat;
  schedulePhase: SchedulePhase;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  onSaveSchedule?: () => void;
}

export function SettingsScheduleSection({
  scheduleSummary,
  weekdaySchedules,
  orderedWorkdays,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
  timezone,
  timezoneOptions,
  weekStart,
  timeFormat,
  schedulePhase,
  onSetTimezone,
  onSetWeekStart,
  onChangeTimeFormat,
  onSaveSchedule,
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
        <div className="space-y-10">
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

          <div className="space-y-5">
            <div className="space-y-1 px-1">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("settings.schedulePreferences")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("settings.schedulePreferencesHint")}
              </p>
            </div>

            <SchedulePreferencesFields
              timezone={timezone}
              timezoneOptions={timezoneOptions}
              weekStart={weekStart}
              timeFormat={timeFormat}
              onSetTimezone={onSetTimezone}
              onSetWeekStart={onSetWeekStart}
              onChangeTimeFormat={onChangeTimeFormat}
            />
          </div>

          {onSaveSchedule ? (
            <div className="border-t border-border-subtle pt-6">
              <ScheduleSaveButton phase={schedulePhase} onClick={onSaveSchedule} />
            </div>
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}
