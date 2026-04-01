import {
  WEEKDAY_ORDER,
  deriveInitialWeekStart,
  getAutoTimezone,
  normalizeWeekStart,
  resolveTimezone,
  resolveWeekStart,
  type WeekStartPreference,
  type WeekdayCode,
} from "@/shared/utils/utils";

import type {
  BootstrapPayload,
  ScheduleSnapshot,
  WeekdaySchedule,
  WeekdayScheduleDay,
} from "@/shared/types/dashboard";

const DEFAULT_SHIFT_START = "09:00";
const DEFAULT_SHIFT_END = "18:00";
const DEFAULT_LUNCH_MINUTES = 60;
const DEFAULT_WORKWEEK = new Set<WeekdayScheduleDay>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export const ALL_WORKDAYS = [...WEEKDAY_ORDER] as WeekdayScheduleDay[];

export type SchedulePhase = "idle" | "saving" | "saved";

export interface WeekdayScheduleFormRow {
  day: WeekdayScheduleDay;
  enabled: boolean;
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
}

export interface SchedulePatternGroup {
  signature: string;
  days: WeekdayScheduleDay[];
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

interface ScheduleFormState {
  weekdaySchedules: WeekdayScheduleFormRow[];
  timezone: string;
  weekStart: WeekStartPreference;
  schedulePhase: SchedulePhase;
}

type ScheduleFormAction =
  | { type: "setTimezone"; value: string }
  | { type: "setWeekStart"; value: WeekStartPreference }
  | { type: "setWeekdayEnabled"; day: WeekdayScheduleDay; enabled: boolean }
  | {
      type: "setWeekdayField";
      day: WeekdayScheduleDay;
      field: "shiftStart" | "shiftEnd" | "lunchMinutes";
      value: string;
    }
  | { type: "copyWeekdaySchedule"; sourceDay: WeekdayScheduleDay; targetDays: WeekdayScheduleDay[] }
  | { type: "setSchedulePhase"; phase: SchedulePhase };

export function createInitialScheduleFormState(payload: BootstrapPayload): ScheduleFormState {
  const timezone = deriveInitialScheduleTimezone(payload);

  return {
    weekdaySchedules: createWeekdayScheduleFormRows(payload.schedule),
    timezone,
    weekStart: deriveInitialWeekStart(payload.schedule.weekStart, timezone),
    schedulePhase: "idle",
  };
}

export function deriveInitialScheduleTimezone(payload: BootstrapPayload): string {
  const configuredTimezone = payload.schedule.timezone?.trim();

  if (!configuredTimezone) {
    return getAutoTimezone();
  }

  if (shouldPreferDetectedTimezone(payload, configuredTimezone)) {
    return getAutoTimezone();
  }

  return resolveTimezone(configuredTimezone);
}

export function scheduleFormReducer(
  state: ScheduleFormState,
  action: ScheduleFormAction,
): ScheduleFormState {
  switch (action.type) {
    case "setTimezone":
      return {
        ...state,
        timezone: action.value,
        schedulePhase: "idle",
      };
    case "setWeekStart":
      return {
        ...state,
        weekStart: normalizeWeekStart(action.value),
        schedulePhase: "idle",
      };
    case "setWeekdayEnabled":
      return {
        ...state,
        weekdaySchedules: state.weekdaySchedules.map((schedule) =>
          schedule.day === action.day ? { ...schedule, enabled: action.enabled } : schedule,
        ),
        schedulePhase: "idle",
      };
    case "setWeekdayField":
      return {
        ...state,
        weekdaySchedules: state.weekdaySchedules.map((schedule) =>
          schedule.day === action.day ? { ...schedule, [action.field]: action.value } : schedule,
        ),
        schedulePhase: "idle",
      };
    case "copyWeekdaySchedule": {
      const source = state.weekdaySchedules.find((schedule) => schedule.day === action.sourceDay);
      if (!source) {
        return state;
      }

      const targetDaySet = new Set(action.targetDays);

      return {
        ...state,
        weekdaySchedules: state.weekdaySchedules.map((schedule) =>
          targetDaySet.has(schedule.day)
            ? {
                ...schedule,
                enabled: true,
                shiftStart: source.shiftStart,
                shiftEnd: source.shiftEnd,
                lunchMinutes: source.lunchMinutes,
              }
            : schedule,
        ),
        schedulePhase: "idle",
      };
    }
    case "setSchedulePhase":
      return { ...state, schedulePhase: action.phase };
    default:
      return state;
  }
}

export function createWeekdayScheduleFormRows(
  schedule: Pick<
    ScheduleSnapshot,
    "weekdaySchedules" | "shiftStart" | "shiftEnd" | "lunchMinutes" | "workdays"
  >,
): WeekdayScheduleFormRow[] {
  const legacyWorkdays = new Set(parseWorkdays(schedule.workdays));
  const configuredSchedules = new Map<WeekdayScheduleDay, WeekdaySchedule>();

  for (const weekdaySchedule of schedule.weekdaySchedules ?? []) {
    if (isWeekdayScheduleDay(weekdaySchedule.day)) {
      configuredSchedules.set(weekdaySchedule.day, weekdaySchedule);
    }
  }

  return ALL_WORKDAYS.map((day) => {
    const configured = configuredSchedules.get(day);
    const fallbackEnabled =
      legacyWorkdays.size > 0 ? legacyWorkdays.has(day) : DEFAULT_WORKWEEK.has(day);

    return {
      day,
      enabled: configured?.enabled ?? fallbackEnabled,
      shiftStart: configured?.shiftStart ?? schedule.shiftStart ?? DEFAULT_SHIFT_START,
      shiftEnd: configured?.shiftEnd ?? schedule.shiftEnd ?? DEFAULT_SHIFT_END,
      lunchMinutes: String(
        configured?.lunchMinutes ?? schedule.lunchMinutes ?? DEFAULT_LUNCH_MINUTES,
      ),
    };
  });
}

export function buildWeekdaySchedulesInput(
  weekdaySchedules: WeekdayScheduleFormRow[],
): WeekdaySchedule[] {
  return ALL_WORKDAYS.map((day) => {
    const configured = weekdaySchedules.find((schedule) => schedule.day === day);

    return {
      day,
      enabled: configured?.enabled ?? DEFAULT_WORKWEEK.has(day),
      shiftStart: configured?.shiftStart ?? DEFAULT_SHIFT_START,
      shiftEnd: configured?.shiftEnd ?? DEFAULT_SHIFT_END,
      lunchMinutes: Number.parseInt(configured?.lunchMinutes ?? "", 10) || 0,
    };
  });
}

export function getEffectiveWeekStart(
  weekStart: WeekStartPreference,
  timezone: string,
): Exclude<WeekStartPreference, "auto"> {
  return resolveWeekStart(weekStart, timezone);
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
  orderedWorkdays: WeekdayScheduleDay[],
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
    lunchMinutes > 0 ? (((normalizedEnd - lunchMinutes - axisStartMinutes) / totalRange) * 100) : null;
  const lunchHeightPercent = lunchMinutes > 0 ? ((lunchMinutes / totalRange) * 100) : null;

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

function shouldPreferDetectedTimezone(payload: BootstrapPayload, timezone: string): boolean {
  if (timezone !== "UTC") {
    return false;
  }

  return (
    payload.providerStatus.length === 0 &&
    payload.week.length === 0 &&
    payload.streak.window.length === 0 &&
    payload.schedule.shiftStart == null &&
    payload.schedule.shiftEnd == null &&
    payload.schedule.lunchMinutes == null
  );
}

function parseWorkdays(workdays: string): WeekdayScheduleDay[] {
  return workdays
    .split(" - ")
    .map((day) => day.trim())
    .filter(isWeekdayScheduleDay);
}

function isWeekdayScheduleDay(day: string): day is WeekdayScheduleDay {
  return ALL_WORKDAYS.includes(day as WeekdayScheduleDay);
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;

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

export {
  getOrderedWorkdays,
  WEEK_START_OPTIONS,
  type WeekStartPreference,
  type WeekdayCode,
} from "@/shared/utils/utils";
