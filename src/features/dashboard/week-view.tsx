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
}

export function WeekView({
  week,
  title = "Week",
  note = "Hours across the current week.",
  showHeading = true,
  dataOnboarding,
}: WeekViewProps) {
  const fh = useFormatHours();
  return (
    <div className="space-y-4" data-onboarding={dataOnboarding}>
      {showHeading ? <SectionHeading title={title} note={note} /> : null}
      <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-5">
        {week.map((day, i) => {
          return (
            <m.div
              key={`${day.dateLabel}-${day.shortLabel}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: i * 0.05 }}
              className={cn(
                "rounded-2xl border-2 border-border bg-muted p-3 transition-shadow",
                "shadow-[2px_2px_0_0_var(--color-border)]",
                day.isToday && "border-primary/40 shadow-[2px_2px_0_0_var(--color-primary)]",
              )}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-display text-base font-semibold text-foreground">
                  {day.shortLabel}
                </span>
                <span className="text-xs text-muted-foreground">{day.dateLabel}</span>
              </div>

              <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                {fh(day.loggedHours)}
              </p>
              <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                target {fh(day.targetHours)}
              </p>

              <div className="mt-2">
                <Badge tone={day.status} className="text-[0.65rem]">
                  {day.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
