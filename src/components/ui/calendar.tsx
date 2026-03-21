import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import * as React from "react";
import { DayButton, DayPicker } from "react-day-picker";
import { enUS, es, pt } from "react-day-picker/locale";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DayButtonProps } from "react-day-picker";

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

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  holidays?: CalendarHoliday[];
};

const EMPTY_HOLIDAYS: CalendarHoliday[] = [];

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  holidays = EMPTY_HOLIDAYS,
  modifiers,
  components,
  ...props
}: CalendarProps) {
  const { locale: appLocale, t } = useI18n();
  const resolvedShowOutsideDays = props.mode === "range" ? false : showOutsideDays;
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
        "rounded-2xl border-2 border-(--color-border-subtle) bg-panel-elevated p-3 shadow-(--shadow-card)",
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
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-0 text-muted-foreground shadow-[var(--shadow-clay)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground active:translate-y-[1px] active:shadow-none",
        button_next:
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-0 text-muted-foreground shadow-[var(--shadow-clay)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground active:translate-y-[1px] active:shadow-none",
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
          "relative inline-flex items-center rounded-lg border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-2 py-1 text-sm font-semibold shadow-[var(--shadow-clay)]",
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
      labels={{
        labelNav: () => t("common.calendar"),
        labelNext: () => t("common.next"),
        labelPrevious: () => t("common.previous"),
      }}
      {...props}
    />
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface TimelyDayButtonProps extends DayButtonProps {
  holidayMap: Map<string, string>;
}

interface DayButtonClassesParams {
  className: string | undefined;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isRangeEndpoint: boolean;
  isSingleDayRange: boolean;
  isRangeMiddle: boolean;
  isSelected: boolean;
  isToday: boolean;
  isHoliday: boolean;
  isOutside: boolean;
  isDisabled: boolean;
}

function getDayButtonClasses({
  className,
  isRangeStart,
  isRangeEnd,
  isRangeEndpoint,
  isSingleDayRange,
  isRangeMiddle,
  isSelected,
  isToday,
  isHoliday,
  isOutside,
  isDisabled,
}: DayButtonClassesParams) {
  return cn(
    className,
    !isOutside && !isDisabled && !isSelected && !isRangeMiddle && "text-foreground",
    !isOutside &&
      !isDisabled &&
      !isSelected &&
      !isRangeMiddle &&
      "hover:bg-field-hover hover:shadow-(--shadow-clay-inset) focus-visible:bg-field-hover",
    isOutside && "text-muted-foreground/45",
    isDisabled && "cursor-not-allowed text-muted-foreground/35",
    isToday &&
      !isSelected &&
      !isRangeMiddle &&
      "border-primary/45 bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary focus-visible:bg-primary/16",
    isToday &&
      isRangeMiddle &&
      "border-transparent bg-transparent text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_55%,var(--color-border))]",
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
      "border-primary bg-primary text-primary-foreground shadow-(--shadow-button-primary) hover:bg-primary focus-visible:bg-primary",
    isSingleDayRange && "rounded-xl",
    isRangeStart && !isSingleDayRange && "rounded-s-xl rounded-e-none",
    isRangeEnd && !isSingleDayRange && "rounded-s-none rounded-e-xl",
    isToday &&
      isSelected &&
      "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-card)_35%,transparent)_inset,var(--shadow-button-primary)]",
  );
}

const TimelyDayButton = React.memo(function TimelyDayButton({
  day,
  modifiers,
  className,
  children,
  holidayMap,
  ...props
}: TimelyDayButtonProps) {
  const holidayName = modifiers.holiday ? holidayMap.get(toDateKey(day.date)) : undefined;
  const isRangeStart = Boolean(modifiers.range_start);
  const isRangeEnd = Boolean(modifiers.range_end);
  const isRangeEndpoint = isRangeStart || isRangeEnd;
  const isSingleDayRange = isRangeStart && isRangeEnd;
  const isRangeMiddle = Boolean(modifiers.range_middle) && !isRangeEndpoint;
  const isSelected = Boolean(modifiers.selected);
  const isToday = Boolean(modifiers.today);
  const isHoliday = Boolean(modifiers.holiday);
  const isOutside = Boolean(modifiers.outside);
  const isDisabled = Boolean(modifiers.disabled);

  const buttonClassName = getDayButtonClasses({
    className,
    isRangeStart,
    isRangeEnd,
    isRangeEndpoint,
    isSingleDayRange,
    isRangeMiddle,
    isSelected,
    isToday,
    isHoliday,
    isOutside,
    isDisabled,
  });

  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      className={buttonClassName}
      title={holidayName}
      {...props}
    >
      <span className="pointer-events-none leading-none">{children}</span>
    </DayButton>
  );
});
