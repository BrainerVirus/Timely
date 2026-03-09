import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { loadPlaySnapshot } from "@/lib/tauri";

import type { BootstrapPayload, PlaySnapshot } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

const moodMap: Record<string, FoxMood> = {
  calm: "idle",
  happy: "celebrating",
  focused: "working",
  excited: "celebrating",
};

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

  const foxMood: FoxMood = moodMap[current.equippedCompanionMood] ?? "idle";

  return (
    <div className="space-y-8">
      {/* Companion area — fox mascot */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="flex h-40 w-40 items-center justify-center rounded-full border-2 border-primary/15 bg-primary/5 shadow-[var(--shadow-clay)]">
          <FoxMascot mood={foxMood} size={100} />
        </div>
        <p className="text-sm text-muted-foreground">
          {current.profile.companion ?? "Fox"} is{" "}
          <span className="font-bold text-foreground">{current.equippedCompanionMood}</span>
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap justify-center gap-4 @sm:gap-6">
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
        <EmptyState
          title="No active quests"
          description="Sync your data to start missions."
          mood="idle"
          foxSize={80}
        />
      )}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-muted px-4 py-3 shadow-[var(--shadow-clay)]">
      <Icon className="h-4 w-4 text-primary/60" />
      <span className="font-display text-lg font-bold tabular-nums">
        {value}
        {sub ? <span className="text-xs font-normal text-muted-foreground">{sub}</span> : null}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
