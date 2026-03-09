import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { StaggerGroup } from "@/components/shared/page-transition";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { springBouncy, springGentle, staggerItemScale } from "@/lib/animations";
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
  const xpForNextLevel = (current.profile.level + 1) * 100;
  const xpRatio = Math.min(current.profile.xp / xpForNextLevel, 1);

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      className="space-y-6"
    >
      {/* ─── Hero: Fox + Level Ring ─── */}
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springBouncy}
        className="flex flex-col items-center gap-2 pt-2"
      >
        {/* Fox in a level-ring container */}
        <div className="relative">
          {/* Outer clay circle */}
          <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/15 bg-primary/5 shadow-[var(--shadow-clay)]">
            <FoxMascot mood={foxMood} size={88} />
          </div>

          {/* XP progress ring overlay */}
          <svg
            className="pointer-events-none absolute inset-0 -rotate-90"
            viewBox="0 0 144 144"
            aria-hidden="true"
          >
            <circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary/10"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <m.circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 68}
              initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 68 - 2 * Math.PI * 68 * xpRatio,
              }}
              transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.3 }}
            />
          </svg>

          {/* Level badge */}
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springBouncy, delay: 0.2 }}
            className="absolute -right-1 -bottom-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-primary/30 bg-primary/15 shadow-[var(--shadow-clay)]"
          >
            <span className="font-display text-sm font-bold text-primary">
              {current.profile.level}
            </span>
          </m.div>
        </div>

        {/* Companion name + mood */}
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-foreground">
            {current.profile.companion ?? "Fox"}
          </p>
          <p className="text-xs text-muted-foreground">
            Feeling{" "}
            <span className="font-bold text-primary">{current.equippedCompanionMood}</span>
          </p>
        </div>
      </m.div>

      {/* ─── Stats Grid ─── */}
      <StaggerGroup className="grid grid-cols-2 gap-2 @xs:grid-cols-4">
        <StatChip
          icon={Award}
          label="Level"
          value={current.profile.level}
          color="primary"
        />
        <StatChip
          icon={Sparkles}
          label="XP"
          value={current.profile.xp}
          suffix={`/${xpForNextLevel}`}
          color="secondary"
        />
        <StatChip
          icon={Flame}
          label="Streak"
          value={current.profile.streakDays}
          suffix="d"
          color="primary"
        />
        <StatChip
          icon={Coins}
          label="Tokens"
          value={current.tokens}
          color="secondary"
        />
      </StaggerGroup>

      {/* ─── Streak ─── */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.15 }}
      >
        <StreakDisplay streakDays={Math.min(current.profile.streakDays, 7)} />
      </m.div>

      {/* ─── Quests ─── */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.25 }}
      >
        {current.quests.length > 0 ? (
          <QuestPanel quests={current.quests} />
        ) : (
          <EmptyState
            title="No active quests"
            description="Sync your data to start missions."
            mood="idle"
            foxSize={80}
          />
        )}
      </m.div>
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Chip with animated counter                                    */
/* ------------------------------------------------------------------ */

function StatChip({
  icon: Icon,
  label,
  value,
  suffix,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  color?: "primary" | "secondary";
}) {
  const motionValue = useMotionValue(0);
  const displayText = useTransform(motionValue, (v) =>
    Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1),
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: 60,
      damping: 20,
    });
    return controls.stop;
  }, [value, motionValue]);

  const colorClasses =
    color === "primary"
      ? "border-primary/20 bg-primary/5 text-primary"
      : "border-secondary/20 bg-secondary/5 text-secondary";

  return (
    <m.div
      variants={staggerItemScale}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-3 shadow-[var(--shadow-clay)]"
    >
      <div className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${colorClasses}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-center">
        <span className="font-display text-lg font-bold tabular-nums text-foreground leading-none">
          <m.span>{displayText}</m.span>
          {suffix ? (
            <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </span>
      </div>
      <span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </m.div>
  );
}
