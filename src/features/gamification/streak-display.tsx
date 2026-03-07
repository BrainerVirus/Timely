import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const days = ["M", "T", "W", "T", "F", "S", "S"];

interface StreakDisplayProps {
  streakDays: number;
}

export function StreakDisplay({ streakDays }: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      {days.map((label, i) => {
        const filled = i < streakDays;
        const isCurrent = i === streakDays - 1;

        return (
          <div
            key={`${label}-${i}`}
            className="flex flex-col items-center gap-0.5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: i * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={cn(
                "h-4 w-4 rounded-full border transition-all",
                filled
                  ? "border-primary/40 bg-primary/20"
                  : "border-border bg-muted",
                isCurrent && "animate-pulse",
              )}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
