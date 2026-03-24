import { cva } from "class-variance-authority";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import { m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { FoxMascot, type FoxMood } from "@/shared/components/fox-mascot";
import { StaggerGroup } from "@/shared/components/page-transition";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { getCachedPlaySnapshot, prefetchPlaySnapshot } from "@/features/play/play-snapshot-cache";
import { useFormatHours } from "@/hooks/use-format-hours";
import { staggerItem } from "@/shared/utils/animations";
import { getFoxMoodForCompanionMood, normalizeCompanionMood } from "@/core/runtime/companion";
import { getCompactActionButtonClassName } from "@/shared/utils/control-styles";
import { useI18n } from "@/core/runtime/i18n";
import { useMotionSettings } from "@/core/runtime/motion";
import { cn } from "@/shared/utils/utils";

import type {
  BootstrapPayload,
  CompanionMood,
  DayOverview,
  PlaySnapshot,
  StreakDaySnapshot,
} from "@/shared/types/dashboard";

type Translate = ReturnType<typeof useI18n>["t"];
type DateFormatStyle = "short" | "narrow" | "long";

interface HomePageProps {
  payload: BootstrapPayload;
  needsSetup: boolean;
  onOpenSetup: () => void;
  onOpenWorklog?: (mode: "day" | "week" | "period") => void;
}

const primaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-primary) 14%, var(--color-panel-elevated))",
};

const heroSurface =
  "bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_42%),linear-gradient(135deg,color-mix(in_oklab,var(--color-panel-elevated)_88%,var(--color-page-canvas)),color-mix(in_oklab,var(--color-panel)_82%,var(--color-page-canvas)))]";

type WeeklyDayState = "non_workday" | "met" | "partial" | "empty";

function getWeeklyDayState(day: DayOverview, ratio: number): WeeklyDayState {
  if (day.status === "non_workday") return "non_workday";
  if (ratio >= 1) return "met";
  if (day.loggedHours > 0) return "partial";
  return "empty";
}

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

type StreakChipState = "counted" | "broken" | "skipped" | "default";

function getStreakChipState(day: StreakDaySnapshot): StreakChipState {
  if (day.state === "counted") return "counted";
  if (day.state === "broken") return "broken";
  if (day.state === "skipped") return "skipped";
  return "default";
}

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

