import { cva } from "class-variance-authority";
import * as React from "react";
import { DayButton } from "react-day-picker";
import { cn } from "@/shared/lib/utils";

import type { DayButtonProps } from "react-day-picker";

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

interface TimelyDayButtonProps extends DayButtonProps {
  holidayMap: Map<string, string>;
}

export const TimelyDayButton = React.memo(function TimelyDayButton({
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

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
