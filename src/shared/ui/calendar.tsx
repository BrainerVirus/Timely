import { cva } from "class-variance-authority";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import * as React from "react";
import { DayButton, DayPicker } from "react-day-picker";
import { enUS, es, pt } from "react-day-picker/locale";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/utils/utils";

import type { DayButtonProps } from "react-day-picker";

const navButtonVariants = cva(
  "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border-subtle bg-panel p-0 text-muted-foreground shadow-clay transition hover:border-border-strong hover:bg-panel-elevated hover:text-foreground active:translate-y-px active:shadow-none",
);

const dayButtonVariants = cva("", {
  variants: {
    isOutside: { true: "text-muted-foreground/45" },
    isDisabled: { true: "cursor-not-allowed text-muted-foreground/35" },
    isRangeMiddle: {
      true: "rounded-none border-transparent bg-transparent text-foreground shadow-none hover:rounded-xl hover:bg-primary/12 hover:shadow-none focus-visible:rounded-xl focus-visible:bg-primary/14",
    },
    isSingleDayRange: { true: "rounded-xl" },
    isSelected: { true: "", false: "" },
    isToday: { true: "", false: "" },
    isHoliday: { true: "", false: "" },
    isRangeStart: { true: "", false: "" },
    isRangeEnd: { true: "", false: "" },
  },
  compoundVariants: [
    {
      isOutside: false,
      isDisabled: false,
      isSelected: false,
      isRangeMiddle: false,
      className:
        "text-foreground hover:bg-field-hover hover:shadow-clay-inset focus-visible:bg-field-hover",
    },
    {
      isToday: true,
      isSelected: false,
      isRangeMiddle: false,
      className:
        "border-primary/45 bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary focus-visible:bg-primary/16",
    },
    {
      isToday: true,
      isRangeMiddle: true,
      className:
        "border-transparent bg-transparent text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_55%,var(--color-border))]",
    },
    {
      isHoliday: true,
      isSelected: false,
      isRangeStart: false,
      isRangeEnd: false,
      className: "font-semibold text-warning",
    },
    {
      isHoliday: true,
      isSelected: false,
      isRangeStart: false,
      isRangeEnd: false,
      isRangeMiddle: false,
      className: "hover:bg-warning/10 hover:text-warning focus-visible:bg-warning/12",
    },
    {
      isHoliday: true,
      isRangeMiddle: true,
      className: "text-warning",
    },
    {
      isSelected: true,
      isRangeMiddle: false,
      className:
        "border-primary bg-primary text-primary-foreground shadow-button-primary hover:bg-primary focus-visible:bg-primary",
    },
    {
      isRangeStart: true,
      isSingleDayRange: false,
      className: "rounded-s-xl rounded-e-none",
    },
    {
      isRangeEnd: true,
      isSingleDayRange: false,
      className: "rounded-s-none rounded-e-xl",
    },
    {
      isToday: true,
      isSelected: true,
      className:
        "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-card)_35%,transparent)_inset,var(--shadow-button-primary)]",
    },
  ],
});

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
  const isSingleDayRange = isRangeStart && isRangeEnd;
  const isRangeMiddle = Boolean(modifiers.range_middle) && !isRangeStart && !isRangeEnd;
  const isSelected = Boolean(modifiers.selected);
  const isToday = Boolean(modifiers.today);
  const isHoliday = Boolean(modifiers.holiday);
  const isOutside = Boolean(modifiers.outside);
  const isDisabled = Boolean(modifiers.disabled);

  const buttonClassName = cn(
    className,
    dayButtonVariants({
      isOutside,
      isDisabled,
      isRangeMiddle,
      isSingleDayRange,
      isSelected,
      isToday,
      isHoliday,
      isRangeStart,
      isRangeEnd,
    }),
  );

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
