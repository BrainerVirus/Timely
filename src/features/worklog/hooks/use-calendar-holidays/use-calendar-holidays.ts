import { useEffect, useMemo, useReducer } from "react";
import { loadHolidayYear } from "@/app/desktop/TauriService/tauri";
import { toDateInputValue } from "@/features/worklog/lib/worklog-date-utils";

import type { DayOverview, HolidayListItem } from "@/shared/types/dashboard";

interface HolidayYearsState {
  loadedYears: Record<number, HolidayListItem[]>;
  loadingYears: number[];
}

type HolidayYearsAction =
  | { type: "reset" }
  | { type: "start_loading"; years: number[] }
  | { type: "load_success"; year: number; holidays: HolidayListItem[] }
  | { type: "load_finished"; year: number };

const initialHolidayYearsState: HolidayYearsState = {
  loadedYears: {},
  loadingYears: [],
};

interface UseCalendarHolidaysOptions {
  activeDate: Date;
  currentSnapshotDays: DayOverview[];
  displayMode: "day" | "week" | "period";
  holidayCountryCode: string | undefined;
  visibleMonth: Date;
}

export function useCalendarHolidays({
  activeDate,
  currentSnapshotDays,
  displayMode,
  holidayCountryCode,
  visibleMonth,
}: UseCalendarHolidaysOptions) {
  const visibleHolidayYears = useMemo(() => {
    if (displayMode === "period") {
      const secondMonth = new Date(visibleMonth);
      secondMonth.setMonth(secondMonth.getMonth() + 1);
      return Array.from(new Set([visibleMonth.getFullYear(), secondMonth.getFullYear()]));
    }

    return [activeDate.getFullYear()];
  }, [activeDate, displayMode, visibleMonth]);

  const [holidayYearsState, dispatchHolidayYears] = useReducer(
    holidayYearsReducer,
    initialHolidayYearsState,
  );

  useEffect(() => {
    if (!holidayCountryCode) {
      dispatchHolidayYears({ type: "reset" });
      return;
    }

    const yearsToLoad = visibleHolidayYears.filter(
      (year) =>
        holidayYearsState.loadedYears[year] == null &&
        !holidayYearsState.loadingYears.includes(year),
    );

    if (yearsToLoad.length === 0) {
      return;
    }

    dispatchHolidayYears({ type: "start_loading", years: yearsToLoad });

    yearsToLoad.forEach((year) => {
      void loadHolidayYear(holidayCountryCode, year)
        .then((holidayYear) => {
          dispatchHolidayYears({
            type: "load_success",
            year,
            holidays: holidayYear.holidays,
          });
        })
        .catch(() => {
          // best effort; snapshot-backed holidays still render
        })
        .finally(() => {
          dispatchHolidayYears({ type: "load_finished", year });
        });
    });
  }, [
    holidayCountryCode,
    holidayYearsState.loadedYears,
    holidayYearsState.loadingYears,
    visibleHolidayYears,
  ]);

  return useMemo(() => {
    const holidayDaysFromSnapshot = currentSnapshotDays
      .filter((day) => Boolean(day.holidayName))
      .map((day) => ({
        date: new Date(`${day.date}T12:00:00`),
        label: day.holidayName ?? "",
      }));

    const holidayDaysFromYears = Object.values(holidayYearsState.loadedYears)
      .flat()
      .map((holiday) => ({
        date: new Date(`${holiday.date}T12:00:00`),
        label: holiday.name,
      }));

    const merged = new Map<string, { date: Date; label: string }>();
    for (const holiday of [...holidayDaysFromYears, ...holidayDaysFromSnapshot]) {
      merged.set(toDateInputValue(holiday.date), holiday);
    }

    return Array.from(merged.values());
  }, [currentSnapshotDays, holidayYearsState.loadedYears]);
}

function holidayYearsReducer(
  state: HolidayYearsState,
  action: HolidayYearsAction,
): HolidayYearsState {
  switch (action.type) {
    case "reset":
      return initialHolidayYearsState;
    case "start_loading":
      return {
        ...state,
        loadingYears: Array.from(new Set([...state.loadingYears, ...action.years])).sort(
          (a, b) => a - b,
        ),
      };
    case "load_success":
      return {
        ...state,
        loadedYears: {
          ...state.loadedYears,
          [action.year]: action.holidays,
        },
      };
    case "load_finished":
      return {
        ...state,
        loadingYears: state.loadingYears.filter((year) => year !== action.year),
      };
    default:
      return state;
  }
}