export function HomePage({
  payload,
  needsSetup,
  onOpenSetup,
  onOpenWorklog,
}: Readonly<HomePageProps>) {
  const fh = useFormatHours();
  const { formatDateLong, formatDateShort, formatDayStatus, formatWeekdayFromDate, t } = useI18n();
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(() =>
    getCachedPlaySnapshot(),
  );
  const today = payload.today;
  const weekDays = payload.week;
  const companionMood = normalizeCompanionMood(playSnapshot?.equippedCompanionMood);
  const companionName = playSnapshot?.profile.companion ?? payload.profile.companion;
  const foxMood = getFoxMoodForCompanionMood(companionMood);
  const seedBase = `${today.date}:${payload.profile.alias}:${payload.profile.level}:${payload.streak.currentDays}:${payload.today.topIssues[0]?.key ?? "none"}`;
  const headline = buildHeadlineMessage(payload, t, `${seedBase}:headline`);
  const insight = buildInsightMessage(payload, companionName, fh, t, `${seedBase}:insight`);
  const petLine = buildPetStatusMessage(
    {
      companionMood,
      companionName,
      payload,
      hoursFormatter: fh,
      t,
    },
    `${seedBase}:pet`,
  );
  const heroPills = buildHeroPills({ payload, formatHours: fh, companionName, t });

  useEffect(() => {
    if (globalThis.window === undefined || !("__TAURI_INTERNALS__" in globalThis)) {
      return;
    }

    let cancelled = false;

    void prefetchPlaySnapshot()
      .then((snapshot) => {
        if (!cancelled && snapshot) {
          setPlaySnapshot(snapshot);
        }
      })
      .catch(() => {
        // Best effort; the hero can still use bootstrap data.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StaggerGroup>
      <div className="min-h-full space-y-8 bg-page-canvas">
        {needsSetup ? (
          <m.div
            variants={staggerItem}
            className="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/7 px-4 py-3 shadow-clay"
          >
            <span className="flex-1 text-sm text-foreground">{t("home.finishSetup")}</span>
            <Button onClick={onOpenSetup}>{t("home.continueSetup")}</Button>
          </m.div>
        ) : null}

        <m.section
          variants={staggerItem}
          data-onboarding="progress-ring"
          className={cn(
            "overflow-hidden rounded-4xl border-2 border-border-subtle p-6 shadow-card",
            heroSurface,
          )}
        >
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={today.status}>{formatDayStatus(today.status)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDateLong(new Date(`${today.date}T12:00:00`))}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  <MarkedMessage message={headline} />
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  <MarkedMessage message={insight} />
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {heroPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border-2 border-border-subtle bg-panel/90 px-3 py-1.5 shadow-clay"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3" data-onboarding="issue-list">
                <QuickLinkButton
                  label={t("home.ctaToday")}
                  note={formatDateLabel(today, formatWeekdayFromDate, formatDateShort)}
                  onClick={() => onOpenWorklog?.("day")}
                />
                <QuickLinkButton
                  label={t("home.ctaWeek")}
                  note={t("home.ctaWeekNote")}
                  onClick={() => onOpenWorklog?.("week")}
                />
                <QuickLinkButton
                  label={t("home.ctaPeriod")}
                  note={t("home.ctaPeriodNote")}
                  onClick={() => onOpenWorklog?.("period")}
                />
              </div>
            </div>

            <HeroCompanionPanel
              companionName={companionName}
              mood={companionMood}
              foxMood={foxMood}
              line={petLine}
            />
          </div>
        </m.section>

        <m.section variants={staggerItem} className="grid gap-6 xl:grid-cols-2">
          <WeeklyProgressSection weekDays={weekDays} />
          <StreakSection streak={payload.streak} />
        </m.section>
      </div>
    </StaggerGroup>
  );
}

function QuickLinkButton({
  label,
  note,
  onClick,
}: Readonly<{
  label: string;
  note: string;
  onClick?: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        getCompactActionButtonClassName(
          "group h-auto w-full justify-between rounded-2xl border-border-subtle bg-panel-elevated px-4 py-3 text-left text-foreground shadow-clay hover:border-primary/20 hover:bg-panel",
        ),
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{note}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function HeroCompanionPanel({
  companionName,
  mood,
  foxMood,
  line,
}: Readonly<{
  companionName: string;
  mood: CompanionMood;
  foxMood: FoxMood;
  line: string;
}>) {
  const { t } = useI18n();
  const moodLabelKeys: Record<CompanionMood, Parameters<typeof t>[0]> = {
    calm: "home.petMoodCalm",
    curious: "home.petMoodCurious",
    focused: "home.petMoodFocused",
    happy: "home.petMoodHappy",
    excited: "home.petMoodExcited",
    cozy: "home.petMoodCozy",
    playful: "home.petMoodPlayful",
    tired: "home.petMoodTired",
    drained: "home.petMoodDrained",
  };
  const moodLabel = t(moodLabelKeys[mood]);

  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center xl:pr-4">
      <div className="relative">
        <div className="absolute inset-4 rounded-full bg-primary/12 blur-2xl" aria-hidden="true" />
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-primary/15 shadow-card sm:h-44 sm:w-44"
          style={primaryTintSurface}
        >
          <FoxMascot mood={foxMood} size={104} animationMode="full" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {t("home.petPanelTitle")}
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground">{companionName}</h2>
        <p className="text-sm font-medium text-primary">{moodLabel}</p>
      </div>

      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        <MarkedMessage message={line} />
      </p>
    </div>
  );
}

function WeeklyProgressSection({ weekDays }: Readonly<{ weekDays: DayOverview[] }>) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {t("home.weeklyProgressTitle")}
      </h2>
      <WeeklyProgressCard weekDays={weekDays} />
    </div>
  );
}

function WeeklyProgressCard({ weekDays }: Readonly<{ weekDays: DayOverview[] }>) {
  const { t } = useI18n();

  if (weekDays.length === 0) {
    return <EmptyPanelState message={t("home.weeklyRhythmEmpty")} />;
  }

  return (
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
  const fillClass = weeklyDayFillVariants({ state: dayState });
  const loggedLabel = formatCompactHoursValue(day.loggedHours, formatHours);
  const targetLabel = getWeeklyTargetLabel(day, formatHours, t);
  const ariaLabel = getWeeklyAriaLabel(
    day,
    formatWeekdayFromDate,
    date,
    loggedLabel,
    targetLabel,
    t,
  );
  let loggedTextState: "met" | "partial" | "empty" = "empty";
  if (ratio >= 1) loggedTextState = "met";
  else if (day.loggedHours > 0) loggedTextState = "partial";
  const loggedTextClass = loggedTextVariants({ state: loggedTextState });

  const content = (
    <WeeklyProgressDayChipContent
      day={day}
      isToday={isToday}
      fillClass={fillClass}
      fillHeight={fillHeight}
      shouldEnter={shouldEnter}
      index={index}
      formatWeekdayFromDate={formatWeekdayFromDate}
      date={date}
      loggedLabel={loggedLabel}
      loggedTextClass={loggedTextClass}
      targetLabel={targetLabel}
      allowDecorativeAnimation={allowDecorativeAnimation}
    />
  );

  return (
    <m.div
      initial={shouldEnter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldEnter
          ? { type: "spring", duration: 0.25, bounce: 0.1, delay: index * 0.03 }
          : { duration: 0 }
      }
      aria-label={ariaLabel}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border-2 px-2 py-2",
        weeklyDayChipVariants({ state: dayState, isToday }),
      )}
    >
      {content}
    </m.div>
  );
}

function getWeeklyTargetLabel(
  day: DayOverview,
  formatHours: (value: number, format?: "hm" | "decimal") => string,
  t: Translate,
): string {
  return day.status === "non_workday" && day.targetHours === 0
    ? t("home.weeklyOffLabel")
    : formatCompactHoursValue(day.targetHours, formatHours);
}

function getWeeklyAriaLabel(
  day: DayOverview,
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string,
  date: Date,
  loggedLabel: string,
  targetLabel: string,
  t: Translate,
): string {
  return day.status === "non_workday" && day.targetHours === 0
    ? `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("common.status.nonWorkday")}`
    : `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("home.ofTarget", { target: targetLabel })}`;
}

function WeeklyProgressDayChipContent({
  isToday,
  fillClass,
  fillHeight,
  shouldEnter,
  index,
  formatWeekdayFromDate,
  date,
  loggedLabel,
  loggedTextClass,
  targetLabel,
  allowDecorativeAnimation,
}: Readonly<{
  day: DayOverview;
  isToday: boolean;
  fillClass: string;
  fillHeight: number;
  shouldEnter: boolean;
  index: number;
  formatWeekdayFromDate: (date: Date, style?: DateFormatStyle) => string;
  date: Date;
  loggedLabel: string;
  loggedTextClass: string;
  targetLabel: string;
  allowDecorativeAnimation: boolean;
}>) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0.75 overflow-hidden rounded-lg bg-field shadow-clay-inset",
          isToday && "bg-primary/10",
        )}
      >
        {allowDecorativeAnimation ? (
          <m.div
            className={cn("absolute inset-x-0 bottom-0 bg-linear-to-t", fillClass)}
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
            className={cn("absolute inset-x-0 bottom-0 bg-linear-to-t", fillClass)}
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
          <p className={cn("font-display text-sm leading-none font-semibold", loggedTextClass)}>
            {loggedLabel}
          </p>
          <p className="text-[0.65rem] leading-none text-muted-foreground">{targetLabel}</p>
        </div>
      </div>
    </>
  );
}

