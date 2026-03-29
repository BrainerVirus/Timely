import Globe from "lucide-react/dist/esm/icons/globe.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";
import { WeekdayScheduleEditor } from "@/features/settings/components/WeekdayScheduleEditor/WeekdayScheduleEditor";
import {
  WEEK_START_OPTIONS,
  type WeekStartPreference,
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";
import { staggerItem } from "@/shared/utils/animations";
import {
  getChoiceButtonClassName,
  getSegmentedControlClassName,
} from "@/shared/utils/control-styles";

import type { TimeFormat } from "@/shared/types/dashboard";

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat }> = [{ value: "hm" }, { value: "decimal" }];

export interface SettingsScheduleSectionProps {
  scheduleSummary: string;
  weekdaySchedules: WeekdayScheduleFormRow[];
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  weekStart: WeekStartPreference;
  orderedWorkdays: WeekdayCode[];
  schedulePhase: "idle" | "saving" | "saved";
  timeFormat: TimeFormat;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onSetWeekdayEnabled: (day: WeekdayCode, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayCode,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayCode, targetDays: WeekdayCode[]) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  onSaveSchedule?: () => void;
}

export function SettingsScheduleSection({
  scheduleSummary,
  weekdaySchedules,
  timezone,
  timezoneOptions,
  weekStart,
  orderedWorkdays,
  schedulePhase,
  timeFormat,
  onSetTimezone,
  onSetWeekStart,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
  onChangeTimeFormat,
  onSaveSchedule,
}: Readonly<SettingsScheduleSectionProps>) {
  const { formatWeekdayFromCode, t } = useI18n();
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
          <div className="space-y-1.5">
            <Label>{t("settings.scheduleByDay")}</Label>
            <WeekdayScheduleEditor
              weekdaySchedules={weekdaySchedules}
              orderedWorkdays={orderedWorkdays}
              layout="inline"
              onSetWeekdayEnabled={onSetWeekdayEnabled}
              onSetWeekdayField={onSetWeekdayField}
              onCopyWeekdaySchedule={onCopyWeekdaySchedule}
            />
          </div>

          <div className="w-fit max-w-full space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {t("settings.timezone")}
            </Label>
            <SearchCombobox
              value={timezone}
              options={timezoneOptions}
              searchPlaceholder={t("common.searchTimezone")}
              noResultsLabel={t("common.noResults")}
              onChange={onSetTimezone}
              className="max-w-120 min-w-72"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.firstDayOfWeek")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_START_OPTIONS.map((option) => {
                const active = weekStart === option;
                const labelMap: Record<Exclude<WeekStartPreference, "auto">, WeekdayCode> = {
                  sunday: "Sun",
                  monday: "Mon",
                  friday: "Fri",
                  saturday: "Sat",
                };
                const label =
                  option === "auto" ? t("common.auto") : formatWeekdayFromCode(labelMap[option]);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSetWeekStart(option)}
                    className={getSegmentedControlClassName(
                      active,
                      "px-4 text-xs uppercase tracking-[0.14em]",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.timeFormat")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_FORMAT_OPTIONS.map((option) => {
                const active = timeFormat === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeTimeFormat(option.value)}
                    className={getChoiceButtonClassName(active, "justify-start text-left")}
                  >
                    <span className="text-sm font-bold">
                      {option.value === "hm"
                        ? t("settings.hoursAndMinutes")
                        : t("settings.decimal")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.durationHint")}</p>
          </div>

          {onSaveSchedule ? (
            <ScheduleSaveButton phase={schedulePhase} onClick={onSaveSchedule} />
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}
