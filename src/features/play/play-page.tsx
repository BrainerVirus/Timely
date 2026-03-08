import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import PawPrint from "lucide-react/dist/esm/icons/paw-print.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { useEffect, useState } from "react";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { loadPlaySnapshot } from "@/lib/tauri";

import type { BootstrapPayload, PlaySnapshot } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

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
    <div className="space-y-8">
      {/* Companion area */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="flex h-40 w-40 items-center justify-center rounded-full border border-primary/10 bg-primary/5">
          <PawPrint className="h-16 w-16 text-primary/40" />
        </div>
        <p className="text-sm text-muted-foreground">
          {current.profile.companion ?? "Companion"} is{" "}
          <span className="font-medium text-foreground">{current.equippedCompanionMood}</span>
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex justify-center gap-6">
        <StatChip icon={Award} label="Level" value={String(current.profile.level)} />
        <StatChip icon={Sparkles} label="XP" value={String(current.profile.xp)} sub={`/ ${(current.profile.level + 1) * 100}`} />
        <StatChip icon={Flame} label="Streak" value={`${current.profile.streakDays}d`} />
        <StatChip icon={Coins} label="Tokens" value={String(current.tokens)} />
      </div>

      {/* Streak */}
      <div className="flex justify-center">
        <StreakDisplay streakDays={Math.min(current.profile.streakDays, 7)} />
      </div>

      {/* Quests */}
      {current.quests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Active Quests</h2>
          <QuestPanel quests={current.quests} />
        </section>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No active quests. Sync your data to start missions.
        </p>
      )}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-display text-lg font-bold tabular-nums">
        {value}
        {sub ? <span className="text-xs font-normal text-muted-foreground">{sub}</span> : null}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
