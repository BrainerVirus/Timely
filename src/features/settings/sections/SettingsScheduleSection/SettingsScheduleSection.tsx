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
import { ScheduleWorkspace } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";
import { ScheduleSaveButton } from "@/features/settings/ui/ScheduleSaveButton/ScheduleSaveButton";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Label } from "@/shared/ui/Label/Label";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

import type { TimeFormat } from "@/shared/types/dashboard";

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat }> = [{ value: "hm" }, { value: "decimal" }];
const WEEK_START_OPTIONS: WeekStartPreference[] = [
  "auto",
  "monday",
  "sunday",
  "friday",
  "saturday",
];

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
  const { t, formatWeekdayFromCode } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  function getWeekStartLabel(option: WeekStartPreference): string {
    if (option === "auto") {
      return t("common.auto");
    }

    const weekdayMap = {
      monday: "Mon",
      sunday: "Sun",
      friday: "Fri",
      saturday: "Sat",
    } as const;

    return formatWeekdayFromCode(weekdayMap[option]);
  }

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

            <div className="space-y-1.5">
              <Label>{t("settings.timezone")}</Label>
              <SearchCombobox
                value={timezone}
                options={timezoneOptions}
                searchPlaceholder={t("common.searchTimezone")}
                noResultsLabel={t("common.noResults")}
                onChange={onSetTimezone}
                className="w-[18rem] max-w-full"
                contentClassName="w-[18rem] max-w-[18rem]"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("settings.firstDayOfWeek")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_START_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSetWeekStart(option)}
                    className={getChoiceButtonClassName(
                      weekStart === option,
                      "justify-start px-4 text-left",
                    )}
                  >
                    {getWeekStartLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("settings.timeFormat")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeTimeFormat(option.value)}
                    className={getChoiceButtonClassName(
                      timeFormat === option.value,
                      "justify-start text-left",
                    )}
                  >
                    <span className="text-sm font-bold">
                      {option.value === "hm"
                        ? t("settings.hoursAndMinutes")
                        : t("settings.decimal")}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.durationHint")}</p>
            </div>
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
