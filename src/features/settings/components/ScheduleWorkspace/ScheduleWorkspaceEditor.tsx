import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { ScheduleDayStatusToggle } from "@/features/settings/components/ScheduleEditorFields/ScheduleDayStatusToggle";
import { ScheduleLunchField } from "@/features/settings/components/ScheduleEditorFields/ScheduleLunchField";
import { ScheduleNetHoursField } from "@/features/settings/components/ScheduleEditorFields/ScheduleNetHoursField";
import { ScheduleTimeField } from "@/features/settings/components/ScheduleEditorFields/ScheduleTimeField";
import { formatWeekdayScheduleHours } from "@/features/settings/utils/schedule-visualization";
import { Label } from "@/shared/components/Label/Label";
import { getChoiceButtonClassName, getNeutralSegmentedControlClassName } from "@/shared/utils/control-styles";
import { cn } from "@/shared/utils/utils";

import type { WeekdayCode, WeekdayScheduleFormRow } from "@/features/settings/hooks/schedule-form/schedule-form";
import type { ScheduleWorkspaceProps } from "@/features/settings/components/ScheduleWorkspace/ScheduleWorkspace";

export interface ScheduleWorkspaceEditorProps {
  selectedDay: WeekdayCode;
  selectedSchedule: WeekdayScheduleFormRow;
  orderedWorkdays: WeekdayCode[];
  selectedApplyDays: WeekdayCode[];
  matchingDays: WeekdayCode[];
  applyToDays: (targetDays: WeekdayCode[]) => void;
  toggleSelectedApplyDay: (day: WeekdayCode) => void;
  formatWeekdayFromCode: (day: WeekdayCode, style?: "long" | "short" | undefined) => string;
  formatHoursPerDaySummary: (hours: string) => string;
  labels: {
    applyToMatchingDays: string;
    applyToSelectedDays: string;
    applyToWholeWeek: string;
    commonNone: string;
    dayOff: string;
    lunchBreak: string;
    netHoursPerDay: string;
    wholeWeekLabel: string;
    workingDay: string;
    shiftEnd: string;
    shiftStart: string;
  };
  onSetWeekdayEnabled: ScheduleWorkspaceProps["onSetWeekdayEnabled"];
  onSetWeekdayField: ScheduleWorkspaceProps["onSetWeekdayField"];
}

export function ScheduleWorkspaceEditor({
  selectedDay,
  selectedSchedule,
  orderedWorkdays,
  selectedApplyDays,
  matchingDays,
  applyToDays,
  toggleSelectedApplyDay,
  formatWeekdayFromCode,
  formatHoursPerDaySummary,
  labels,
  onSetWeekdayEnabled,
  onSetWeekdayField,
}: Readonly<ScheduleWorkspaceEditorProps>) {
  return (
    <div
      className="rounded-[1.75rem] border-2 border-border-subtle bg-panel p-4 shadow-clay xl:w-full xl:max-w-[30rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {formatWeekdayFromCode(selectedDay, "long")}
          </h3>
        </div>

        <ScheduleDayStatusToggle
          enabled={selectedSchedule.enabled}
          workingDayLabel={labels.workingDay}
          dayOffLabel={labels.dayOff}
          onSetEnabled={(enabled) => onSetWeekdayEnabled(selectedDay, enabled)}
        />
      </div>

      <div className={cn("mt-4 space-y-4", !selectedSchedule.enabled && "opacity-60")}>
        <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(11rem,12.5rem))] sm:justify-start">
          <ScheduleTimeField
            id={`${selectedDay}-shiftStart-workspace`}
            label={labels.shiftStart}
            icon={Clock3}
            value={selectedSchedule.shiftStart}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-[12.5rem]"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "shiftStart", nextValue)}
          />
          <ScheduleTimeField
            id={`${selectedDay}-shiftEnd-workspace`}
            label={labels.shiftEnd}
            icon={Clock3}
            value={selectedSchedule.shiftEnd}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-[12.5rem]"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "shiftEnd", nextValue)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(8rem,9rem)_minmax(8rem,10rem)] sm:justify-start">
          <ScheduleLunchField
            id={`${selectedDay}-workspace-lunch`}
            label={labels.lunchBreak}
            value={selectedSchedule.lunchMinutes}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-[9rem]"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "lunchMinutes", nextValue)}
          />
          <ScheduleNetHoursField
            label={labels.netHoursPerDay}
            value={
              selectedSchedule.enabled
                ? formatHoursPerDaySummary(formatWeekdayScheduleHours(selectedSchedule))
                : "--"
            }
            className="w-full max-w-[10rem]"
            valueClassName="shadow-clay-inset"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <Label>{labels.applyToSelectedDays}</Label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {orderedWorkdays.map((day) => {
              const disabled = day === selectedDay;
              const active = selectedApplyDays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSelectedApplyDay(day)}
                  className={getNeutralSegmentedControlClassName(
                    active,
                    "px-3 text-xs font-bold disabled:opacity-40",
                  )}
                >
                  {formatWeekdayFromCode(day)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid max-w-[28rem] gap-2">
          <button
            type="button"
            onClick={() => applyToDays(matchingDays)}
            disabled={matchingDays.length === 0}
            className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
          >
            <span>{labels.applyToMatchingDays}</span>
            <span className="text-xs text-muted-foreground">
              {matchingDays.length > 0
                ? matchingDays.map((day) => formatWeekdayFromCode(day)).join(", ")
                : labels.commonNone}
            </span>
          </button>
          <button
            type="button"
            onClick={() => applyToDays(selectedApplyDays)}
            disabled={selectedApplyDays.length === 0}
            className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
          >
            <span>{labels.applyToSelectedDays}</span>
            <span className="text-xs text-muted-foreground">
              {selectedApplyDays.length > 0
                ? selectedApplyDays.map((day) => formatWeekdayFromCode(day)).join(", ")
                : labels.commonNone}
            </span>
          </button>
          <button
            type="button"
            onClick={() => applyToDays(orderedWorkdays)}
            className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
          >
            <span>{labels.applyToWholeWeek}</span>
            <span className="text-xs text-muted-foreground">{labels.wholeWeekLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
