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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {week.map((day) => {
            return (
              <div
                key={day.dateLabel}
                className={cn(
                  "rounded-xl border border-border bg-muted p-3",
                  day.isToday && "border-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold text-foreground">
                    {day.shortLabel}
                  </span>
                  <Badge tone={day.status}>{day.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{day.dateLabel}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {formatHours(day.loggedHours)}
                </p>
                <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                  target {formatHours(day.targetHours)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
