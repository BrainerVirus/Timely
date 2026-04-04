import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { formatWeekdayScheduleHours } from "@/domains/schedule/lib/schedule-visualization";
import { ScheduleDayStatusToggle } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleDayStatusToggle";
import { ScheduleLunchField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleLunchField";
import { ScheduleNetHoursField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleNetHoursField";
import { ScheduleTimeField } from "@/domains/schedule/ui/ScheduleEditorFields/ScheduleTimeField";
import {
  getChoiceButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/Label/Label";

import type {
  WeekdayCode,
  WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import type { ScheduleWorkspaceProps } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";

export interface ScheduleWorkspaceEditorProps {
  selectedDay: WeekdayCode;
  selectedSchedule: WeekdayScheduleFormRow;
  orderedWorkdays: readonly WeekdayCode[];
  selectedApplyDays: WeekdayCode[];
  matchingDays: WeekdayCode[];
  applyToDays: (targetDays: readonly WeekdayCode[]) => void;
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
    <div className="rounded-[1.75rem] border-2 border-border-subtle bg-panel p-4 shadow-clay xl:w-full xl:max-w-120">
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
        <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(min-content,12.5rem))] sm:justify-start">
          <ScheduleTimeField
            id={`${selectedDay}-shiftStart-workspace`}
            label={labels.shiftStart}
            icon={Clock3}
            value={selectedSchedule.shiftStart}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-40"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "shiftStart", nextValue)}
          />
          <ScheduleTimeField
            id={`${selectedDay}-shiftEnd-workspace`}
            label={labels.shiftEnd}
            icon={Clock3}
            value={selectedSchedule.shiftEnd}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-40"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "shiftEnd", nextValue)}
          />
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-[minmax(min-content,9rem)_minmax(min-content,10rem)] sm:justify-start">
          <ScheduleLunchField
            id={`${selectedDay}-workspace-lunch`}
            label={labels.lunchBreak}
            value={selectedSchedule.lunchMinutes}
            disabled={!selectedSchedule.enabled}
            className="w-full max-w-36"
            onChange={(nextValue) => onSetWeekdayField(selectedDay, "lunchMinutes", nextValue)}
          />
          <ScheduleNetHoursField
            label={labels.netHoursPerDay}
            value={
              selectedSchedule.enabled
                ? formatHoursPerDaySummary(formatWeekdayScheduleHours(selectedSchedule))
                : "--"
            }
            className="w-full max-w-40"
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

        <div className="grid max-w-md gap-2">
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
