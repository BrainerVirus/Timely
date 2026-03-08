import { m } from "motion/react";
import { cn } from "@/lib/utils";

const days = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

interface StreakDisplayProps {
  streakDays: number;
}

export function StreakDisplay({ streakDays }: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      {days.map((day, i) => {
        const filled = i < streakDays;
        const isCurrent = i === streakDays - 1;

        return (
          <div key={day.key} className="flex flex-col items-center gap-0.5">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: i * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={cn(
                "h-4 w-4 rounded-full border transition-all",
                filled ? "border-primary/40 bg-primary/20" : "border-border bg-muted",
                isCurrent && "animate-pulse",
              )}
            />
            <span className="text-xs text-muted-foreground">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