function StreakSection({ streak }: Readonly<{ streak: BootstrapPayload["streak"] }>) {
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

function EmptyPanelState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-28 flex-1 items-center rounded-2xl border-2 border-dashed border-border-subtle bg-panel px-4 py-8 text-sm text-muted-foreground shadow-clay-inset">
      {message}
    </div>
  );
}

function StreakDayChip({ day, index }: Readonly<{ day: StreakDaySnapshot; index: number }>) {
  const { formatWeekdayFromDate } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const date = new Date(`${day.date}T12:00:00`);
  const isToday = day.isToday;
  const dayState = getStreakChipState(day);
  const isCounted = day.state === "counted";
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  const content = (
    <>
      <AnimatedFlameIcon
        active={isCounted}
        enterDelay={0.1 + index * 0.04}
        iconClassName={flameVariants({ state: dayState })}
      />

      <p className={cn("text-xs font-semibold", isToday && "text-foreground")}>
        {formatWeekdayFromDate(date, "narrow")}
      </p>
      <p className="text-[0.65rem] text-muted-foreground">{date.getDate()}</p>
    </>
  );

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
      {content}
    </m.div>
  );
}

function AnimatedFlameIcon({
  active,
  ariaLabel,
  title,
  enterDelay = 0,
  iconClassName,
}: Readonly<{
  active: boolean;
  ariaLabel?: string;
  title?: string;
  enterDelay?: number;
  iconClassName?: string;
}>) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldAnimateIn = active && allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      title={title}
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

