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
    <div className="flex items-center gap-2">
      {days.map((day, i) => {
        const filled = i < streakDays;
        const isCurrent = i === streakDays - 1;

        return (
          <div key={day.key} className="flex flex-col items-center gap-1">
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: i * 0.06,
                type: "spring",
                stiffness: 350,
                damping: 20,
              }}
              className={cn(
                "h-5 w-5 rounded-lg border-2 transition-all",
                filled
                  ? "border-primary/40 bg-primary/20 shadow-[1px_1px_0_0_var(--color-primary)]"
                  : "border-border bg-muted shadow-[var(--shadow-clay-inset)]",
                isCurrent && "animate-pulse ring-2 ring-primary/20",
              )}
            />
            <span className="text-[0.65rem] font-bold text-muted-foreground">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
