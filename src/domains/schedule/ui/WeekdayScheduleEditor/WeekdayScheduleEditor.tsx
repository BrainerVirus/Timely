import Clock from "lucide-react/dist/esm/icons/clock.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { ScheduleDayStatusToggle } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleDayStatusToggle";
import { ScheduleLunchField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleLunchField";
import { ScheduleNetHoursField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleNetHoursField";
import { ScheduleTimeField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleTimeField";
import { type WeekdayCode, type WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";
import { formatWeekdayScheduleHours } from "@/domains/schedule/lib/schedule-visualization";
import { Button } from "@/shared/ui/Button/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/Popover/Popover";
import { getCompactActionButtonClassName, getNeutralSegmentedControlClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";

import type { WeekdayScheduleDay } from "@/shared/types/dashboard";

export interface WeekdayScheduleEditorProps {
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: readonly WeekdayCode[];
  layout?: "inline" | "stacked";
  onSetWeekdayEnabled: (day: WeekdayScheduleDay, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayScheduleDay,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayScheduleDay, targetDays: WeekdayScheduleDay[]) => void;
}

export function WeekdayScheduleEditor({
  weekdaySchedules,
  orderedWorkdays,
  layout = "inline",
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<WeekdayScheduleEditorProps>) {
  const scheduleByDay = new Map(
    weekdaySchedules.map((schedule) => [schedule.day, schedule] as const),
  );

  return (
    <div className="space-y-2.5">
      {orderedWorkdays.map((day) => {
        const schedule = scheduleByDay.get(day);
        if (!schedule) {
          return null;
        }

        return (
          <WeekdayScheduleRow
            key={day}
            schedule={schedule}
            orderedWorkdays={orderedWorkdays}
            layout={layout}
            onSetWeekdayEnabled={onSetWeekdayEnabled}
            onSetWeekdayField={onSetWeekdayField}
            onCopyWeekdaySchedule={onCopyWeekdaySchedule}
          />
        );
      })}
    </div>
  );
}

function WeekdayScheduleRow({
  schedule,
  orderedWorkdays,
  layout,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<{
  schedule: WeekdayScheduleFormRow;
  orderedWorkdays: readonly WeekdayCode[];
  layout: NonNullable<WeekdayScheduleEditorProps["layout"]>;
  onSetWeekdayEnabled: WeekdayScheduleEditorProps["onSetWeekdayEnabled"];
  onSetWeekdayField: WeekdayScheduleEditorProps["onSetWeekdayField"];
  onCopyWeekdaySchedule: WeekdayScheduleEditorProps["onCopyWeekdaySchedule"];
}>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const netHours = schedule.enabled ? formatWeekdayScheduleHours(schedule) : "--";
  const weekdayLabel = formatWeekdayFromCode(schedule.day, "long");
  const usesStackedLayout = layout === "stacked";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-3 shadow-clay transition-colors",
        schedule.enabled ? "border-border-subtle bg-panel" : "border-border-subtle/80 bg-panel/70",
        usesStackedLayout && "p-4",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          usesStackedLayout ? "sm:gap-2" : "lg:flex-row lg:items-start lg:justify-between",
        )}
      >
        <div>
          <p className="font-display text-sm font-semibold text-foreground capitalize">
            {weekdayLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {schedule.enabled ? t("settings.workingDay") : t("settings.dayOff")}
          </p>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            usesStackedLayout && "justify-start sm:justify-end",
          )}
        >
          <ScheduleDayStatusToggle
            enabled={schedule.enabled}
            workingDayLabel={t("settings.workingDay")}
            dayOffLabel={t("settings.dayOff")}
            onSetEnabled={(enabled) => onSetWeekdayEnabled(schedule.day, enabled)}
          />
        </div>
      </div>

      {usesStackedLayout ? (
        <div
          className={cn(
            "mt-3 grid items-end gap-3 sm:grid-cols-2",
            !schedule.enabled && "opacity-60",
          )}
        >
          <TimeField
            day={schedule.day}
            label={t("settings.shiftStart")}
            icon={Clock}
            field="shiftStart"
            value={schedule.shiftStart}
            weekdayLabel={weekdayLabel}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <TimeField
            day={schedule.day}
            label={t("settings.shiftEnd")}
            icon={Clock}
            field="shiftEnd"
            value={schedule.shiftEnd}
            weekdayLabel={weekdayLabel}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <LunchField
            day={schedule.day}
            label={t("settings.lunchBreak")}
            value={schedule.lunchMinutes}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <NetHoursField
            label={t("settings.netHoursPerDay")}
            value={schedule.enabled ? t("settings.hoursPerDaySummary", { hours: netHours }) : "--"}
          />
          <CopyDaySchedulePopover
            sourceDay={schedule.day}
            orderedWorkdays={orderedWorkdays}
            onApply={(targetDays) => onCopyWeekdaySchedule(schedule.day, targetDays)}
          />
        </div>
      ) : (
        <div
          className={cn(
            "mt-3 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_9rem_auto]",
            !schedule.enabled && "opacity-60",
          )}
        >
          <TimeField
            day={schedule.day}
            label={t("settings.shiftStart")}
            icon={Clock}
            field="shiftStart"
            value={schedule.shiftStart}
            weekdayLabel={weekdayLabel}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <TimeField
            day={schedule.day}
            label={t("settings.shiftEnd")}
            icon={Clock}
            field="shiftEnd"
            value={schedule.shiftEnd}
            weekdayLabel={weekdayLabel}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <LunchField
            day={schedule.day}
            label={t("settings.lunchBreak")}
            value={schedule.lunchMinutes}
            disabled={!schedule.enabled}
            onSetWeekdayField={onSetWeekdayField}
          />
          <NetHoursField
            label={t("settings.netHoursPerDay")}
            value={schedule.enabled ? t("settings.hoursPerDaySummary", { hours: netHours }) : "--"}
          />
          <CopyDaySchedulePopover
            sourceDay={schedule.day}
            orderedWorkdays={orderedWorkdays}
            onApply={(targetDays) => onCopyWeekdaySchedule(schedule.day, targetDays)}
          />
        </div>
      )}
    </div>
  );
}

function TimeField({
  day,
  label,
  icon: Icon,
  field,
  value,
  weekdayLabel,
  disabled = false,
  onSetWeekdayField,
}: Readonly<{
  day: WeekdayScheduleDay;
  label: string;
  icon: typeof Clock;
  field: "shiftStart" | "shiftEnd";
  value: string;
  weekdayLabel: string;
  disabled?: boolean;
  onSetWeekdayField: WeekdayScheduleEditorProps["onSetWeekdayField"];
}>) {
  return (
    <ScheduleTimeField
      id={`${day}-${field}`}
      label={label}
      icon={Icon}
      value={value}
      ariaLabel={`${weekdayLabel} ${label}`}
      disabled={disabled}
      onChange={(nextValue) => onSetWeekdayField(day, field, nextValue)}
    />
  );
}

function LunchField({
  day,
  label,
  value,
  disabled = false,
  onSetWeekdayField,
}: Readonly<{
  day: WeekdayScheduleDay;
  label: string;
  value: string;
  disabled?: boolean;
  onSetWeekdayField: WeekdayScheduleEditorProps["onSetWeekdayField"];
}>) {
  return (
    <ScheduleLunchField
      id={`${day}-lunch-minutes`}
      label={label}
      value={value}
      disabled={disabled}
      onChange={(nextValue) => onSetWeekdayField(day, "lunchMinutes", nextValue)}
    />
  );
}

function NetHoursField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return <ScheduleNetHoursField label={label} value={value} />;
}

function CopyDaySchedulePopover({
  sourceDay,
  orderedWorkdays,
  onApply,
}: Readonly<{
  sourceDay: WeekdayScheduleDay;
  orderedWorkdays: readonly WeekdayCode[];
  onApply: (targetDays: WeekdayScheduleDay[]) => void;
}>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [targetDays, setTargetDays] = useState<WeekdayScheduleDay[]>([]);

  const availableDays = orderedWorkdays.filter((day) => day !== sourceDay);

  function handleToggleDay(day: WeekdayScheduleDay) {
    setTargetDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setTargetDays([]);
    }
  }

  function handleApply() {
    if (targetDays.length === 0) {
      return;
    }

    onApply(targetDays);
    setOpen(false);
    setTargetDays([]);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className={getCompactActionButtonClassName("gap-2 px-3 h-10")}>
          <Copy className="h-3.5 w-3.5" />
          {t("settings.copyToDays")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-foreground capitalize">
            {t("settings.copyDayScheduleTitle", {
              day: formatWeekdayFromCode(sourceDay, "long"),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t("settings.copyDayScheduleHint")}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleToggleDay(day)}
              className={getNeutralSegmentedControlClassName(
                targetDays.includes(day),
                "px-3 text-xs font-bold",
              )}
            >
              {formatWeekdayFromCode(day, "long")}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {targetDays.length === 0 ? t("settings.copyDayScheduleEmpty") : null}
          </p>
          <Button size="sm" variant="soft" disabled={targetDays.length === 0} onClick={handleApply}>
            {t("settings.copyDayScheduleApply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
