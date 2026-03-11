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
        root: "w-full",
        months: "relative flex w-full flex-col gap-4 sm:flex-row",
        month: "w-full min-w-0 space-y-3",
        month_caption: "flex h-8 items-center justify-center px-10",
        caption_label: "font-display text-sm font-semibold text-foreground",
        nav: "absolute inset-x-1 top-0 z-10 flex h-8 items-center justify-between pointer-events-none",
        button_previous:
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-card p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:bg-muted hover:text-foreground active:translate-y-[1px] active:shadow-none",
        button_next:
          "pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-card p-0 text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition hover:bg-muted hover:text-foreground active:translate-y-[1px] active:shadow-none",
        // --- Grid ---
        month_grid: "w-full table-fixed border-collapse",
        weekdays: "grid grid-cols-7",
        weekday:
          "flex h-9 items-center justify-center text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        weeks: "mt-2 space-y-1",
        week: "grid grid-cols-7",
        day: "relative aspect-square min-w-0 p-0 text-center text-sm [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-s-xl last:[&:has([aria-selected])]:rounded-e-xl focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex size-full min-h-9 cursor-pointer items-center justify-center rounded-xl p-0 font-medium text-foreground transition-all hover:bg-muted hover:shadow-[var(--shadow-clay-inset)] aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-[1px_1px_0_0_var(--color-border)]",
        // --- DayFlag states ---
        today: "rounded-xl border-2 border-primary/30 bg-primary/10 text-primary shadow-[var(--shadow-clay-inset)]",
        outside: "text-muted-foreground/50 opacity-40",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        // --- SelectionState ---
        selected:
          "rounded-xl bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-[1px_1px_0_0_var(--color-border)]",
        range_start: "rounded-s-xl",
        range_end: "rounded-e-xl",
        range_middle: "aria-selected:bg-primary/15 aria-selected:text-foreground",
        // --- Dropdown (captionLayout="dropdown") ---
        dropdowns: "flex items-center gap-2",
        dropdown_root: "relative inline-flex items-center rounded-lg border-2 border-border bg-card px-2 py-1 text-sm font-semibold",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
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
