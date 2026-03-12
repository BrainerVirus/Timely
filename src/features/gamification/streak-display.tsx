import Flame from "lucide-react/dist/esm/icons/flame.js";
import { m } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { springBouncy, staggerContainer } from "@/lib/animations";
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
  const { formatWeekdayFromCode, t } = useI18n();

  return (
    <div className="w-full rounded-2xl border-2 border-border bg-muted p-4 shadow-[var(--shadow-clay)]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-lg border-2 border-primary/20 bg-primary/10">
          <Flame className="h-3.5 w-3.5 text-primary" />
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
        className="flex items-center justify-between gap-1"
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
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div
                  className={cn(
                    "h-7 w-7 rounded-xl border-2 transition-colors",
                    filled
                      ? "border-primary/40 bg-primary/20 shadow-[1px_1px_0_0_var(--color-primary)]"
                      : "border-border bg-card shadow-[var(--shadow-clay-inset)]",
                  )}
                >
                  {filled && (
                    <m.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...springBouncy, delay: 0.1 + i * 0.06 }}
                      className="grid h-full w-full place-items-center"
                    >
                      <Flame className="h-3 w-3 text-primary" />
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
                  "text-[0.6rem] font-bold",
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
      <div className="mt-3 h-1.5 rounded-full bg-background shadow-[var(--shadow-clay-inset)]">
        <m.div
          className="h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${(streakDays / days.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.4 }}
        />
      </div>
    </div>
  );
}
