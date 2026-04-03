import Clock from "lucide-react/dist/esm/icons/clock.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { formatWeekdayScheduleHours } from "@/domains/schedule/lib/schedule-visualization";
import { type WeekdayCode, type WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";
import { ScheduleDayStatusToggle } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleDayStatusToggle";
import { ScheduleLunchField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleLunchField";
import { ScheduleNetHoursField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleNetHoursField";
import { ScheduleTimeField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleTimeField";
import { CopyDaySchedulePopover } from "@/domains/schedule/ui/WeekdayScheduleEditor/internal/CopyDaySchedulePopover/CopyDaySchedulePopover";
import { cn } from "@/shared/lib/utils";

import type { WeekdayScheduleDay } from "@/shared/types/dashboard";

interface WeekdayScheduleRowProps {
  schedule: WeekdayScheduleFormRow;
  orderedWorkdays: readonly WeekdayCode[];
  layout: "inline" | "stacked";
  onSetWeekdayEnabled: (day: WeekdayScheduleDay, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayScheduleDay,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayScheduleDay, targetDays: WeekdayScheduleDay[]) => void;
}

export function WeekdayScheduleRow({
  schedule,
  orderedWorkdays,
  layout,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<WeekdayScheduleRowProps>) {
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

      <div
        className={cn(
          "mt-3 grid items-end gap-3",
          usesStackedLayout
            ? "sm:grid-cols-2"
            : "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_9rem_auto]",
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
  onSetWeekdayField: WeekdayScheduleRowProps["onSetWeekdayField"];
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
  onSetWeekdayField: WeekdayScheduleRowProps["onSetWeekdayField"];
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
