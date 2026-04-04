import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  type WeekStartPreference,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";
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

export interface SchedulePreferencesFieldsProps {
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  weekStart: WeekStartPreference;
  timeFormat: TimeFormat;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  className?: string;
  comboboxClassName?: string;
  comboboxContentClassName?: string;
}

export function SchedulePreferencesFields({
  timezone,
  timezoneOptions,
  weekStart,
  timeFormat,
  onSetTimezone,
  onSetWeekStart,
  onChangeTimeFormat,
  className,
  comboboxClassName,
  comboboxContentClassName,
}: Readonly<SchedulePreferencesFieldsProps>) {
  const { t, formatWeekdayFromCode } = useI18n();

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
    <div className={cn("space-y-5", className)}>
      <div className="space-y-1.5">
        <Label>{t("settings.timezone")}</Label>
        <SearchCombobox
          value={timezone}
          options={timezoneOptions}
          searchPlaceholder={t("common.searchTimezone")}
          noResultsLabel={t("common.noResults")}
          onChange={onSetTimezone}
          className={cn("w-[18rem] max-w-full", comboboxClassName)}
          contentClassName={cn("w-[18rem] max-w-[18rem]", comboboxContentClassName)}
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
  );
}
