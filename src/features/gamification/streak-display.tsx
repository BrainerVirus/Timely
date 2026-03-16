import Flame from "lucide-react/dist/esm/icons/flame.js";
import { m } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { springBouncy, springData, staggerContainer } from "@/lib/animations";
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
  compact?: boolean;
}

export function StreakDisplay({ streakDays, compact = false }: StreakDisplayProps) {
  const { formatWeekdayFromCode, t } = useI18n();

  return (
    <div className={cn(
      "w-full rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] shadow-[var(--shadow-card)]",
      compact ? "p-3" : "p-4",
    )}>
      {/* Header */}
      <div className={cn("flex items-center gap-2", compact ? "mb-2" : "mb-3")}>
        <div className={cn(
          "grid place-items-center rounded-lg border-2 border-primary/20 bg-primary/10",
          compact ? "h-5 w-5" : "h-6 w-6",
        )}>
          <Flame className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "text-primary")} />
        </div>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {t("gamification.weeklyStreak")}
        </span>
        {streakDays > 0 && (
          <m.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springBouncy}
            className="ml-auto rounded-full border-2 border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold text-primary"
          >
            {streakDays}/{days.length}
          </m.span>
        )}
      </div>

      {/* Day dots */}
      <m.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={cn("flex items-center justify-between", compact ? "gap-0.5" : "gap-1")}
      >
        {days.map((day, i) => {
          const filled = i < streakDays;
          const isCurrent = i === streakDays - 1 && streakDays > 0;

          return (
            <m.div
              key={day.key}
              variants={{
                initial: { opacity: 0, scale: 0.6 },
                animate: {
                  opacity: 1,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 350,
                    damping: 20,
                  },
                },
              }}
              className={cn("flex flex-1 flex-col items-center", compact ? "gap-1" : "gap-1.5")}
            >
              <div className="relative">
                <div
                  className={cn(
                    "rounded-xl border-2 transition-colors",
                    compact ? "h-6 w-6" : "h-7 w-7",
                    filled
                      ? "border-primary/40 bg-primary/20 shadow-[1px_1px_0_0_var(--color-primary)]"
                        : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] shadow-[var(--shadow-clay-inset)]",
                  )}
                >
                  {filled && (
                    <m.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springBouncy, delay: 0.1 + i * 0.06 }}
                      className="grid h-full w-full place-items-center"
                    >
                      <Flame className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "text-primary")} />
                    </m.div>
                  )}
                </div>

                {/* Current day — Motion-only glow ring (no animate-pulse!) */}
                {isCurrent && (
                  <m.div
                    className="absolute -inset-1 rounded-xl border-2 border-primary/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: [0, 0.8, 0],
                      scale: [0.95, 1.1, 0.95],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
              <span
                className={cn(
                  compact ? "text-[0.55rem] font-bold" : "text-[0.6rem] font-bold",
                  filled ? "text-primary" : "text-muted-foreground",
                )}
              >
                {formatWeekdayFromCode(day.key === "thu" ? "Thu" : day.key === "tue" ? "Tue" : day.key === "wed" ? "Wed" : day.key === "fri" ? "Fri" : day.key === "sat" ? "Sat" : day.key === "sun" ? "Sun" : "Mon", "narrow")}
              </span>
            </m.div>
          );
        })}
      </m.div>

      {/* Progress bar under the dots */}
      <div className={cn("rounded-full bg-[color:var(--color-field)] shadow-[var(--shadow-clay-inset)]", compact ? "mt-2 h-1.25" : "mt-3 h-1.5")}>
        <m.div
          className={cn("rounded-full bg-gradient-to-r from-primary to-secondary", compact ? "h-1.25" : "h-1.5")}
          initial={{ width: 0 }}
          animate={{ width: `${(streakDays / days.length) * 100}%` }}
          transition={{ ...springData, delay: 0.15 }}
        />
      </div>
    </div>
  );
}
