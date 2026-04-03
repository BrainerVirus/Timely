import {
  clampDateToRange,
  getMonthRange,
  shiftDate,
  shiftRange,
  startOfWeek,
  type PeriodRangeState,
} from "@/features/worklog/lib/worklog-date-utils";

import type { WorklogMode } from "@/shared/types/dashboard";
import type { DateRange } from "react-day-picker";

export type ResolvedWorklogMode = "day" | "week" | "period";

interface DayModeState {
  selectedDate: Date;
  visibleMonth: Date;
  calendarOpen: boolean;
}

interface WeekModeState {
  selectedDate: Date;
  visibleMonth: Date;
  calendarOpen: boolean;
}

interface PeriodModeState {
  selectedDate: Date;
  committedRange: PeriodRangeState;
  draftRange: DateRange | undefined;
  calendarOpen: boolean;
  visibleMonth: Date;
}

export interface WorklogUiState {
  day: DayModeState;
  week: WeekModeState;
  period: PeriodModeState;
}

type WorklogUiAction =
  | { type: "set_day_selected_date"; date: Date }
  | { type: "set_day_visible_month"; month: Date }
  | { type: "set_day_calendar_open"; open: boolean }
  | { type: "set_week_selected_date"; date: Date }
  | { type: "set_week_visible_month"; month: Date }
  | { type: "set_week_calendar_open"; open: boolean }
  | { type: "set_period_calendar_open"; open: boolean }
  | { type: "set_period_visible_month"; month: Date }
  | { type: "set_period_draft_range"; range: DateRange | undefined }
  | { type: "commit_period_range"; range: PeriodRangeState }
  | { type: "shift_period"; days: number }
  | { type: "reset_current_period"; date: Date }
  | { type: "reset_ui_state"; date: Date };

export function createInitialWorklogUiState(today: Date): WorklogUiState {
  return {
    day: createInitialDayModeState(today),
    week: createInitialWeekModeState(today),
    period: createInitialPeriodModeState(today),
  };
}

export function worklogUiReducer(
  state: WorklogUiState,
  action: WorklogUiAction,
): WorklogUiState {
  switch (action.type) {
    case "set_day_selected_date":
      return {
        ...state,
        day: { ...state.day, selectedDate: action.date, visibleMonth: action.date },
      };
    case "set_day_visible_month":
      return { ...state, day: { ...state.day, visibleMonth: action.month } };
    case "set_day_calendar_open":
      return { ...state, day: { ...state.day, calendarOpen: action.open } };
    case "set_week_calendar_open":
      return { ...state, week: { ...state.week, calendarOpen: action.open } };
    case "set_period_calendar_open":
      return {
        ...state,
        period: {
          ...state.period,
          calendarOpen: action.open,
          draftRange: undefined,
          visibleMonth: action.open ? state.period.committedRange.from : state.period.visibleMonth,
        },
      };
    case "set_week_selected_date":
      return {
        ...state,
        week: { ...state.week, selectedDate: action.date, visibleMonth: action.date },
      };
    case "set_week_visible_month":
      return { ...state, week: { ...state.week, visibleMonth: action.month } };
    case "set_period_visible_month":
      return { ...state, period: { ...state.period, visibleMonth: action.month } };
    case "set_period_draft_range":
      return { ...state, period: { ...state.period, draftRange: action.range } };
    case "commit_period_range":
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: action.range,
          selectedDate: clampDateToRange(state.period.selectedDate, action.range),
          draftRange: undefined,
          calendarOpen: false,
          visibleMonth: action.range.from,
        },
      };
    case "shift_period": {
      const nextRange = shiftRange(state.period.committedRange, action.days);
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: nextRange,
          selectedDate: clampDateToRange(
            shiftDate(state.period.selectedDate, action.days),
            nextRange,
          ),
          draftRange: undefined,
          visibleMonth: nextRange.from,
        },
      };
    }
    case "reset_current_period": {
      const nextRange = getMonthRange(action.date);
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: nextRange,
          selectedDate: clampDateToRange(action.date, nextRange),
          draftRange: undefined,
          visibleMonth: nextRange.from,
        },
      };
    }
    case "reset_ui_state":
      return createInitialWorklogUiState(action.date);
    default:
      return state;
  }
}

export function normalizeMode(mode: WorklogMode): ResolvedWorklogMode {
  if (mode === "week") return "week";
  if (mode === "period" || mode === "month" || mode === "range") return "period";
  return "day";
}

function createInitialDayModeState(today: Date): DayModeState {
  return {
    selectedDate: today,
    visibleMonth: today,
    calendarOpen: false,
  };
}

function createInitialWeekModeState(today: Date): WeekModeState {
  const weekStart = startOfWeek(today, undefined, "UTC");
  return {
    selectedDate: weekStart,
    visibleMonth: weekStart,
    calendarOpen: false,
  };
}

function createInitialPeriodModeState(today: Date): PeriodModeState {
  const currentPeriod = getMonthRange(today);

  return {
    selectedDate: clampDateToRange(today, currentPeriod),
    committedRange: currentPeriod,
    draftRange: undefined,
    calendarOpen: false,
    visibleMonth: currentPeriod.from,
  };
}
