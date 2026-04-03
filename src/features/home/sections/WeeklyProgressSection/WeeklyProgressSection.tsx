import { cva } from "class-variance-authority";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { cn } from "@/shared/lib/utils";

import type { DayOverview } from "@/shared/types/dashboard";

type WeeklyDayState = "non_workday" | "met" | "partial" | "empty";

const weeklyDayChipVariants = cva("", {
  variants: {
    state: {
      non_workday: "border-border-subtle bg-field text-muted-foreground",
      met: "border-primary/30 bg-primary/10 text-primary shadow-button-soft",
      partial: "border-border-subtle bg-panel-elevated text-foreground shadow-card",
      empty: "border-border-subtle bg-panel text-muted-foreground shadow-clay",
    },
    isToday: {
      true: "border-primary/40 bg-primary/10 text-foreground",
      false: "",
    },
  },
});

const weeklyDayFillVariants = cva("", {
  variants: {
    state: {
      non_workday: "from-border/20 via-border/10 to-border/5",
      met: "from-primary/40 via-primary/24 to-primary/10",
      partial: "from-primary/30 via-primary/18 to-primary/8",
      empty: "from-transparent via-transparent to-transparent",
    },
  },
});

const loggedTextVariants = cva("", {
  variants: {
    state: {
      met: "text-primary",
      partial: "text-foreground",
      empty: "text-muted-foreground",
    },
  },
  defaultVariants: { state: "empty" },
});

export function WeeklyProgressSection({ weekDays }: Readonly<{ weekDays: DayOverview[] }>) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {t("home.weeklyProgressTitle")}
      </h2>
      {weekDays.length === 0 ? (
        <EmptyPanelState message={t("home.weeklyRhythmEmpty")} />
      ) : (
        <div className="flex-1">
          <div
            data-onboarding="week-chart"
            className="grid h-full auto-rows-fr gap-2"
            style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
          >
            {weekDays.map((day, index) => (
              <WeeklyProgressDayChip key={day.date} day={day} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyProgressDayChip({ day, index }: Readonly<{ day: DayOverview; index: number }>) {
  const { formatHours, formatWeekdayFromDate, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const date = new Date(`${day.date}T12:00:00`);
  const ratio = day.targetHours > 0 ? Math.min(day.loggedHours / day.targetHours, 1) : 0;
  const fillHeight = ratio > 0 ? Math.max(ratio * 100, 12) : 0;
  const isToday = day.isToday;
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";
  const dayState = getWeeklyDayState(day, ratio);
  const loggedLabel = formatCompactHoursValue(day.loggedHours, formatHours);
  const targetLabel =
    day.status === "non_workday" && day.targetHours === 0
      ? t("home.weeklyOffLabel")
      : formatCompactHoursValue(day.targetHours, formatHours);
  const loggedTextState = ratio >= 1 ? "met" : day.loggedHours > 0 ? "partial" : "empty";

  return (
    <m.div
      initial={shouldEnter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldEnter
          ? { type: "spring", duration: 0.25, bounce: 0.1, delay: index * 0.03 }
          : { duration: 0 }
      }
      aria-label={
        day.status === "non_workday" && day.targetHours === 0
          ? `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("common.status.nonWorkday")}`
          : `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("home.ofTarget", { target: targetLabel })}`
      }
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border-2 px-2 py-2",
        weeklyDayChipVariants({ state: dayState, isToday }),
      )}
    >
      <div
        className={cn(
          "absolute inset-0.75 overflow-hidden rounded-lg bg-field shadow-clay-inset",
          isToday && "bg-primary/10",
        )}
      >
        {allowDecorativeAnimation ? (
          <m.div
            className={cn("absolute inset-x-0 bottom-0 bg-linear-to-t", weeklyDayFillVariants({ state: dayState }))}
            initial={shouldEnter ? { height: 0 } : false}
            animate={{ height: `${fillHeight}%` }}
            transition={
              shouldEnter
                ? { type: "spring", stiffness: 90, damping: 18, delay: 0.08 + index * 0.03 }
                : { duration: 0 }
            }
          />
        ) : (
          <div
            className={cn("absolute inset-x-0 bottom-0 bg-linear-to-t", weeklyDayFillVariants({ state: dayState }))}
            style={{ height: `${fillHeight}%` }}
          />
        )}
      </div>

      <div className="relative z-10 flex min-h-27 flex-col items-center justify-between text-center">
        <p
          className={cn(
            "text-[0.65rem] font-semibold tracking-[0.16em] uppercase",
            isToday ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatWeekdayFromDate(date, "narrow")}
        </p>

        <div className="space-y-0.5">
          <p
            className={cn(
              "font-display text-sm leading-none font-semibold",
              loggedTextVariants({ state: loggedTextState }),
            )}
          >
            {loggedLabel}
          </p>
          <p className="text-[0.65rem] leading-none text-muted-foreground">{targetLabel}</p>
        </div>
      </div>
    </m.div>
  );
}

function EmptyPanelState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-28 flex-1 items-center rounded-2xl border-2 border-dashed border-border-subtle bg-panel px-4 py-8 text-sm text-muted-foreground shadow-clay-inset">
      {message}
    </div>
  );
}

function getWeeklyDayState(day: DayOverview, ratio: number): WeeklyDayState {
  if (day.status === "non_workday") return "non_workday";
  if (ratio >= 1) return "met";
  if (day.loggedHours > 0) return "partial";
  return "empty";
}

function formatCompactHoursValue(
  value: number,
  formatHours: (value: number, format?: "hm" | "decimal") => string,
) {
  return Number.isInteger(value) ? formatHours(value) : formatHours(value, "decimal");
}
