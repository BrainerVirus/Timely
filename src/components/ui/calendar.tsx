import * as React from "react";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

import "react-day-picker/dist/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-2xl border border-border bg-card p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "font-display text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: "size-8 rounded-lg border border-border bg-background p-0 text-muted-foreground transition hover:text-foreground",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "w-9 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        row: "mt-2 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-s-xl last:[&:has([aria-selected])]:rounded-e-xl focus-within:relative focus-within:z-20",
        day: "size-9 rounded-xl p-0 font-medium text-foreground transition hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/25 bg-primary/10 text-primary",
        day_outside: "text-muted-foreground/50 opacity-60",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
