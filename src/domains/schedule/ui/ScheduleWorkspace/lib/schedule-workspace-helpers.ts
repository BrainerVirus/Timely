import type { WeekdayCode, WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";

export const DAY_COLUMN_MIN_WIDTH = 156;
export const HOUR_ROW_HEIGHT = 56;
export const HEADER_HEIGHT = 68;
export const TIME_RAIL_WIDTH = 72;

export function getInitialSelectedDay(
  weekdaySchedules: WeekdayScheduleFormRow[],
  orderedWorkdays: readonly WeekdayCode[],
): WeekdayCode {
  const enabledDay = orderedWorkdays.find((day) =>
    weekdaySchedules.some((schedule) => schedule.day === day && schedule.enabled),
  );

  return enabledDay ?? orderedWorkdays[0] ?? "Mon";
}

export function getInitialScheduleScrollTop(
  weekdaySchedules: WeekdayScheduleFormRow[],
  axisStartMinutes: number,
): number {
  const startMinutes = weekdaySchedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => parseScheduleTime(schedule.shiftStart))
    .filter((value): value is number => value !== null);

  if (startMinutes.length === 0) {
    return 0;
  }

  const earliestStart = Math.min(...startMinutes);
  const focusStart = Math.max(earliestStart - 60, axisStartMinutes);
  return ((focusStart - axisStartMinutes) / 60) * HOUR_ROW_HEIGHT;
}

export function formatHourLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:00`;
}

export function parseScheduleTime(value: string): number | null {
  const [hoursPart = "", minutesPart = ""] = value.split(":");
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}
