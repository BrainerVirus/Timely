import * as React from "react";
import { toast } from "sonner";
import { loadHolidayYear } from "@/app/desktop/TauriService/tauri";

import type { HolidayListItem } from "@/shared/types/dashboard";
import type { useI18n } from "@/app/providers/I18nService/i18n";

const MIN_HOLIDAY_YEAR = 2016;
const MAX_HOLIDAY_YEAR = 2031;

interface HolidayPanelState {
  selectedYear: number;
  visibleMonth: Date;
  selectedDate: Date | undefined;
  loadedYears: Record<number, HolidayListItem[]>;
  loadingYears: number[];
  errorMessage: string | null;
}

type HolidayPanelAction =
  | { type: "reset_for_country"; year: number }
  | { type: "set_year"; year: number }
  | { type: "set_visible_month"; month: Date }
  | { type: "set_selected_date"; date: Date | undefined }
  | { type: "start_loading_year"; year: number }
  | { type: "finish_loading_year"; year: number }
  | { type: "load_year_success"; year: number; holidays: HolidayListItem[] }
  | { type: "load_year_error"; message: string | null };

type Translate = ReturnType<typeof useI18n>["t"];

export function useHolidayPanelState(
  resolvedCountryCode: string | undefined,
  t: Translate,
) {
  const currentYear = new Date().getFullYear();
  const [state, dispatch] = React.useReducer(holidayPanelReducer, clampHolidayYear(currentYear), createInitialHolidayState);
  const selectedYearForReset = state.selectedYear;

  const ensureYearLoaded = React.useCallback(
    async (year: number) => {
      if (!resolvedCountryCode || year < MIN_HOLIDAY_YEAR || year > MAX_HOLIDAY_YEAR) {
        return;
      }

      if (state.loadedYears[year] !== undefined || state.loadingYears.includes(year)) {
        return;
      }

      dispatch({ type: "start_loading_year", year });

      let holidays: HolidayListItem[] | null = null;
      let message: string | null = null;

      try {
        const payload = await loadHolidayYear(resolvedCountryCode, year);
        holidays = payload.holidays;
      } catch (error) {
        message = error instanceof Error ? error.message : t("settings.couldNotLoadHolidays");
      }

      if (holidays) {
        dispatch({ type: "load_year_success", year, holidays });
        return;
      }

      if (message) {
        toast.error(t("settings.couldNotLoadHolidays"), {
          description: message,
          duration: 7000,
        });
      }
      dispatch({ type: "load_year_error", message });
      dispatch({ type: "finish_loading_year", year });
    },
    [resolvedCountryCode, state.loadedYears, state.loadingYears, t],
  );

  React.useEffect(() => {
    dispatch({ type: "reset_for_country", year: clampHolidayYear(selectedYearForReset) });
  }, [resolvedCountryCode, selectedYearForReset]);

  React.useEffect(() => {
    void ensureYearLoaded(state.selectedYear);
  }, [ensureYearLoaded, state.selectedYear]);

  const currentHolidays = state.loadedYears[state.selectedYear] ?? [];
  const isLoadingCurrentYear = state.loadingYears.includes(state.selectedYear);
  const calendarHolidays = React.useMemo(
    () =>
      Object.values(state.loadedYears)
        .flat()
        .map((holiday) => ({
          date: new Date(`${holiday.date}T12:00:00`),
          label: holiday.name,
        })),
    [state.loadedYears],
  );
  const selectedDateKey = state.selectedDate ? toDateKey(state.selectedDate) : null;

  function handleYearChange(nextYear: number) {
    dispatch({ type: "set_year", year: clampHolidayYear(nextYear) });
  }

  function handleMonthChange(nextMonth: Date) {
    dispatch({ type: "set_visible_month", month: nextMonth });
    const nextYear = clampHolidayYear(nextMonth.getFullYear());
    if (nextYear !== state.selectedYear) {
      handleYearChange(nextYear);
    }
  }

  function focusHoliday(holiday: HolidayListItem) {
    const date = new Date(`${holiday.date}T12:00:00`);
    dispatch({ type: "set_selected_date", date });
    dispatch({
      type: "set_visible_month",
      month: new Date(date.getFullYear(), date.getMonth(), 1),
    });
  }

  return {
    calendarHolidays,
    currentHolidays,
    currentYear,
    handleMonthChange,
    handleYearChange,
    isLoadingCurrentYear,
    selectedDateKey,
    state,
    focusHoliday,
    setSelectedDate: (date: Date | undefined) => dispatch({ type: "set_selected_date", date }),
  };
}

function clampHolidayYear(year: number): number {
  return Math.min(MAX_HOLIDAY_YEAR, Math.max(MIN_HOLIDAY_YEAR, year));
}

function getInitialMonthForYear(year: number): Date {
  const today = new Date();
  if (today.getFullYear() === year) {
    return new Date(year, today.getMonth(), 1);
  }

  return new Date(year, 0, 1);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createInitialHolidayState(initialYear: number): HolidayPanelState {
  return {
    selectedYear: initialYear,
    visibleMonth: getInitialMonthForYear(initialYear),
    selectedDate: undefined,
    loadedYears: {},
    loadingYears: [],
    errorMessage: null,
  };
}

function holidayPanelReducer(
  state: HolidayPanelState,
  action: HolidayPanelAction,
): HolidayPanelState {
  switch (action.type) {
    case "reset_for_country":
      return createInitialHolidayState(action.year);
    case "set_year":
      return {
        ...state,
        selectedYear: action.year,
        visibleMonth: getInitialMonthForYear(action.year),
        selectedDate: undefined,
      };
    case "set_visible_month":
      return { ...state, visibleMonth: action.month };
    case "set_selected_date":
      return { ...state, selectedDate: action.date };
    case "start_loading_year":
      return {
        ...state,
        errorMessage: null,
        loadingYears: state.loadingYears.includes(action.year)
          ? state.loadingYears
          : [...state.loadingYears, action.year],
      };
    case "finish_loading_year":
      return {
        ...state,
        loadingYears: state.loadingYears.filter((year) => year !== action.year),
      };
    case "load_year_success":
      return {
        ...state,
        errorMessage: null,
        loadedYears: {
          ...state.loadedYears,
          [action.year]: action.holidays,
        },
        loadingYears: state.loadingYears.filter((year) => year !== action.year),
      };
    case "load_year_error":
      return {
        ...state,
        errorMessage: action.message,
      };
    default:
      return state;
  }
}
