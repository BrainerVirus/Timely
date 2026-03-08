import { Activity, CalendarRange, Clock, Coffee, Target } from "lucide-react";
import { motion } from "motion/react";
import { IssueCard } from "@/components/shared/issue-card";
import { MetricCard } from "@/components/shared/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cardContainerVariants } from "@/lib/animations";
import { formatHours } from "@/lib/utils";

import type { BootstrapPayload } from "@/types/dashboard";

interface TodayViewProps {
  payload: BootstrapPayload;
  weekTotals: { logged: number; target: number };
  onNavigateSettings: () => void;
}

export function TodayView({ payload, weekTotals, onNavigateSettings }: TodayViewProps) {
  const isWeekend = payload.today.status === "non_workday";
  const remaining = Math.max(payload.today.targetHours - payload.today.loggedHours, 0);
  const daysTracked = payload.month.cleanDays + payload.month.overflowDays;

  return (
    <motion.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Hero */}
      <Card>
        {isWeekend ? (
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {payload.today.shortLabel}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Weekend</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No target today. Enjoy your time off.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Badge tone="non_workday">day off</Badge>
              </div>
            </div>
            <div className="flex h-[110px] w-[110px] items-center justify-center">
              <Coffee className="h-12 w-12 text-muted-foreground/30" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Today</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
                {formatHours(payload.today.loggedHours)}{" "}
                <span className="text-muted-foreground">logged</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Target {formatHours(payload.today.targetHours)} · Focus{" "}
                {formatHours(payload.today.focusHours)}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Badge tone={payload.today.status}>
                  {payload.today.status.replaceAll("_", " ")}
                </Badge>
                <Button onClick={onNavigateSettings} size="sm" variant="ghost">
                  Connect GitLab
                </Button>
              </div>
            </div>
            <ProgressRing
              value={payload.today.loggedHours}
              max={payload.today.targetHours}
              size={110}
              strokeWidth={8}
            />
          </div>
        )}
      </Card>

      {/* Metrics */}
      <motion.div
        variants={cardContainerVariants}
        initial="initial"
        animate="animate"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          icon={CalendarRange}
          label="Week"
          value={formatHours(weekTotals.logged)}
          note={`/ ${formatHours(weekTotals.target)} target`}
        />
        <MetricCard
          icon={Activity}
          label="Consistency"
          value={`${payload.month.consistencyScore}%`}
          note="This month"
        />
        <MetricCard
          icon={Clock}
          label="Remaining"
          value={isWeekend ? "--" : formatHours(remaining)}
          note={isWeekend ? "Weekend" : "Today"}
        />
        <MetricCard icon={Target} label="Tracked" value={`${daysTracked}d`} note="This month" />
      </motion.div>

      {/* Issues */}
      {payload.today.topIssues.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {isWeekend ? "Last Workday Issues" : "Today's Issues"}
          </h2>
          <motion.div
            variants={cardContainerVariants}
            initial="initial"
            animate="animate"
            className="mt-3 space-y-2"
          >
            {payload.today.topIssues.map((issue) => (
              <IssueCard key={issue.key} issue={issue} />
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
