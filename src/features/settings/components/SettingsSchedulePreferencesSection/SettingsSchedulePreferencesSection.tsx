import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";
import {
  type SchedulePhase,
  type WeekStartPreference,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";
import { staggerItem } from "@/shared/utils/animations";
import {
  getChoiceButtonClassName,
} from "@/shared/utils/control-styles";

import type { TimeFormat } from "@/shared/types/dashboard";

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat }> = [{ value: "hm" }, { value: "decimal" }];
const WEEK_START_OPTIONS: WeekStartPreference[] = [
  "auto",
  "monday",
  "sunday",
  "friday",
  "saturday",
];

export interface SettingsSchedulePreferencesSectionProps {
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

export function SettingsSchedulePreferencesSection({
  timezone,
  timezoneOptions,
  weekStart,
  timeFormat,
  schedulePhase,
  onSetTimezone,
  onSetWeekStart,
  onChangeTimeFormat,
  onSaveSchedule,
}: Readonly<SettingsSchedulePreferencesSectionProps>) {
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
        title={t("settings.schedulePreferences")}
        icon={CalendarClock}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-5">
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

          {onSaveSchedule ? (
            <div className="pt-1">
              <ScheduleSaveButton phase={schedulePhase} onClick={onSaveSchedule} />
            </div>
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}
