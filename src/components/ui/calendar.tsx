import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import * as React from "react";
import { enUS, es, pt } from "react-day-picker/locale";
import { DayButton, DayPicker } from "react-day-picker";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DayButtonProps } from "react-day-picker";

export interface CalendarHoliday {
  date: Date;
  label: string;
}

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  holidays?: CalendarHoliday[];
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  holidays = [],
  modifiers,
  components,
  ...props
}: CalendarProps) {
  const { locale: appLocale, t } = useI18n();
  const holidayMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const holiday of holidays) {
      map.set(toDateKey(holiday.date), holiday.label);
    }
    return map;
  }, [holidays]);

  const holidayDates = React.useMemo(() => holidays.map((holiday) => holiday.date), [holidays]);
  const dayPickerLocale = appLocale === "es" ? es : appLocale === "pt" ? pt : enUS;

  return (
    <DayPicker
      locale={dayPickerLocale}
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-clay)]",
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
        button_previous:
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-card p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:bg-muted hover:text-foreground active:translate-y-[1px] active:shadow-none",
        button_next:
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-card p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:bg-muted hover:text-foreground active:translate-y-[1px] active:shadow-none",
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
        range_start:
          "rounded-s-xl bg-[color-mix(in_oklab,var(--color-primary)_16%,transparent)]",
        range_middle:
          "bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]",
        range_end: "rounded-e-xl bg-[color-mix(in_oklab,var(--color-primary)_16%,transparent)]",
        dropdowns: "flex items-center gap-2",
        dropdown_root:
          "relative inline-flex items-center rounded-lg border-2 border-border bg-card px-2 py-1 text-sm font-semibold",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        months_dropdown: "",
        years_dropdown: "",
        chevron: "size-4",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
        DayButton: (dayButtonProps) => (
          <TimelyDayButton {...dayButtonProps} holidayMap={holidayMap} />
        ),
        ...components,
      }}
      labels={{
        labelNav: () => t("common.calendar"),
        labelNext: () => t("common.next"),
        labelPrevious: () => t("common.previous"),
      }}
      {...props}
    />
  );
}

function TimelyDayButton({
  day,
  modifiers,
  className,
  children,
  holidayMap,
  ...props
}: DayButtonProps & {
  holidayMap: Map<string, string>;
}) {
  const holidayName = modifiers.holiday ? holidayMap.get(toDateKey(day.date)) : undefined;
  const isRangeStart = Boolean(modifiers.range_start);
  const isRangeEnd = Boolean(modifiers.range_end);
  const isRangeEndpoint = isRangeStart || isRangeEnd;
  const isRangeMiddle = Boolean(modifiers.range_middle) && !isRangeEndpoint;
  const isSelected = Boolean(modifiers.selected);
  const isToday = Boolean(modifiers.today);
  const isHoliday = Boolean(modifiers.holiday);
  const isOutside = Boolean(modifiers.outside);
  const isDisabled = Boolean(modifiers.disabled);

  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        className,
        !isOutside && !isDisabled && !isSelected && !isRangeMiddle && "text-foreground",
        !isOutside && !isDisabled && !isSelected && !isRangeMiddle &&
          "hover:bg-muted hover:shadow-[var(--shadow-clay-inset)] focus-visible:bg-muted",
        isOutside && "text-muted-foreground/45",
        isDisabled && "cursor-not-allowed text-muted-foreground/35",
        isToday &&
          !isSelected &&
          !isRangeMiddle &&
          "border-primary/45 bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary focus-visible:bg-primary/16",
        isHoliday && !isSelected && !isRangeEndpoint && "font-semibold text-warning",
        isHoliday &&
          !isSelected &&
          !isRangeEndpoint &&
          !isRangeMiddle &&
          "hover:bg-warning/10 hover:text-warning focus-visible:bg-warning/12",
        isRangeMiddle &&
          "rounded-none border-transparent bg-transparent text-foreground shadow-none hover:rounded-xl hover:bg-primary/12 hover:shadow-none focus-visible:rounded-xl focus-visible:bg-primary/14",
        isRangeMiddle && isHoliday && "text-warning",
        isSelected &&
          !isRangeMiddle &&
          "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] hover:bg-primary focus-visible:bg-primary",
        isToday &&
          isSelected &&
          "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-card)_35%,transparent)_inset,var(--shadow-button-primary)]",
      )}
      title={holidayName}
      {...props}
    >
      <span className="pointer-events-none leading-none">{children}</span>
    </DayButton>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
