import * as React from "react";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed.js";
import MapPinned from "lucide-react/dist/esm/icons/map-pinned.js";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadHolidayYear } from "@/lib/tauri";
import { cn, getCountryCodeForTimezone, resolveHolidayCountryCode } from "@/lib/utils";

import type {
  AppPreferences,
  HolidayCountryOption,
  HolidayListItem,
} from "@/types/dashboard";

const MIN_HOLIDAY_YEAR = 2016;
const MAX_HOLIDAY_YEAR = 2031;
const YEAR_SCROLL_THRESHOLD = 120;

const monthLabelFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

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
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const detectedCountryCode = getCountryCodeForTimezone(timezone);
  const resolvedCountryCode = resolveHolidayCountryCode(
    preferences.holidayCountryMode,
    preferences.holidayCountryCode,
    timezone,
  );
  const resolvedCountryLabel =
    countries.find((country) => country.code === resolvedCountryCode)?.label ?? resolvedCountryCode ?? "No country";

  const selectedCountryValue = resolvedCountryCode ?? "";

  const ensureYearLoaded = React.useCallback(
    async (year: number) => {
      if (!resolvedCountryCode || year < MIN_HOLIDAY_YEAR || year > MAX_HOLIDAY_YEAR) {
        return;
      }

      if (loadedYears[year] || loadingYears.includes(year)) {
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

  React.useEffect(() => {
    setLoadedYears({});
    setLoadingYears([]);
    setSelectedDate(undefined);
    setErrorMessage(null);
    setSelectedYear((current) => clampHolidayYear(current));
  }, [resolvedCountryCode]);

  React.useEffect(() => {
    void ensureYearLoaded(selectedYear);
  }, [ensureYearLoaded, selectedYear]);

  React.useEffect(() => {
    setVisibleMonth(getInitialMonthForYear(selectedYear));
    listRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
  }, [selectedYear]);

  const sortedYears = React.useMemo(
    () => Object.keys(loadedYears).map(Number).sort((a, b) => a - b),
    [loadedYears],
  );

  const holidaySections = React.useMemo(
    () =>
      sortedYears.map((year) => ({
        year,
        holidays: loadedYears[year] ?? [],
      })),
    [loadedYears, sortedYears],
  );

  const holidayDates = React.useMemo(
    () =>
      holidaySections.flatMap((section) =>
        section.holidays.map((holiday) => new Date(`${holiday.date}T12:00:00`)),
      ),
    [holidaySections],
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

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (sortedYears.length === 0) {
      return;
    }

    const container = event.currentTarget;
    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];
    const remainingBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    if (container.scrollTop < YEAR_SCROLL_THRESHOLD && minYear > MIN_HOLIDAY_YEAR) {
      void ensureYearLoaded(minYear - 1);
    }

    if (remainingBottom < YEAR_SCROLL_THRESHOLD && maxYear < MAX_HOLIDAY_YEAR) {
      void ensureYearLoaded(maxYear + 1);
    }
  }

  function handleYearChange(nextYear: number) {
    const clampedYear = clampHolidayYear(nextYear);
    setLoadedYears({});
    setLoadingYears([]);
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-end @lg:justify-between">
        <div className="max-w-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <MapPinned className="h-3.5 w-3.5" />
            Holiday source
          </div>
          <p className="text-sm text-muted-foreground">
            Starts with the country detected from your timezone, but you can switch it any time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1 @lg:flex-none @lg:min-w-64">
            <Label className="sr-only">Country</Label>
            <Select value={selectedCountryValue} onValueChange={(value) => void handleCountryChange(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

            <Button
              type="button"
              variant={preferences.holidayCountryMode === "auto" ? "soft" : "ghost"}
              size="sm"
              onClick={() => void handleUseDetectedCountry()}
              disabled={
                !detectedCountryCode ||
                (preferences.holidayCountryMode === "auto" &&
                  preferences.holidayCountryCode === detectedCountryCode)
              }
              className="gap-1.5"
            >
            <LocateFixed className="h-3.5 w-3.5" />
            {preferences.holidayCountryMode === "auto" ? "Detected" : "Use detected"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border bg-muted/25 px-4 py-3 shadow-[var(--shadow-clay)]">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {preferences.holidayCountryMode === "auto" ? "Auto country" : "Manual country"}
          </p>
          <p className="font-display text-lg font-bold text-foreground">{resolvedCountryLabel}</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-2 py-2 shadow-[var(--shadow-clay)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => handleYearChange(selectedYear - 1)}
            disabled={selectedYear <= MIN_HOLIDAY_YEAR}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-24 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Browse year
            </p>
            <p className="font-display text-lg font-bold text-foreground">{selectedYear}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => handleYearChange(selectedYear + 1)}
            disabled={selectedYear >= MAX_HOLIDAY_YEAR}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 @xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-[1.75rem] border-2 border-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_94%,white),var(--color-card))] p-4 shadow-[var(--shadow-clay)]">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Calendar view
            </p>
            <p className="text-sm text-muted-foreground">
              Jump months here, then pick a holiday in the list to focus that date.
            </p>
          </div>

          <Calendar
            mode="single"
            month={visibleMonth}
            selected={selectedDate}
            onSelect={setSelectedDate}
            onMonthChange={handleMonthChange}
            className="w-full border-0 bg-transparent p-0 shadow-none"
            modifiers={{ holiday: holidayDates }}
            modifiersClassNames={{
              holiday:
                "[&>button]:border-primary/35 [&>button]:bg-primary/10 [&>button]:text-foreground [&>button]:shadow-[var(--shadow-clay-inset)]",
            }}
          />

          <div className="rounded-2xl border-2 border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground shadow-[var(--shadow-clay-inset)]">
            <span className="font-semibold text-foreground">{monthLabelFormatter.format(visibleMonth)}</span>
            {selectedDateKey ? ` • Selected ${shortDateFormatter.format(selectedDate ?? visibleMonth)}` : " • Holiday markers stay highlighted"}
          </div>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border-2 border-border bg-card p-4 shadow-[var(--shadow-clay)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Holiday list
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Scroll down for later years and up for earlier ones without loading everything at once.
              </p>
            </div>
            <div className="rounded-xl border-2 border-border bg-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-[var(--shadow-clay-inset)]">
              {holidaySections.reduce((total, section) => total + section.holidays.length, 0)} items
            </div>
          </div>

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-[34rem] overflow-y-auto rounded-2xl border-2 border-border bg-muted/20 p-2 shadow-[var(--shadow-clay-inset)]"
          >
            {errorMessage ? (
              <div className="grid min-h-56 place-items-center rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 text-center text-sm text-muted-foreground">
                {errorMessage}
              </div>
            ) : holidaySections.length === 0 && loadingYears.length === 0 ? (
              <div className="grid min-h-56 place-items-center rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 text-center text-sm text-muted-foreground">
                No holidays available for this country and year window yet.
              </div>
            ) : (
              <div className="space-y-4">
                {holidaySections.map((section) => (
                  <section key={section.year} className="space-y-2">
                    <div className="sticky top-0 z-10 rounded-xl border-2 border-border bg-card/95 px-3 py-2 shadow-[var(--shadow-clay)] backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-base font-bold text-foreground">
                          {section.year}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {section.holidays.length} holidays
                        </span>
                      </div>
                    </div>

                    {section.holidays.length > 0 ? (
                      <div className="grid gap-2">
                        {section.holidays.map((holiday) => {
                          const active = selectedDateKey === holiday.date;
                          return (
                            <button
                              key={`${section.year}-${holiday.date}-${holiday.name}`}
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
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-border bg-card/70 px-4 py-6 text-sm text-muted-foreground">
                        No public holidays were returned for this year.
                      </div>
                    )}
                  </section>
                ))}

                {loadingYears.length > 0 ? (
                  <div className="rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-clay)]">
                    Loading {loadingYears.sort((a, b) => a - b).join(", ")}...
                  </div>
                ) : null}
              </div>
            )}
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