function getHeadlineKey(
  payload: BootstrapPayload,
): "victory" | "focus" | "holiday" | "weekend" | "warmup" {
  if (payload.today.status === "met_target" || payload.today.status === "over_target") {
    return "victory";
  }
  if (payload.today.status === "on_track") {
    return "focus";
  }
  if (payload.today.status === "non_workday" && payload.today.holidayName) {
    return "holiday";
  }
  if (payload.today.status === "non_workday") {
    return "weekend";
  }
  return "warmup";
}

function getHeadlineVariants(
  keyType: "victory" | "focus" | "holiday" | "weekend" | "warmup",
): readonly [string, string] {
  switch (keyType) {
    case "victory":
      return ["home.headlineVictoryA", "home.headlineVictoryB"] as const;
    case "focus":
      return ["home.headlineFocusA", "home.headlineFocusB"] as const;
    case "holiday":
      return ["home.headlineHolidayA", "home.headlineHolidayB"] as const;
    case "weekend":
      return ["home.headlineWeekendA", "home.headlineWeekendB"] as const;
    case "warmup":
      return ["home.headlineWarmupA", "home.headlineWarmupB"] as const;
  }
}

function buildHeadlineMessage(payload: BootstrapPayload, t: Translate, seed: string) {
  const keyType = getHeadlineKey(payload);
  const variants = getHeadlineVariants(keyType);
  const key = pickVariant(variants, seed);

  return t(key as Parameters<typeof t>[0], { alias: payload.profile.alias });
}

function buildInsightMessage(
  payload: BootstrapPayload,
  companionName: string,
  formatHours: (value: number) => string,
  t: Translate,
  seed: string,
) {
  if (payload.today.status === "non_workday") {
    if (payload.today.loggedHours > 0) {
      const key = pickVariant(
        ["home.insightNonWorkdayLoggedA", "home.insightNonWorkdayLoggedB"] as const,
        seed,
      );
      return t(key, {
        companion: companionName,
        hours: formatHours(payload.today.loggedHours),
      });
    }

    const key = pickVariant(
      ["home.insightNonWorkdayRestA", "home.insightNonWorkdayRestB"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      holiday: payload.today.holidayName ?? "",
    });
  }

  const weekLogged = payload.week.reduce((sum, day) => sum + day.loggedHours, 0);
  const topIssue = payload.today.topIssues[0];

  if (topIssue) {
    const key = pickVariant(
      ["home.insightTopIssueA", "home.insightTopIssueB", "home.insightTopIssueC"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      issueKey: topIssue.key,
      hours: formatHours(topIssue.hours),
    });
  }

  if (weekLogged > 0) {
    const key = pickVariant(
      ["home.insightWeekA", "home.insightWeekB", "home.insightWeekC"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      hours: formatHours(weekLogged),
    });
  }

  const key = pickVariant(
    ["home.insightStartA", "home.insightStartB", "home.insightStartC"] as const,
    seed,
  );
  return t(key, { companion: companionName });
}

