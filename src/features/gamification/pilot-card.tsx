import { motion } from "motion/react";

import type { ProfileSnapshot } from "@/types/dashboard";

interface PilotCardProps {
  profile: ProfileSnapshot;
}

export function PilotCard({ profile }: PilotCardProps) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Pilot</p>
          <h2 className="mt-1 font-display text-base font-semibold text-foreground">
            {profile.alias}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{profile.companion}</p>
        </div>
        <div className="relative grid h-9 w-9 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="17" className="fill-none stroke-muted" strokeWidth="2.5" />
            <motion.circle
              cx="20"
              cy="20"
              r="17"
              className="fill-none stroke-primary"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 17}
              initial={{ strokeDashoffset: 2 * Math.PI * 17 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 17 - 2 * Math.PI * 17 * Math.min(profile.xp / 1500, 1),
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

      <div className="mt-3 rounded-full bg-background p-[2px]">
        <motion.div
          className="h-1 rounded-full bg-primary"
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
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{profile.xp} XP</span>
        <span>{profile.streakDays}d streak</span>
      </div>
    </div>
  );
}
