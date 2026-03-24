import {
  deriveInitialWeekStart,
  getAutoTimezone,
  normalizeWeekStart,
  resolveTimezone,
  resolveWeekStart,
  type WeekStartPreference,
} from "@/shared/utils/utils";

import type { BootstrapPayload } from "@/types/dashboard";

export const ALL_WORKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type SchedulePhase = "idle" | "saving" | "saved";

interface ScheduleFormState {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  weekStart: WeekStartPreference;
  schedulePhase: SchedulePhase;
}

type ScheduleFormAction =
  | { type: "setShiftStart"; value: string }
  | { type: "setShiftEnd"; value: string }
  | { type: "setLunchMinutes"; value: string }
  | { type: "setTimezone"; value: string }
  | { type: "setWeekStart"; value: WeekStartPreference }
  | { type: "toggleWorkday"; day: string }
  | { type: "setSchedulePhase"; phase: SchedulePhase };

export function createInitialScheduleFormState(payload: BootstrapPayload): ScheduleFormState {
  const currentWorkdays = parseWorkdays(payload.schedule.workdays);
  const timezone = deriveInitialScheduleTimezone(payload);

  return {
    shiftStart: payload.schedule.shiftStart ?? "09:00",
    shiftEnd: payload.schedule.shiftEnd ?? "18:00",
    lunchMinutes: String(payload.schedule.lunchMinutes ?? 60),
    workdays: currentWorkdays.length > 0 ? currentWorkdays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
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
    case "setShiftStart":
      return { ...state, shiftStart: action.value, schedulePhase: "idle" };
    case "setShiftEnd":
      return { ...state, shiftEnd: action.value, schedulePhase: "idle" };
    case "setLunchMinutes":
      return { ...state, lunchMinutes: action.value, schedulePhase: "idle" };
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
    case "toggleWorkday":
      return {
        ...state,
        workdays: state.workdays.includes(action.day)
          ? state.workdays.filter((day) => day !== action.day)
          : [...state.workdays, action.day],
        schedulePhase: "idle",
      };
    case "setSchedulePhase":
      return { ...state, schedulePhase: action.phase };
    default:
      return state;
  }
}

function parseWorkdays(workdays: string): string[] {
  return workdays
    .split(" - ")
    .map((day) => day.trim())
    .filter(Boolean);
}

export function getEffectiveWeekStart(
  weekStart: WeekStartPreference,
  timezone: string,
): Exclude<WeekStartPreference, "auto"> {
  return resolveWeekStart(weekStart, timezone);
}

export function formatNetHours(shiftStart: string, shiftEnd: string, lunchMinutes: string): string {
  const startMinutes = parseTimeToMinutes(shiftStart);
  const endMinutes = parseTimeToMinutes(shiftEnd);

  if (startMinutes === null || endMinutes === null) {
    return "--";
  }

  const shiftMinutes =
    endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  const netMinutes = Math.max(shiftMinutes - (Number.parseInt(lunchMinutes) || 0), 0);
  return (netMinutes / 60).toFixed(1);
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

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;

  const hours = Number.parseInt(parts[0]);
  const minutes = Number.parseInt(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export { getOrderedWorkdays, WEEK_START_OPTIONS, type WeekStartPreference } from "@/shared/utils/utils";
