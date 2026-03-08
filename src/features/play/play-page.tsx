import Award from "lucide-react/dist/esm/icons/award.js";
import PawPrint from "lucide-react/dist/esm/icons/paw-print.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Store from "lucide-react/dist/esm/icons/store.js";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PilotCard } from "@/features/gamification/pilot-card";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { cardContainerVariants } from "@/lib/animations";
import { loadPlaySnapshot } from "@/lib/tauri";

import type { BootstrapPayload, PlaySnapshot } from "@/types/dashboard";

export function PlayPage({ payload }: { payload: BootstrapPayload }) {
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(null);

  useEffect(() => {
    void loadPlaySnapshot().then(setPlaySnapshot);
  }, []);

  const current = playSnapshot ?? {
    profile: payload.profile,
    quests: [],
    tokens: 0,
    equippedCompanionMood: "calm",
    inventory: [],
  };

  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Play
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-foreground">Turn healthy work habits into rewards</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                This page becomes the home for missions, streaks, XP, companion growth, and future
                rewards you can actually spend.
              </p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border/70 bg-muted/35 p-5 sm:grid-cols-2 lg:border-t-0 lg:border-l lg:grid-cols-1 sm:p-6">
            <PlayHeroStat label="XP" value={String(current.profile.xp)} icon={Sparkles} />
            <PlayHeroStat label="Level" value={String(current.profile.level)} icon={Award} />
            <PlayHeroStat label="Tokens" value={String(current.tokens)} icon={Store} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <PilotCard profile={current.profile} />
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 text-primary/70" />
                <h3 className="font-display text-base font-semibold text-foreground">Companion state</h3>
              </div>
              <div className="rounded-xl border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Current mood</p>
                <p className="mt-2 font-display text-xl font-semibold text-foreground">{current.equippedCompanionMood}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mood and progression are now backed by real play snapshot data.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Streak rhythm</h3>
                <p className="text-xs text-muted-foreground">Designed to reward consistency, not overwork.</p>
              </div>
              <StreakDisplay streakDays={Math.min(current.profile.streakDays, 7)} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {current.quests.length > 0 ? (
            <QuestPanel quests={current.quests} />
          ) : (
            <Card>
              <div className="space-y-3">
                <h3 className="font-display text-base font-semibold text-foreground">Mission board</h3>
                <p className="text-sm text-muted-foreground">
                  No active missions yet. Seeded quest definitions are ready and the next sync can start updating progress.
                </p>
              </div>
            </Card>
          )}

          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary/70" />
                <h3 className="font-display text-base font-semibold text-foreground">Reward shop</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Pet evolution", cost: 120 },
                  { label: "Avatar frames", cost: 80 },
                  { label: "Desk cosmetics", cost: 50 },
                ].map((reward) => (
                  <div key={reward.label} className="rounded-xl border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{reward.label}</p>
                    <p className="mt-1">{reward.cost} tokens</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary/70" />
                <h3 className="font-display text-base font-semibold text-foreground">Inventory</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {current.inventory.length > 0 ? (
                  current.inventory.map((item) => (
                    <div key={item.rewardKey} className="rounded-xl border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{item.rewardName}</p>
                        {item.equipped ? <span className="text-xs uppercase tracking-[0.22em] text-primary">Equipped</span> : null}
                      </div>
                      <p className="mt-1">{item.rewardType}</p>
                      <p className="mt-1">{item.costTokens} tokens</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground sm:col-span-2">
                    No rewards unlocked yet. Quest progress will unlock inventory items next.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </m.div>
  );
}

function PlayHeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
