import type { WeekdayCode, WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";

export interface SchedulePatternGroup {
  signature: string;
  days: WeekdayCode[];
  schedule: WeekdayScheduleFormRow;
}

export interface ScheduleCanvasBlock {
  workTopPercent: number;
  workHeightPercent: number;
  lunchTopPercent: number | null;
  lunchHeightPercent: number | null;
}

export interface ScheduleTick {
  minute: number;
  topPx: number;
  kind: "hour" | "halfHour";
}

export function formatNetHours(
  shiftStart: string,
  shiftEnd: string,
  lunchMinutes: string | number,
): string {
  const startMinutes = parseTimeToMinutes(shiftStart);
  const endMinutes = parseTimeToMinutes(shiftEnd);

  if (startMinutes === null || endMinutes === null) {
    return "--";
  }

  const shiftMinutes =
    endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  const lunchMinutesValue =
    typeof lunchMinutes === "number" ? lunchMinutes : Number.parseInt(lunchMinutes, 10) || 0;
  const netMinutes = Math.max(shiftMinutes - lunchMinutesValue, 0);
  return (netMinutes / 60).toFixed(1);
}

export function formatWeekdayScheduleHours(
  schedule: Pick<WeekdayScheduleFormRow, "shiftStart" | "shiftEnd" | "lunchMinutes">,
): string {
  return formatNetHours(schedule.shiftStart, schedule.shiftEnd, schedule.lunchMinutes);
}

export function getWeekdayScheduleSignature(
  schedule: Pick<WeekdayScheduleFormRow, "enabled" | "shiftStart" | "shiftEnd" | "lunchMinutes">,
): string {
  return [
    schedule.enabled ? "1" : "0",
    schedule.shiftStart,
    schedule.shiftEnd,
    Number.parseInt(schedule.lunchMinutes, 10) || 0,
  ].join("|");
}

export function groupWeekdaySchedules(
  weekdaySchedules: WeekdayScheduleFormRow[],
  orderedWorkdays: readonly WeekdayCode[],
): SchedulePatternGroup[] {
  const scheduleByDay = new Map(weekdaySchedules.map((schedule) => [schedule.day, schedule] as const));
  const groups: SchedulePatternGroup[] = [];

  for (const day of orderedWorkdays) {
    const schedule = scheduleByDay.get(day);
    if (!schedule) {
      continue;
    }

    const signature = getWeekdayScheduleSignature(schedule);
    const previousGroup = groups[groups.length - 1];

    if (previousGroup?.signature === signature) {
      previousGroup.days.push(day);
      continue;
    }

    groups.push({
      signature,
      days: [day],
      schedule,
    });
  }

  return groups;
}

export function buildScheduleCanvasBlock(
  schedule: Pick<WeekdayScheduleFormRow, "enabled" | "shiftStart" | "shiftEnd" | "lunchMinutes">,
  axisStartMinutes: number,
  axisEndMinutes: number,
): ScheduleCanvasBlock | null {
  if (!schedule.enabled) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(schedule.shiftStart);
  const endMinutes = parseTimeToMinutes(schedule.shiftEnd);

  if (startMinutes === null || endMinutes === null || axisEndMinutes <= axisStartMinutes) {
    return null;
  }

  const normalizedEnd = endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
  const lunchMinutes = Number.parseInt(schedule.lunchMinutes, 10) || 0;
  const totalRange = axisEndMinutes - axisStartMinutes;

  const workTopPercent = ((startMinutes - axisStartMinutes) / totalRange) * 100;
  const workHeightPercent = ((normalizedEnd - startMinutes) / totalRange) * 100;
  const lunchTopPercent =
    lunchMinutes > 0
      ? ((normalizedEnd - lunchMinutes - axisStartMinutes) / totalRange) * 100
      : null;
  const lunchHeightPercent = lunchMinutes > 0 ? (lunchMinutes / totalRange) * 100 : null;

  return {
    workTopPercent: clampPercentage(workTopPercent),
    workHeightPercent: clampPercentage(workHeightPercent),
    lunchTopPercent: lunchTopPercent === null ? null : clampPercentage(lunchTopPercent),
    lunchHeightPercent: lunchHeightPercent === null ? null : clampPercentage(lunchHeightPercent),
  };
}

export function getScheduleAxisBounds(weekdaySchedules: WeekdayScheduleFormRow[]): {
  axisStartMinutes: number;
  axisEndMinutes: number;
} {
  void weekdaySchedules;
  return { axisStartMinutes: 0, axisEndMinutes: 24 * 60 };
}

export function buildScheduleTicks(
  axisStartMinutes: number,
  axisEndMinutes: number,
  hourRowHeight: number,
): ScheduleTick[] {
  const ticks: ScheduleTick[] = [];

  for (let minute = axisStartMinutes; minute <= axisEndMinutes; minute += 30) {
    ticks.push({
      minute,
      topPx: ((minute - axisStartMinutes) / 60) * hourRowHeight,
      kind: minute % 60 === 0 ? "hour" : "halfHour",
    });
  }

  return ticks;
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) {
    return null;
  }

  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function clampPercentage(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}
