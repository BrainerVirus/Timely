import { m } from "motion/react";

import type { ProfileSnapshot } from "@/types/dashboard";

interface PilotCardProps {
  profile: ProfileSnapshot;
}

export function PilotCard({ profile }: PilotCardProps) {
  return (
    <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Pilot</p>
          <h2 className="mt-1 font-display text-base font-semibold text-foreground">
            {profile.alias}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{profile.companion}</p>
        </div>
        <div className="relative grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] shadow-[var(--shadow-clay)]">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" className="fill-none stroke-muted" strokeWidth="2.5" />
            <m.circle
              cx="20"
              cy="20"
              r="16"
              className="fill-none stroke-primary"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 16}
              initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 16 - 2 * Math.PI * 16 * Math.min(profile.xp / 1500, 1),
              }}
              transition={{
                type: "spring",
                stiffness: 50,
                damping: 15,
                delay: 0.3,
              }}
            />
          </svg>
          <span className="text-xs font-bold text-primary">{profile.level}</span>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-[color:var(--color-field)] shadow-[var(--shadow-clay-inset)]">
        <m.div
          className="h-2 rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(profile.xp / 15, 100)}%` }}
          transition={{
            type: "spring",
            stiffness: 50,
            damping: 15,
            delay: 0.4,
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>{profile.xp} XP</span>
        <span>{profile.streakDays}d streak</span>
      </div>
    </div>
  );
}
