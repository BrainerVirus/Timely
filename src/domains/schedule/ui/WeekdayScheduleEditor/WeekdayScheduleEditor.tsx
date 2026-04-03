import { WeekdayScheduleRow } from "@/domains/schedule/ui/WeekdayScheduleEditor/internal/WeekdayScheduleRow/WeekdayScheduleRow";

import type {
  WeekdayCode,
  WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";
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
