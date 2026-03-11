import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock.js";
import Compass from "lucide-react/dist/esm/icons/compass.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { useFormatHours } from "@/hooks/use-format-hours";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

import type { BootstrapPayload, DayOverview, IssueBreakdown } from "@/types/dashboard";

interface HomePageProps {
  payload: BootstrapPayload;
  needsSetup: boolean;
  onOpenSetup: () => void;
  onOpenWorklog?: (mode: "day" | "week" | "period") => void;
}

const toneColorMap: Record<IssueBreakdown["tone"], string> = {
  emerald: "bg-success",
  amber: "bg-secondary",
  cyan: "bg-primary",
  rose: "bg-destructive",
  violet: "bg-primary",
};

export function HomePage({ payload, needsSetup, onOpenSetup, onOpenWorklog }: HomePageProps) {
  const fh = useFormatHours();
  const today = payload.today;
  const weekDays = payload.week.filter(
    (day) => day.shortLabel !== "Sat" && day.shortLabel !== "Sun",
  );
  const logged = today.loggedHours;
  const target = today.targetHours;
  const remaining = Math.max(target - logged, 0);
  const mood = getFoxMood(today.status);
  const headline = buildHeadline(payload, today.status);
  const playfulInsight = buildPlayfulInsight(payload, fh);
  const heroStats = [
    {
      label: "Today",
      value: fh(logged),
      note: `of ${fh(target)} target`,
      icon: Timer,
    },
    {
      label: "Remaining",
      value: fh(remaining),
      note: remaining > 0 ? "still to log" : "target cleared",
      icon: Compass,
    },
    {
      label: "Streak",
      value: `${payload.profile.streakDays}d`,
      note: payload.profile.streakDays > 0 ? "momentum alive" : "ready to start",
      icon: Sparkles,
    },
  ];

  return (
    <m.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-8">
      {needsSetup ? (
        <m.div
          variants={staggerItem}
          className="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3 shadow-[var(--shadow-clay-inset)]"
        >
          <span className="flex-1 text-sm text-foreground">
            Finish setting up your workspace to unlock all features.
          </span>
          <Button onClick={onOpenSetup}>Continue setup</Button>
        </m.div>
      ) : null}

      <m.section
        variants={staggerItem}
        data-onboarding="progress-ring"
        className="overflow-hidden rounded-[2rem] border-2 border-border bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_42%),linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_92%,var(--color-background)),var(--color-background))] p-6 shadow-[var(--shadow-clay)]"
      >
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={today.status}>{today.status.replaceAll("_", " ")}</Badge>
              <span className="text-sm text-muted-foreground">
                {payload.profile.companion} is on {headline.tempo}
              </span>
            </div>

            <div className="space-y-3">
              <p className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {headline.title}
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {playfulInsight}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border-2 border-border/70 bg-background/60 p-4 shadow-[var(--shadow-clay-inset)]"
                  >
                    <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-3 font-display text-3xl font-semibold text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2" data-onboarding="issue-list">
              <QuickLinkButton
                label="Open today"
                note={formatDateLabel(today)}
                onClick={() => onOpenWorklog?.("day")}
              />
              <QuickLinkButton
                label="Open this week"
                note="Compare daily load"
                onClick={() => onOpenWorklog?.("week")}
              />
              <QuickLinkButton
                label="Open this period"
                note="Review range summary"
                onClick={() => onOpenWorklog?.("period")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-[1.75rem] border-2 border-border/70 bg-background/70 p-5 shadow-[var(--shadow-clay)]">
            <div className="flex items-center gap-5">
              <div className="grid h-40 w-40 shrink-0 place-items-center rounded-full border-2 border-border bg-card shadow-[var(--shadow-clay)]">
                <FoxMascot mood={mood} size={110} />
              </div>

              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">
                    Today at a glance
                  </p>
                  <p className="mt-2 font-display text-4xl font-semibold text-foreground">
                    {fh(logged)}
                  </p>
                  <p className="text-sm text-muted-foreground">of {fh(target)} target</p>
                </div>

                <div className="flex items-center gap-3">
                  <ProgressRing
                    value={logged}
                    max={Math.max(target, 1)}
                    size={76}
                    strokeWidth={7}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{headline.supporting}</p>
                    <p className="text-sm text-muted-foreground">{headline.detail}</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-onboarding="week-chart">
              <WeeklyPulse weekDays={weekDays} />
            </div>
          </div>
        </div>
      </m.section>

      <m.section variants={staggerItem} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <SectionHeading
            title="Today focus"
            note={
              today.topIssues.length > 0
                ? "Your biggest slices of time so far."
                : "A clean slate today."
            }
          />
          {today.topIssues.length > 0 ? (
            <div className="space-y-2 rounded-3xl border-2 border-border bg-card p-4 shadow-[var(--shadow-clay)]">
              {today.topIssues.slice(0, 4).map((issue, index) => (
                <m.div
                  key={`${issue.key}-${issue.title}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0.12, delay: index * 0.05 }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-muted/40"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", toneColorMap[issue.tone])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{issue.key}</p>
                  </div>
                  <span className="rounded-full border-2 border-border bg-muted px-2.5 py-1 text-sm font-semibold text-foreground tabular-nums">
                    {fh(issue.hours)}
                  </span>
                </m.div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No issues logged today"
              description="Start tracking time to see your focus list come alive."
              mood="idle"
              foxSize={80}
              variant="plain"
            />
          )}
        </div>

        <div className="space-y-4">
          <SectionHeading
            title="Momentum"
            note="A quick pulse of this week, plus your running streak."
          />
          <div className="space-y-5 rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-clay)]">
            <WeeklyPulse weekDays={weekDays} compact />
            <StreakDisplay streakDays={Math.min(payload.profile.streakDays, 7)} />
          </div>
        </div>
      </m.section>
    </m.div>
  );
}

function QuickLinkButton({
  label,
  note,
  onClick,
}: {
  label: string;
  note: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-[13rem] cursor-pointer items-center justify-between rounded-2xl border-2 border-border bg-background/70 px-4 py-3 text-left shadow-[var(--shadow-clay)] transition-all hover:border-primary/20 hover:bg-card active:translate-y-[1px] active:shadow-none"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function WeeklyPulse({
  weekDays,
  compact = false,
}: {
  weekDays: DayOverview[];
  compact?: boolean;
}) {
  if (weekDays.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        Sync your data to see your weekly rhythm appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs tracking-[0.25em] text-muted-foreground uppercase">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>{compact ? "Weekly pulse" : "This week"}</span>
      </div>
      <div className={cn("grid gap-2", compact ? "grid-cols-5" : "grid-cols-5")}>
        {weekDays.map((day, index) => {
          const ratio = day.targetHours > 0 ? Math.min(day.loggedHours / day.targetHours, 1.25) : 0;
          const height = Math.max(18, ratio * 100);
          return (
            <m.div
              key={day.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.12, delay: index * 0.04 }}
              className="rounded-2xl border-2 border-border bg-background/60 p-3 shadow-[var(--shadow-clay-inset)]"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{day.shortLabel}</span>
                <span>{day.dateLabel.split(" ")[1] ?? day.dateLabel}</span>
              </div>
              <div className="mt-4 flex h-24 items-end">
                <div className="relative w-full overflow-hidden rounded-full bg-muted/70">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-primary to-secondary"
                    style={{ height: `${height}%`, minHeight: "1rem" }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-display font-semibold text-foreground">
                  {day.loggedHours}h
                </span>
                <Badge tone={day.status} className="text-[0.6rem]">
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

function getFoxMood(status: DayOverview["status"]): FoxMood {
  if (status === "met_target" || status === "over_target") return "celebrating";
  if (status === "on_track") return "working";
  return "idle";
}

function buildHeadline(payload: BootstrapPayload, status: DayOverview["status"]) {
  if (status === "met_target" || status === "over_target") {
    return {
      title: `Nice run, ${payload.profile.alias}.`,
      tempo: "victory mode",
      supporting: "You already cleared your target.",
      detail: "Now it is all about keeping the finish tidy.",
    };
  }

  if (status === "on_track") {
    return {
      title: `Steady rhythm, ${payload.profile.alias}.`,
      tempo: "focus mode",
      supporting: "The day is moving in the right direction.",
      detail: "A couple of solid sessions should close the gap.",
    };
  }

  if (status === "non_workday") {
    return {
      title: `Easy pace, ${payload.profile.alias}.`,
      tempo: "weekend mode",
      supporting: "No work target today.",
      detail: "Use the quiet space to recharge or tidy light tasks.",
    };
  }

  return {
    title: `A clean page for today.`,
    tempo: "warm-up mode",
    supporting: "Your fox is waiting for the first tracked block.",
    detail: "One focused session is enough to get momentum started.",
  };
}

function buildPlayfulInsight(payload: BootstrapPayload, fh: (value: number) => string) {
  const weekLogged = payload.week.reduce((sum, day) => sum + day.loggedHours, 0);
  const topIssue = payload.today.topIssues[0];

  if (topIssue) {
    return `${payload.profile.companion} says your biggest quest so far is ${topIssue.key}. You have already spent ${fh(topIssue.hours)} there, so that thread is clearly where the day is unfolding.`;
  }

  if (weekLogged > 0) {
    return `${payload.profile.companion} has clocked ${fh(weekLogged)} across the visible week. Even if today is quiet, your recent rhythm is still telling a story worth following.`;
  }

  return `${payload.profile.companion} is stretching before the first sprint. Once your first issue lands, this page turns into your little mission control.`;
}

function formatDateLabel(day: DayOverview) {
  return `${day.shortLabel} ${day.dateLabel.split(" ")[1] ?? ""}`.trim();
}
