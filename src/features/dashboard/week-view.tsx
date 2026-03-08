import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatHours } from "@/lib/utils";

import type { DayOverview } from "@/types/dashboard";

interface WeekViewProps {
  week: DayOverview[];
}

export function WeekView({ week }: WeekViewProps) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4" data-onboarding="week-card">
        <SectionHeading title="Week" note="Hours across the current week." />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {week.map((day, i) => {
            return (
              <m.div
                key={day.dateLabel}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: i * 0.05 }}
                className={cn(
                  "rounded-2xl border-2 border-border bg-muted p-3 transition-shadow",
                  "shadow-[2px_2px_0_0_var(--color-border)]",
                  day.isToday && "border-primary/40 shadow-[2px_2px_0_0_var(--color-primary)]",
                )}
              >
                {/* Day name + date stacked on top */}
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-base font-semibold text-foreground">
                    {day.shortLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{day.dateLabel}</span>
                </div>

                {/* Logged hours — big number */}
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {formatHours(day.loggedHours)}
                </p>
                <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                  target {formatHours(day.targetHours)}
                </p>

                {/* Badge on its own row — no overlap with day name */}
                <div className="mt-2">
                  <Badge tone={day.status} className="text-[0.65rem]">
                    {day.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </m.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
