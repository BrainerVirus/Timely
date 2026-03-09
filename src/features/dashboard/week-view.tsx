import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { useFormatHours } from "@/hooks/use-format-hours";
import { cn } from "@/lib/utils";

import type { DayOverview } from "@/types/dashboard";

interface WeekViewProps {
  week: DayOverview[];
  title?: string;
  note?: string;
  showHeading?: boolean;
  dataOnboarding?: string;
  startDate?: string;
  viewMode?: "week" | "period";
  onSelectDay?: (day: DayOverview, date: Date) => void;
}

export function WeekView({
  week,
  title = "Week",
  note = "Hours across the current week.",
  showHeading = true,
  dataOnboarding,
  startDate,
  viewMode = "week",
  onSelectDay,
}: WeekViewProps) {
  const fh = useFormatHours();
  const gridClassName =
    viewMode === "period"
      ? "grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5"
      : "grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-5";

  return (
    <div className="space-y-4" data-onboarding={dataOnboarding}>
      {showHeading ? <SectionHeading title={title} note={note} /> : null}
      <div className={gridClassName}>
        {week.map((day, i) => {
          const date = startDate ? shiftDate(parseDateInputValue(startDate), i) : null;
          const isToday = day.isToday;
          const hasHoliday = Boolean(day.holidayName);
          const holidayTone = day.loggedHours > 0 ? "holiday-worked" : "holiday-empty";
          const cardClassName = cn(
            "flex h-full min-h-44 w-full flex-col rounded-2xl border-2 border-border bg-muted p-3 text-left transition-all",
            "shadow-[2px_2px_0_0_var(--color-border)]",
            isToday &&
              "border-primary/55 bg-[color-mix(in_oklab,var(--color-card)_80%,var(--color-primary)_20%)] shadow-[2px_2px_0_0_var(--color-primary)]",
            hasHoliday &&
              (holidayTone === "holiday-empty"
                ? "border-warning/65 bg-[color-mix(in_oklab,var(--color-card)_76%,var(--color-warning)_24%)] shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_65%,var(--color-border))]"
                : "border-warning/65 bg-[color-mix(in_oklab,var(--color-card)_70%,var(--color-warning)_30%)] shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_70%,var(--color-border))]"),
            isToday &&
              hasHoliday &&
              "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
            onSelectDay &&
              "cursor-pointer hover:border-primary/20 hover:bg-card active:translate-y-[1px] active:shadow-none",
          );

          const content = (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-base font-semibold text-foreground">
                  {day.shortLabel}
                </span>
                <span className="text-xs text-muted-foreground">{day.dateLabel}</span>
              </div>

              {isToday || hasHoliday ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {isToday ? (
                    <Badge tone="planned" className="text-[0.62rem]">
                      Today
                    </Badge>
                  ) : null}
                  {hasHoliday ? (
                    <Badge tone="holiday" className="max-w-full truncate text-[0.62rem]">
                      {day.holidayName}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                {fh(day.loggedHours)}
              </p>
              <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                target {fh(day.targetHours)}
              </p>

              <div className="mt-auto pt-3">
                <Badge tone={day.status} className="text-[0.65rem]">
                  {day.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </>
          );

          return (
            <m.div
              key={`${day.dateLabel}-${day.shortLabel}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: i * 0.05 }}
              className="h-full"
            >
              {onSelectDay && date ? (
                <button
                  type="button"
                  onClick={() => onSelectDay(day, date)}
                  className={cardClassName}
                >
                  {content}
                </button>
              ) : (
                <div className={cardClassName}>{content}</div>
              )}
            </m.div>
          );
        })}
      </div>
    </div>
  );
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
