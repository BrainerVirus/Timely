import Compass from "lucide-react/dist/esm/icons/compass.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { m } from "motion/react";
import { Card } from "@/components/ui/card";
import { TodayView } from "@/features/dashboard/today-view";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { cardContainerVariants } from "@/lib/animations";
import { formatHours } from "@/lib/utils";

import type { BootstrapPayload } from "@/types/dashboard";

interface HomePageProps {
  payload: BootstrapPayload;
  weekTotals: { logged: number; target: number };
  onOpenSetup: () => void;
  onOpenProviders: () => void;
  needsSetup: boolean;
}

export function HomePage({
  payload,
  weekTotals,
  onOpenSetup,
  onOpenProviders,
  needsSetup,
}: HomePageProps) {
  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {needsSetup ? (
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Welcome
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  Start from a proper home, not a settings dump
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Connect your first provider, define your work rhythm, and then use this space as
                  your daily command center.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenSetup}
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Start setup
                </button>
                <button
                  type="button"
                  onClick={onOpenProviders}
                  className="cursor-pointer rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  Open providers
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-t border-border/70 bg-muted/35 p-5 sm:grid-cols-2 lg:border-t-0 lg:border-l lg:grid-cols-1 sm:p-6">
              <HomeStat label="Today" value={formatHours(payload.today.loggedHours)} note="logged so far" icon={Compass} />
              <HomeStat label="Week" value={formatHours(weekTotals.logged)} note="captured this week" icon={Sparkles} />
            </div>
          </div>
        </Card>
      ) : null}

      <TodayView payload={payload} weekTotals={weekTotals} onNavigateSettings={onOpenProviders} />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Worklog pulse</h3>
              <p className="text-xs text-muted-foreground">
                Your current monthly consistency and audit snapshot.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoPanel
                label="Consistency"
                value={`${payload.month.consistencyScore}%`}
                note={`${payload.month.cleanDays} clean days this month`}
              />
              <InfoPanel
                label="Review flags"
                value={String(payload.auditFlags.length)}
                note={payload.auditFlags.length > 0 ? payload.auditFlags[0].title : "No warnings yet"}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Play snapshot</h3>
              <p className="text-xs text-muted-foreground">
                Make the reward loop visible even before the full game system lands.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Streak</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                    {payload.profile.streakDays} days
                  </p>
                </div>
                <StreakDisplay streakDays={Math.min(payload.profile.streakDays, 7)} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                XP, missions, rewards, and companion evolution will move into the new Play center.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </m.div>
  );
}

function HomeStat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Compass;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function InfoPanel({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
