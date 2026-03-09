import { m } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { cn, formatHours } from "@/lib/utils";

import type { BootstrapPayload, DayOverview, IssueBreakdown } from "@/types/dashboard";

interface HomePageProps {
  payload: BootstrapPayload;
  needsSetup: boolean;
  onOpenSetup: () => void;
}

const toneColorMap: Record<IssueBreakdown["tone"], string> = {
  emerald: "bg-success",
  amber: "bg-secondary",
  cyan: "bg-primary",
  rose: "bg-destructive",
  violet: "bg-primary",
};

export function HomePage({
  payload,
  needsSetup,
  onOpenSetup,
}: HomePageProps) {
  const isWeekend = payload.today.status === "non_workday";
  const logged = payload.today.loggedHours;
  const target = payload.today.targetHours;
  const remaining = Math.max(target - logged, 0);

  const weekDays = payload.week.filter(
    (d) => d.shortLabel !== "Sat" && d.shortLabel !== "Sun",
  );

  if (isWeekend) {
    return (
      <div className="space-y-6">
        <m.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Badge tone="non_workday">Day off</Badge>
          <span className="text-sm text-muted-foreground">
            No target today. Enjoy your time off.
          </span>
        </m.section>

        <hr className="border-border" />

        <WeekBarChart weekDays={weekDays} />

        <StreakDisplay streakDays={Math.min(payload.profile.streakDays, 7)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {needsSetup ? (
        <div className="flex items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 shadow-[var(--shadow-clay-inset)]">
          <span className="flex-1 text-sm text-foreground">
            Finish setting up your workspace to unlock all features.
          </span>
          <Button onClick={onOpenSetup} size="sm">
            Continue setup
          </Button>
        </div>
      ) : null}

      <m.section
        data-onboarding="progress-ring"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-8"
      >
        <ProgressRing value={logged} max={target} size={120} strokeWidth={8} />

        <div className="min-w-0">
          <p className="font-display text-4xl font-bold tabular-nums text-foreground">
            {formatHours(logged)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            of {formatHours(target)} target
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatHours(remaining)} remaining
            </span>
            <Badge tone={payload.today.status}>
              {payload.today.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>
      </m.section>

      <hr className="border-border" />

      <div className="grid gap-8 @lg:grid-cols-[1fr_280px]">
        <div data-onboarding="issue-list">
          {payload.today.topIssues.length > 0 ? (
            <div>
              {payload.today.topIssues.map((issue, i) => (
                <m.div
                  key={issue.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0.1, delay: i * 0.04 }}
                  className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                >
                  <span
                    className={cn("h-2 w-2 rounded-full", toneColorMap[issue.tone])}
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {issue.key}
                  </span>
                  <span className="flex-1 truncate text-sm text-foreground">
                    {issue.title}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatHours(issue.hours)}
                  </span>
                </m.div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No issues logged today"
              description="Start tracking time to see your issues here."
              mood="idle"
              foxSize={80}
            />
          )}
        </div>

        <div data-onboarding="week-chart">
          <WeekBarChart weekDays={weekDays} />
        </div>
      </div>

      <StreakDisplay streakDays={Math.min(payload.profile.streakDays, 7)} />
    </div>
  );
}

function WeekBarChart({ weekDays }: { weekDays: DayOverview[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
        This week
      </h3>
      <div className="flex items-end gap-2 h-32">
        {weekDays.map((day) => {
          const ratio =
            day.targetHours > 0 ? day.loggedHours / day.targetHours : 0;
          const barHeight = Math.max(ratio * 100, 4);
          const fillHeight = Math.min(ratio * 100, 100);

          return (
            <div
              key={day.shortLabel}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-xl bg-primary/20 relative"
                style={{ height: `${barHeight}%` }}
              >
                <div
                  className="absolute inset-0 rounded-t-xl bg-primary"
                  style={{ height: `${fillHeight}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {day.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
