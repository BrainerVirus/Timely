import { cva } from "class-variance-authority";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { enUS, es, pt } from "react-day-picker/locale";
import {
  TimelyDayButton,
  toDateKey,
} from "@/shared/ui/Calendar/internal/TimelyDayButton/TimelyDayButton";
import { cn } from "@/shared/lib/utils";

import type { DayButtonProps, Labels } from "react-day-picker";

/** Labels for calendar navigation. Pass resolved strings from i18n. */
export interface CalendarLabels {
  labelNav: () => string;
  labelNext: () => string;
  labelPrevious: () => string;
}

const navButtonVariants = cva(
  "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border-subtle bg-panel p-0 text-muted-foreground shadow-clay transition hover:border-border-strong hover:bg-panel-elevated hover:text-foreground active:translate-y-px active:shadow-none",
);

interface CalendarHoliday {
  date: Date;
  label: string;
}

interface ChevronProps {
  orientation?: "left" | "right" | "up" | "down";
  [key: string]: unknown;
}

function CalendarChevron({ orientation, ...chevronProps }: ChevronProps) {
  return orientation === "left" ? (
    <ChevronLeft className="h-4 w-4" {...chevronProps} />
  ) : (
    <ChevronRight className="h-4 w-4" {...chevronProps} />
  );
}

/** Omit over unions so single/range/mode branches keep `selected` and other mode fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type CalendarProps = DistributiveOmit<
  React.ComponentProps<typeof DayPicker>,
  "locale" | "labels"
> & {
  holidays?: CalendarHoliday[];
  /** Locale for date formatting. E.g. "en", "es", "pt". */
  locale?: string;
  /** Labels for nav/next/previous. Defaults to English when omitted. */
  labels?: CalendarLabels;
};

const EMPTY_HOLIDAYS: CalendarHoliday[] = [];

const DEFAULT_LABELS: CalendarLabels = {
  labelNav: () => "Calendar",
  labelNext: () => "Next month",
  labelPrevious: () => "Previous month",
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  holidays = EMPTY_HOLIDAYS,
  modifiers,
  components,
  locale: localeProp,
  labels = DEFAULT_LABELS,
  ...props
}: CalendarProps) {
  const resolvedShowOutsideDays = props.mode === "range" ? false : showOutsideDays;
  const appLocale = localeProp ?? "en";
  const holidayMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const holiday of holidays) {
      map.set(toDateKey(holiday.date), holiday.label);
    }
    return map;
  }, [holidays]);

  const holidayDates = React.useMemo(() => holidays.map((holiday) => holiday.date), [holidays]);
  const localeMap = {
    es,
    pt,
  };
  const dayPickerLocale = localeMap[appLocale as keyof typeof localeMap] ?? enUS;

  const DayButtonWithContext = React.useCallback(
    (dayProps: DayButtonProps) => <TimelyDayButton {...dayProps} holidayMap={holidayMap} />,
    [holidayMap],
  );

  return (
    <DayPicker
      locale={dayPickerLocale}
      showOutsideDays={resolvedShowOutsideDays}
      className={cn(
        "rounded-2xl border-2 border-border-subtle bg-panel-elevated p-3 shadow-card",
        className,
      )}
      modifiers={{
        holiday: holidayDates,
        ...modifiers,
      }}
      classNames={{
        root: "w-full",
        months: "relative flex w-full flex-col gap-4 sm:flex-row",
        month: "w-full min-w-0 space-y-3",
        month_caption: "flex h-8 items-center justify-center px-10",
        caption_label: "font-display text-sm font-semibold text-foreground",
        nav: "pointer-events-none absolute inset-x-1 top-0 z-10 flex h-8 items-center justify-between",
        button_previous: navButtonVariants(),
        button_next: navButtonVariants(),
        month_grid: "w-full table-fixed border-collapse",
        weekdays: "grid grid-cols-7",
        weekday:
          "flex h-9 items-center justify-center text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase",
        weeks: "mt-2 space-y-1",
        week: "grid grid-cols-7",
        day: "relative aspect-square min-w-0 p-[2px] text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "relative inline-flex size-full min-h-9 cursor-pointer items-center justify-center rounded-xl border border-transparent p-0 font-medium leading-none outline-none transition-[background-color,color,border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:translate-y-[1px]",
        today: "",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/45",
        hidden: "invisible",
        selected: "",
        range_start: "rounded-s-xl bg-[color-mix(in_oklab,var(--color-primary)_16%,transparent)]",
        range_middle: "bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]",
        range_end: "rounded-e-xl bg-[color-mix(in_oklab,var(--color-primary)_16%,transparent)]",
        dropdowns: "flex items-center gap-2",
        dropdown_root:
          "relative inline-flex items-center rounded-lg border-2 border-border-subtle bg-panel px-2 py-1 text-sm font-semibold shadow-clay",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        months_dropdown: "",
        years_dropdown: "",
        chevron: "size-4",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        DayButton: DayButtonWithContext,
        ...components,
      }}
      labels={labels as Partial<Labels>}
      {...props}
    />
  );
}
