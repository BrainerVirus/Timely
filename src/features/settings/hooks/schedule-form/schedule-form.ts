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

export {
  getOrderedWorkdays,
  WEEK_START_OPTIONS,
  type WeekStartPreference,
  type WeekdayCode,
} from "@/shared/utils/utils";
