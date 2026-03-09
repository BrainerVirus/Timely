import * as React from "react";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-clay)]", className)}
      classNames={{
        // --- Layout ---
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex items-center justify-center pt-1",
        caption_label: "font-display text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-background p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:text-foreground active:translate-y-[1px] active:shadow-none",
        button_next:
          "absolute right-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-background p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:text-foreground active:translate-y-[1px] active:shadow-none",
        // --- Grid ---
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        weeks: "mt-2",
        week: "flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-s-xl last:[&:has([aria-selected])]:rounded-e-xl focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-xl p-0 font-medium text-foreground transition hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground",
        // --- DayFlag states ---
        today: "border-2 border-primary/30 bg-primary/10 text-primary rounded-xl",
        outside: "text-muted-foreground/50 opacity-60",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        // --- SelectionState ---
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl",
        range_start: "rounded-s-xl",
        range_end: "rounded-e-xl",
        range_middle: "aria-selected:bg-primary/15 aria-selected:text-foreground",
        // --- Dropdown (captionLayout="dropdown") ---
        dropdowns: "flex items-center gap-2",
        dropdown_root: "relative",
        dropdown:
          "absolute inset-0 cursor-pointer opacity-0",
        months_dropdown: "",
        years_dropdown: "",
        // --- Chevron override ---
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
      }}
      {...props}
    />
  );
}
