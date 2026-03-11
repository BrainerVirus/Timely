import * as React from "react";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed.js";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { loadHolidayYear } from "@/lib/tauri";
import { cn, getCountryCodeForTimezone, resolveHolidayCountryCode } from "@/lib/utils";

import type {
  AppPreferences,
  HolidayCountryOption,
  HolidayListItem,
} from "@/types/dashboard";

const MIN_HOLIDAY_YEAR = 2016;
const MAX_HOLIDAY_YEAR = 2031;

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  weekday: "short",
});

interface HolidayPreferencesPanelProps {
  timezone: string;
  preferences: AppPreferences;
  countries: HolidayCountryOption[];
  onSavePreferences: (next: AppPreferences) => Promise<void>;
}

export function HolidayPreferencesPanel({
  timezone,
  preferences,
  countries,
  onSavePreferences,
}: HolidayPreferencesPanelProps) {
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
    "No country";

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
        setErrorMessage(error instanceof Error ? error.message : "Could not load holidays.");
      } finally {
        setLoadingYears((current) => current.filter((value) => value !== year));
      }
    },
    [loadedYears, loadingYears, resolvedCountryCode],
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

  const holidayDates = React.useMemo(
    () =>
      Object.values(loadedYears)
        .flat()
        .map((holiday) => new Date(`${holiday.date}T12:00:00`)),
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
          Holiday source
        </Label>
        <div className="flex flex-wrap items-stretch gap-3">
          <SearchCombobox
            value={resolvedCountryCode ?? ""}
            displayLabel={resolvedCountryLabel}
            options={countryOptions}
            searchPlaceholder="Search country"
            onChange={(value) => void handleCountryChange(value)}
            className="min-w-48 max-w-[24rem]"
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
            className="gap-1.5 self-stretch"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {preferences.holidayCountryMode === "auto" ? "Detected" : "Use detected"}
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
          className="w-full"
          modifiers={{ holiday: holidayDates }}
          modifiersClassNames={{
            holiday:
              "[&>button]:border-primary/35 [&>button]:bg-primary/10 [&>button]:text-foreground [&>button]:shadow-[var(--shadow-clay-inset)]",
          }}
        />

        {/* Holiday list — fills the same row height as the calendar */}
        <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-muted/20 shadow-[var(--shadow-clay),var(--shadow-clay-inset)]">
          {/* Header: title + year pager */}
          <div className="flex shrink-0 items-center justify-between border-b-2 border-border px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Holidays
            </span>
            {/* Year pager — same pattern as worklog PagerControl */}
            <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border bg-card p-1 shadow-[var(--shadow-clay)]">
              <button
                type="button"
                disabled={selectedYear <= MIN_HOLIDAY_YEAR}
                onClick={() => handleYearChange(selectedYear - 1)}
                className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px] disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleYearChange(currentYear)}
                className="cursor-pointer rounded-lg border-2 border-transparent px-2 py-1 text-xs font-bold text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
              >
                {selectedYear === currentYear ? "This year" : selectedYear}
              </button>
              <button
                type="button"
                disabled={selectedYear >= MAX_HOLIDAY_YEAR}
                onClick={() => handleYearChange(selectedYear + 1)}
                className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px] disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable list body with top/bottom fade overlays */}
          <ScrollFade className="min-h-0 flex-1" scrollClassName="p-2">
            {errorMessage ? (
              <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 text-center text-sm text-muted-foreground">
                {errorMessage}
              </div>
            ) : isLoadingCurrentYear ? (
              <div className="grid min-h-40 place-items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : currentHolidays.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 text-center text-sm text-muted-foreground">
                No holidays available for {selectedYear}.
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
                          : "border-border bg-card text-foreground shadow-[var(--shadow-clay)] hover:bg-muted",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{holiday.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {shortDateFormatter.format(new Date(`${holiday.date}T12:00:00`))}
                        </p>
                      </div>
                      <span className="rounded-xl border-2 border-border bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-[var(--shadow-clay-inset)]">
                        {holiday.date.slice(5)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollFade>
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
