import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed.js";
import * as React from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/lib/control-styles";
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
  const [selectedYear, setSelectedYear] = React.useState(initialYear);
  const [visibleMonth, setVisibleMonth] = React.useState(() => getInitialMonthForYear(initialYear));
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [loadedYears, setLoadedYears] = React.useState<Record<number, HolidayListItem[]>>({});
  const [loadingYears, setLoadingYears] = React.useState<number[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

      if (loadedYears[year] !== undefined || loadingYears.includes(year)) {
        return;
      }

      setLoadingYears((current) => [...current, year]);
      try {
        const payload = await loadHolidayYear(resolvedCountryCode, year);
        setLoadedYears((current) => ({ ...current, [year]: payload.holidays }));
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t("settings.couldNotLoadHolidays"));
      } finally {
        setLoadingYears((current) => current.filter((value) => value !== year));
      }
    },
    [loadedYears, loadingYears, resolvedCountryCode, t],
  );

  // Clear cache when country changes
  React.useEffect(() => {
    setLoadedYears({});
    setLoadingYears([]);
    setSelectedDate(undefined);
    setErrorMessage(null);
    setSelectedYear((current) => clampHolidayYear(current));
  }, [resolvedCountryCode]);

  // Load the current year's holidays whenever selectedYear changes
  React.useEffect(() => {
    void ensureYearLoaded(selectedYear);
  }, [ensureYearLoaded, selectedYear]);

  // Keep calendar in sync when year changes
  React.useEffect(() => {
    setVisibleMonth(getInitialMonthForYear(selectedYear));
  }, [selectedYear]);

  const currentHolidays = loadedYears[selectedYear] ?? [];
  const isLoadingCurrentYear = loadingYears.includes(selectedYear);

  const calendarHolidays = React.useMemo(
    () =>
      Object.values(loadedYears)
        .flat()
        .map((holiday) => ({
          date: new Date(`${holiday.date}T12:00:00`),
          label: holiday.name,
        })),
    [loadedYears],
  );

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

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
    setSelectedYear(clampedYear);
    setSelectedDate(undefined);
  }

  function handleMonthChange(nextMonth: Date) {
    setVisibleMonth(nextMonth);
    const nextYear = clampHolidayYear(nextMonth.getFullYear());
    if (nextYear !== selectedYear) {
      handleYearChange(nextYear);
    }
  }

  function focusHoliday(holiday: HolidayListItem) {
    const date = new Date(`${holiday.date}T12:00:00`);
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
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
            {preferences.holidayCountryMode === "auto" ? t("settings.detected") : t("settings.useDetected")}
          </Button>
        </div>
      </div>

      {/* Calendar + Holiday list — equal height columns */}
      <div className="grid items-stretch gap-4 @xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Calendar
          mode="single"
          month={visibleMonth}
          selected={selectedDate}
          onSelect={setSelectedDate}
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
                disabled={selectedYear <= MIN_HOLIDAY_YEAR}
                onClick={() => handleYearChange(selectedYear - 1)}
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
                  {selectedYear === currentYear ? t("common.thisYear") : selectedYear}
                </button>
              <button
                type="button"
                disabled={selectedYear >= MAX_HOLIDAY_YEAR}
                onClick={() => handleYearChange(selectedYear + 1)}
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

            <div className="absolute inset-0 overflow-y-auto p-2 scroll-smooth overscroll-contain">
              {errorMessage ? (
                 <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-6 text-center text-sm text-muted-foreground">
                  {errorMessage}
                </div>
              ) : isLoadingCurrentYear ? (
                <div className="grid min-h-40 place-items-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : currentHolidays.length === 0 ? (
                 <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-6 text-center text-sm text-muted-foreground">
                  {t("settings.noHolidaysForYear", { year: selectedYear })}
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
