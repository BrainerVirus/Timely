import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed.js";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { loadHolidayYear } from "@/lib/tauri";
import { cn, getCountryCodeForTimezone, resolveHolidayCountryCode } from "@/lib/utils";

import type { AppPreferences, HolidayCountryOption, HolidayListItem } from "@/types/dashboard";

const MIN_HOLIDAY_YEAR = 2016;
const MAX_HOLIDAY_YEAR = 2031;

interface HolidayPreferencesPanelProps {
  timezone: string;
  weekStartsOn?: 0 | 1 | 5 | 6;
  preferences: AppPreferences;
  countries: HolidayCountryOption[];
  onSavePreferences: (next: AppPreferences) => Promise<void>;
}

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

export function HolidayPreferencesPanel({
  timezone,
  weekStartsOn = 0,
  preferences,
  countries,
  onSavePreferences,
}: HolidayPreferencesPanelProps) {
  const { formatMonthDayWeekday, t } = useI18n();
  const currentYear = new Date().getFullYear();
  const initialYear = clampHolidayYear(currentYear);
  const [state, dispatch] = React.useReducer(holidayPanelReducer, initialYear, createInitialHolidayState);
  const selectedYearForReset = state.selectedYear;

  const detectedCountryCode = getCountryCodeForTimezone(timezone);
  const resolvedCountryCode = resolveHolidayCountryCode(
    preferences.holidayCountryMode,
    preferences.holidayCountryCode,
    timezone,
  );
  const resolvedCountryLabel =
    countries.find((country) => country.code === resolvedCountryCode)?.label ??
    resolvedCountryCode ??
    t("settings.noCountry");

  const countryOptions = React.useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.label,
        // No badge — HolidayCountryOption has no region field, so we render a flat list.
      })),
    [countries],
  );

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

      dispatch({ type: "load_year_error", message });
      dispatch({ type: "finish_loading_year", year });
    },
    [resolvedCountryCode, state.loadedYears, state.loadingYears, t],
  );

  // Clear cache when country changes
  React.useEffect(() => {
    dispatch({ type: "reset_for_country", year: clampHolidayYear(selectedYearForReset) });
  }, [resolvedCountryCode, selectedYearForReset]);

  // Load the current year's holidays whenever selectedYear changes
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

  async function handleCountryChange(value: string) {
    await onSavePreferences({
      ...preferences,
      holidayCountryMode: "manual",
      holidayCountryCode: value,
    });
  }

  async function handleUseDetectedCountry() {
    if (!detectedCountryCode) {
      return;
    }

    await onSavePreferences({
      ...preferences,
      holidayCountryMode: "auto",
      holidayCountryCode: detectedCountryCode,
    });
  }

  function handleYearChange(nextYear: number) {
    const clampedYear = clampHolidayYear(nextYear);
    dispatch({ type: "set_year", year: clampedYear });
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
    dispatch({ type: "set_visible_month", month: new Date(date.getFullYear(), date.getMonth(), 1) });
  }

  return (
    <div className="space-y-4">
      {/* Holiday source — label on its own line, controls in a flex row below */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          {t("settings.holidaySource")}
        </Label>
        <div className="flex flex-wrap items-stretch gap-3">
          <SearchCombobox
            value={resolvedCountryCode ?? ""}
            displayLabel={resolvedCountryLabel}
            options={countryOptions}
            searchPlaceholder={t("common.searchCountry")}
            onChange={(value) => void handleCountryChange(value)}
            className="max-w-[24rem] min-w-48"
          />
          <Button
            type="button"
            variant={preferences.holidayCountryMode === "auto" ? "soft" : "ghost"}
            size="default"
            onClick={() => void handleUseDetectedCountry()}
            disabled={
              !detectedCountryCode ||
              (preferences.holidayCountryMode === "auto" &&
                preferences.holidayCountryCode === detectedCountryCode)
            }
            className="h-[var(--control-height-default)] gap-1.5 self-stretch"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {preferences.holidayCountryMode === "auto"
              ? t("settings.detected")
              : t("settings.useDetected")}
          </Button>
        </div>
      </div>

      {/* Calendar + Holiday list — equal height columns */}
      <div className="grid items-stretch gap-4 @xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Calendar
          mode="single"
          month={state.visibleMonth}
          selected={state.selectedDate}
          onSelect={(date) => dispatch({ type: "set_selected_date", date })}
          onMonthChange={handleMonthChange}
          weekStartsOn={weekStartsOn}
          className="w-full"
          holidays={calendarHolidays}
        />

        {/* Holiday list — fills the same row height as the calendar */}
        <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] shadow-[var(--shadow-card)]">
          {/* Header: title + year pager */}
          <div className="flex shrink-0 items-center justify-between border-b-2 border-[color:var(--color-border-subtle)] px-3 py-2">
            <span className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {t("settings.holidays")}
            </span>
            {/* Year pager — same pattern as worklog PagerControl */}
            <div className="inline-flex items-center gap-1 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] p-1 shadow-[var(--shadow-clay)]">
              <button
                type="button"
                disabled={state.selectedYear <= MIN_HOLIDAY_YEAR}
                onClick={() => handleYearChange(state.selectedYear - 1)}
                className={getCompactIconButtonClassName(
                  false,
                  "rounded-lg border-transparent bg-transparent shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleYearChange(currentYear)}
                className={getNeutralSegmentedControlClassName(
                  false,
                  "rounded-lg border-transparent bg-transparent px-2 hover:bg-[color:var(--color-field-hover)]",
                )}
              >
                {state.selectedYear === currentYear ? t("common.thisYear") : state.selectedYear}
              </button>
              <button
                type="button"
                disabled={state.selectedYear >= MAX_HOLIDAY_YEAR}
                onClick={() => handleYearChange(state.selectedYear + 1)}
                className={getCompactIconButtonClassName(
                  false,
                  "rounded-lg border-transparent bg-transparent shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable list body with top/bottom fade overlays */}
          <div className="relative min-h-0 flex-1">
            {/* Top fade — solid card color fading out downward */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[color:var(--color-panel)]/95 to-transparent" />
            {/* Bottom fade — solid card color fading out upward */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[color:var(--color-panel)]/95 to-transparent" />

            <div className="absolute inset-0 overflow-y-auto overscroll-contain scroll-smooth p-2">
                  {state.errorMessage ? (
                    <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-6 text-center text-sm text-muted-foreground">
                      {state.errorMessage}
                    </div>
                  ) : isLoadingCurrentYear ? (
                <div className="grid min-h-40 place-items-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                  ) : currentHolidays.length === 0 ? (
                    <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-6 text-center text-sm text-muted-foreground">
                      {t("settings.noHolidaysForYear", { year: state.selectedYear })}
                    </div>
                  ) : (
                <div className="grid gap-2">
                  {currentHolidays.map((holiday) => {
                    const active = selectedDateKey === holiday.date;
                    return (
                      <button
                        key={`${holiday.date}-${holiday.name}`}
                        type="button"
                        onClick={() => focusHoliday(holiday)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-all",
                          active
                            ? "border-primary/30 bg-primary/10 text-foreground shadow-[var(--shadow-clay)]"
                            : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] text-foreground shadow-[var(--shadow-card)] hover:bg-[color:var(--color-panel)]",
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{holiday.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatMonthDayWeekday(new Date(`${holiday.date}T12:00:00`))}
                          </p>
                        </div>
                        <span className="rounded-xl border-2 border-warning/70 bg-warning/10 px-2 py-1 text-[11px] font-bold tracking-[0.18em] text-warning uppercase shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_55%,var(--color-border))]">
                          {holiday.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
