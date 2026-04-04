import { cva } from "class-variance-authority";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";

import type { BootstrapPayload, StreakDaySnapshot } from "@/shared/types/dashboard";

type StreakChipState = "counted" | "broken" | "skipped" | "default";

const streakDayChipVariants = cva("", {
  variants: {
    state: {
      counted: "border-primary/30 bg-primary/10 text-primary shadow-button-soft",
      broken: "border-destructive/30 bg-destructive/10 text-destructive",
      skipped: "border-border-subtle bg-field text-muted-foreground",
      default: "border-border-subtle bg-panel text-muted-foreground shadow-clay",
    },
    isToday: { true: "", false: "" },
  },
  compoundVariants: [
    { state: "broken", isToday: true, className: "border-destructive/40 bg-destructive/12" },
    {
      state: "counted",
      isToday: true,
      className: "border-primary/40 bg-primary/12 text-foreground",
    },
    {
      state: "skipped",
      isToday: true,
      className: "border-primary/40 bg-primary/12 text-foreground",
    },
    {
      state: "default",
      isToday: true,
      className: "border-primary/40 bg-primary/12 text-foreground",
    },
  ],
});

const flameVariants = cva("h-4 w-4", {
  variants: {
    state: {
      counted:
        "text-primary drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]",
      broken: "text-destructive",
      skipped: "text-muted-foreground/75",
      default: "text-muted-foreground/60",
    },
  },
});

export function StreakSection({ streak }: Readonly<{ streak: BootstrapPayload["streak"] }>) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-8 items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("home.streakPanelTitle")}
          </h2>
          <Badge
            tone="on_track"
            className="rounded-xl px-2.5 py-1 text-[0.72rem] leading-none shadow-button-soft"
          >
            {streak.currentDays}d
          </Badge>
        </div>
      </div>

      <div className="flex-1">
        {streak.window.length === 0 ? (
          <EmptyPanelState message={t("home.streakEmpty")} />
        ) : (
          <div className="grid h-full grid-cols-7 gap-2">
            {streak.window.map((day, index) => (
              <StreakDayChip key={day.date} day={day} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StreakDayChip({ day, index }: Readonly<{ day: StreakDaySnapshot; index: number }>) {
  const { formatWeekdayFromDate } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const date = new Date(`${day.date}T12:00:00`);
  const isToday = day.isToday;
  const dayState = getStreakChipState(day);
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.div
      initial={shouldEnter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldEnter
          ? { type: "spring", duration: 0.25, bounce: 0.1, delay: index * 0.03 }
          : { duration: 0 }
      }
      className={cn(
        "flex min-h-27 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center",
        streakDayChipVariants({ state: dayState, isToday }),
      )}
    >
      <AnimatedFlameIcon
        active={day.state === "counted"}
        enterDelay={0.1 + index * 0.04}
        iconClassName={flameVariants({ state: dayState })}
      />
      <p className={cn("text-xs font-semibold", isToday && "text-foreground")}>
        {formatWeekdayFromDate(date, "narrow")}
      </p>
      <p className="text-[0.65rem] text-muted-foreground">{date.getDate()}</p>
    </m.div>
  );
}

function AnimatedFlameIcon({
  active,
  enterDelay = 0,
  iconClassName,
}: Readonly<{ active: boolean; enterDelay?: number; iconClassName?: string }>) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldAnimateIn = active && allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.span
      initial={shouldAnimateIn ? { opacity: 0, y: 6, scale: 0.72, rotate: -8 } : false}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={
        shouldAnimateIn
          ? { type: "spring", duration: 0.3, bounce: 0.08, delay: enterDelay }
          : { duration: 0 }
      }
      className="inline-flex items-center justify-center"
    >
      <Flame className={cn("shrink-0", iconClassName)} />
    </m.span>
  );
}

function EmptyPanelState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-28 flex-1 items-center rounded-2xl border-2 border-dashed border-border-subtle bg-panel px-4 py-8 text-sm text-muted-foreground shadow-clay-inset">
      {message}
    </div>
  );
}

function getStreakChipState(day: StreakDaySnapshot): StreakChipState {
  if (day.state === "counted") return "counted";
  if (day.state === "broken") return "broken";
  if (day.state === "skipped") return "skipped";
  return "default";
}
