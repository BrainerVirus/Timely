import * as React from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { ScheduleWorkspaceCanvas } from "@/features/settings/components/ScheduleWorkspace/ScheduleWorkspaceCanvas";
import { ScheduleWorkspaceEditor } from "@/features/settings/components/ScheduleWorkspace/ScheduleWorkspaceEditor";
import { HOUR_ROW_HEIGHT } from "@/features/settings/components/ScheduleWorkspace/lib/schedule-workspace-helpers";
import { useScheduleWorkspaceController } from "@/features/settings/components/ScheduleWorkspace/lib/use-schedule-workspace-controller";
import {
  buildScheduleTicks,
  getScheduleAxisBounds,
  groupWeekdaySchedules,
} from "@/features/settings/utils/schedule-visualization";

import type { WeekdayCode, WeekdayScheduleFormRow } from "@/features/settings/hooks/schedule-form/schedule-form";

export interface ScheduleWorkspaceProps {
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: WeekdayCode[];
  onSetWeekdayEnabled: (day: WeekdayCode, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayCode,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayCode, targetDays: WeekdayCode[]) => void;
}

export function ScheduleWorkspace({
  weekdaySchedules,
  orderedWorkdays,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<ScheduleWorkspaceProps>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const scheduleByDay = React.useMemo(
    () => new Map(weekdaySchedules.map((schedule) => [schedule.day, schedule] as const)),
    [weekdaySchedules],
  );
  const patternGroups = React.useMemo(
    () => groupWeekdaySchedules(weekdaySchedules, orderedWorkdays),
    [orderedWorkdays, weekdaySchedules],
  );
  const { axisStartMinutes, axisEndMinutes } = getScheduleAxisBounds(weekdaySchedules);
  const ticks = React.useMemo(
    () => buildScheduleTicks(axisStartMinutes, axisEndMinutes, HOUR_ROW_HEIGHT),
    [axisEndMinutes, axisStartMinutes],
  );
  const hourTicks = React.useMemo(
    () => ticks.filter((tick) => tick.kind === "hour" && tick.minute < axisEndMinutes),
    [axisEndMinutes, ticks],
  );
  const totalHeight = ((axisEndMinutes - axisStartMinutes) / 60) * HOUR_ROW_HEIGHT;
  const controller = useScheduleWorkspaceController({
    weekdaySchedules,
    orderedWorkdays,
    scheduleByDay,
    patternGroups,
    axisStartMinutes,
    onCopyWeekdaySchedule,
  });

  if (!controller.selectedSchedule) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
      <ScheduleWorkspaceCanvas
        orderedWorkdays={orderedWorkdays}
        scheduleByDay={scheduleByDay}
        selectedDay={controller.selectedDay}
        setSelectedDay={controller.setSelectedDay}
        ticks={ticks}
        hourTicks={hourTicks}
        axisStartMinutes={axisStartMinutes}
        axisEndMinutes={axisEndMinutes}
        totalHeight={totalHeight}
        calendarTrackWidth={controller.calendarTrackWidth}
        viewportHeight={controller.viewportHeight}
        bodyViewportHeight={controller.bodyViewportHeight}
        dayHeaderTrackReference={controller.dayHeaderTrackReference}
        dayBodyViewportReference={controller.dayBodyViewportReference}
        timeRailReference={controller.timeRailReference}
        handleCalendarViewportScroll={controller.handleCalendarViewportScroll}
        formatWeekdayFromCode={formatWeekdayFromCode}
        dayOffLabel={t("settings.dayOff")}
        hoursLabel={t("settings.hours")}
        lunchBreakLabel={t("settings.lunchBreak")}
      />

      <div ref={controller.editorCardReference}>
        <ScheduleWorkspaceEditor
          selectedDay={controller.selectedDay}
          selectedSchedule={controller.selectedSchedule}
          orderedWorkdays={orderedWorkdays}
          selectedApplyDays={controller.selectedApplyDays}
          matchingDays={controller.matchingDays}
          applyToDays={controller.applyToDays}
          toggleSelectedApplyDay={controller.toggleSelectedApplyDay}
          formatWeekdayFromCode={formatWeekdayFromCode}
          labels={{
            applyToMatchingDays: t("settings.applyToMatchingDays"),
            applyToSelectedDays: t("settings.applyToSelectedDays"),
            applyToWholeWeek: t("settings.applyToWholeWeek"),
            commonNone: t("common.none"),
            dayOff: t("settings.dayOff"),
            lunchBreak: t("settings.lunchBreak"),
            netHoursPerDay: t("settings.netHoursPerDay"),
            shiftEnd: t("settings.shiftEnd"),
            shiftStart: t("settings.shiftStart"),
            wholeWeekLabel: t("settings.wholeWeekLabel"),
            workingDay: t("settings.workingDay"),
          }}
          formatHoursPerDaySummary={(hours) => t("settings.hoursPerDaySummary", { hours })}
          onSetWeekdayEnabled={onSetWeekdayEnabled}
          onSetWeekdayField={onSetWeekdayField}
        />
      </div>
    </div>
  );
}