function getPetStatusMessageKeys(mood: CompanionMood): readonly string[] {
  if (mood === "excited") {
    return ["home.petExcitedA", "home.petExcitedB"] as const;
  }
  if (mood === "happy") {
    return ["home.petHappyA", "home.petHappyB"] as const;
  }
  if (mood === "focused") {
    return ["home.petFocusedA", "home.petFocusedB"] as const;
  }
  return ["home.petCalmA", "home.petCalmB"] as const;
}

function buildPetStatusMessage(
  {
    companionMood,
    companionName,
    payload,
    hoursFormatter,
    t,
  }: {
    companionMood: CompanionMood;
    companionName: string;
    payload: BootstrapPayload;
    hoursFormatter: (value: number) => string;
    t: Translate;
  },
  seed: string,
) {
  const sharedParams = {
    companion: companionName,
    streak: `${payload.streak.currentDays}d`,
    focus: hoursFormatter(payload.today.focusHours),
    consistency: `${payload.month.consistencyScore}%`,
    hours: hoursFormatter(payload.today.loggedHours),
  };

  if (payload.today.status === "non_workday") {
    const keys =
      payload.today.loggedHours > 0
        ? (["home.petNonWorkdayActiveA", "home.petNonWorkdayActiveB"] as const)
        : (["home.petNonWorkdayRestA", "home.petNonWorkdayRestB"] as const);

    return t(pickVariant(keys, seed) as Parameters<typeof t>[0], sharedParams);
  }

  const keys = getPetStatusMessageKeys(companionMood);

  return t(pickVariant(keys, seed) as Parameters<typeof t>[0], sharedParams);
}

function pickVariant<T extends readonly string[]>(variants: T, seed: string): T[number] {
  return variants[hashSeed(seed) % variants.length] ?? variants[0];
}

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }

  return hash;
}

function MarkedMessage({ message }: Readonly<{ message: string }>) {
  return <>{buildMarkedNodes(message)}</>;
}

function buildMarkedNodes(message: string): ReactNode[] {
  const pattern = /\[\[(.+?)\]\]/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(message)) !== null) {
    if (match.index > cursor) {
      nodes.push(message.slice(cursor, match.index));
    }

    nodes.push(
      <span key={`${match.index}:${match[1]}`} className="font-semibold text-primary">
        {match[1]}
      </span>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < message.length) {
    nodes.push(message.slice(cursor));
  }

  return nodes;
}

function formatDateLabel(
  day: DayOverview,
  formatWeekdayFromDate: (date: Date, style?: DateFormatStyle) => string,
  formatDateShort: (date: Date) => string,
) {
  const date = new Date(`${day.date}T12:00:00`);
  return `${formatWeekdayFromDate(date)} ${formatDateShort(date)}`.trim();
}

function formatCompactHoursValue(
  value: number,
  formatHours: (value: number, format?: "hm" | "decimal") => string,
) {
  return Number.isInteger(value) ? formatHours(value) : formatHours(value, "decimal");
}

function buildHeroPills({
  payload,
  formatHours,
  companionName,
  t,
}: {
  payload: BootstrapPayload;
  formatHours: (value: number) => string;
  companionName: string;
  t: Translate;
}) {
  const logged = payload.today.loggedHours;
  const remaining = Math.max(payload.today.targetHours - logged, 0);
  const streak = `${payload.streak.currentDays}d`;

  if (payload.today.status === "non_workday") {
    const leadPill =
      logged > 0
        ? t("home.heroLoggedPill", { hours: formatHours(logged) })
        : payload.today.holidayName || t("home.heroRestDayPill", { companion: companionName });

    return [leadPill, t("home.heroNoTargetPill"), t("home.heroStreakSafePill", { streak })];
  }

  return [
    t("home.heroLoggedPill", { hours: formatHours(logged) }),
    remaining > 0
      ? t("home.heroRemainingPill", { hours: formatHours(remaining) })
      : t("home.heroTargetDonePill"),
    t("home.heroStreakPill", { streak }),
  ];
}
