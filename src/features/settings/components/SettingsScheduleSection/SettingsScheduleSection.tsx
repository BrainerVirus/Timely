import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";
import {
  WEEK_START_OPTIONS,
  type WeekStartPreference,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Input } from "@/shared/components/Input/Input";
import { Label } from "@/shared/components/Label/Label";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";
import { TimeInput } from "@/shared/components/TimeInput/TimeInput";
import { staggerItem } from "@/shared/utils/animations";
import {
  getChoiceButtonClassName,
  getSegmentedControlClassName,
} from "@/shared/utils/control-styles";

import type { TimeFormat } from "@/shared/types/dashboard";
import type { WeekdayCode } from "@/shared/utils/utils";

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: "hm", label: "Hours & minutes" },
  { value: "decimal", label: "Decimal" },
];

export interface SettingsScheduleSectionProps {
  scheduleSummary: string;
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  netHours: string;
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  weekStart: WeekStartPreference;
  orderedWorkdays: WeekdayCode[];
  workdays: string[];
  schedulePhase: "idle" | "saving" | "saved";
  timeFormat: TimeFormat;
  onSetShiftStart: (value: string) => void;
  onSetShiftEnd: (value: string) => void;
  onSetLunchMinutes: (value: string) => void;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onToggleWorkday: (day: WeekdayCode) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  onSaveSchedule?: () => void;
}

export function SettingsScheduleSection({
  scheduleSummary,
  shiftStart,
  shiftEnd,
  lunchMinutes,
  netHours,
  timezone,
  timezoneOptions,
  weekStart,
  orderedWorkdays,
  workdays,
  schedulePhase,
  timeFormat,
  onSetShiftStart,
  onSetShiftEnd,
  onSetLunchMinutes,
  onSetTimezone,
  onSetWeekStart,
  onToggleWorkday,
  onChangeTimeFormat,
  onSaveSchedule,
}: Readonly<SettingsScheduleSectionProps>) {
  const { formatWeekdayFromCode, t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.schedule")} icon={Timer} summary={scheduleSummary}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36 space-y-1.5">
              <Label htmlFor="shift-start" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.shiftStart")}
              </Label>
              <TimeInput
                id="shift-start"
                aria-label={t("settings.shiftStart")}
                value={shiftStart}
                onChange={onSetShiftStart}
              />
            </div>

            <div className="w-36 space-y-1.5">
              <Label htmlFor="shift-end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.shiftEnd")}
              </Label>
              <TimeInput
                id="shift-end"
                aria-label={t("settings.shiftEnd")}
                value={shiftEnd}
                onChange={onSetShiftEnd}
              />
            </div>

            <div className="w-36 space-y-1.5">
              <Label htmlFor="lunch-minutes" className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="whitespace-nowrap">{t("settings.lunchBreak")}</span>
              </Label>
              <Input
                id="lunch-minutes"
                type="number"
                step="5"
                min="0"
                max="180"
                value={lunchMinutes}
                onChange={(event) => onSetLunchMinutes(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t("settings.netHoursPerDay")}</Label>
              <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4">
                <span className="font-display text-sm font-bold text-primary tabular-nums">
                  {t("settings.hoursPerDaySummary", { hours: netHours })}
                </span>
              </div>
            </div>
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
            <Label>{t("settings.workdays")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {orderedWorkdays.map((day) => {
                const active = workdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onToggleWorkday(day)}
                    className={getSegmentedControlClassName(active, "min-w-14 text-xs")}
                  >
                    {formatWeekdayFromCode(day)}
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
