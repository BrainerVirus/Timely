import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFoxMoodForCompanionMood, normalizeCompanionMood } from "@/lib/companion";
import { useI18n } from "@/lib/i18n";
import { loadPlaySnapshot } from "@/lib/tauri";
import { staggerItem } from "@/lib/animations";
import { getCompactActionButtonClassName } from "@/lib/control-styles";
import { cn } from "@/lib/utils";
import { useFormatHours } from "@/hooks/use-format-hours";

import type {
  BootstrapPayload,
  CompanionMood,
  DayOverview,
  PlaySnapshot,
  StreakDaySnapshot,
} from "@/types/dashboard";

type Translate = ReturnType<typeof useI18n>["t"];

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

export function HomePage({ payload, needsSetup, onOpenSetup, onOpenWorklog }: HomePageProps) {
  const fh = useFormatHours();
  const { formatDateLong, formatDateShort, formatDayStatus, formatWeekdayFromDate, t } = useI18n();
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(null);
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
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let cancelled = false;

    void loadPlaySnapshot()
      .then((snapshot) => {
        if (!cancelled) {
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
    <div className="min-h-full space-y-8 bg-[color:var(--color-page-canvas)]">
      {needsSetup ? (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
          variants={staggerItem}
          className="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/7 px-4 py-3 shadow-[var(--shadow-clay)]"
        >
          <span className="flex-1 text-sm text-foreground">{t("home.finishSetup")}</span>
          <Button onClick={onOpenSetup}>{t("home.continueSetup")}</Button>
        </m.div>
      ) : null}

      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
        variants={staggerItem}
        data-onboarding="progress-ring"
        className={cn(
          "overflow-hidden rounded-[2rem] border-2 border-[color:var(--color-border-subtle)] p-6 shadow-[var(--shadow-card)]",
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
                  className="rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)]/90 px-3 py-1.5 shadow-[var(--shadow-clay)]"
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

      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.1, delay: 0.05 }}
        variants={staggerItem}
        className="grid gap-6 xl:grid-cols-2"
      >
        <WeeklyProgressSection weekDays={weekDays} />
        <StreakSection streak={payload.streak} />
      </m.section>
    </div>
  );
}

function QuickLinkButton({
  label,
  note,
  onClick,
}: {
  label: string;
  note: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        getCompactActionButtonClassName(
          "group h-auto w-full justify-between rounded-2xl border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-4 py-3 text-left text-foreground shadow-[var(--shadow-clay)] hover:border-primary/20 hover:bg-[color:var(--color-panel)]",
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
}: {
  companionName: string;
  mood: CompanionMood;
  foxMood: FoxMood;
  line: string;
}) {
  const { t } = useI18n();
  const moodLabel =
    mood === "drained"
      ? t("home.petMoodDrained")
      : mood === "tired"
        ? t("home.petMoodTired")
        : mood === "playful"
          ? t("home.petMoodPlayful")
          : mood === "cozy"
            ? t("home.petMoodCozy")
            : mood === "curious"
              ? t("home.petMoodCurious")
              : mood === "excited"
      ? t("home.petMoodExcited")
      : mood === "happy"
        ? t("home.petMoodHappy")
        : mood === "focused"
          ? t("home.petMoodFocused")
          : t("home.petMoodCalm");

  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 text-center xl:pr-4">
      <div className="relative">
        <div className="absolute inset-4 rounded-full bg-primary/12 blur-2xl" aria-hidden="true" />
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-primary/15 shadow-[var(--shadow-card)] sm:h-44 sm:w-44"
          style={primaryTintSurface}
        >
          <FoxMascot mood={foxMood} size={104} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">{t("home.petPanelTitle")}</p>
        <h2 className="font-display text-xl font-semibold text-foreground">{companionName}</h2>
        <p className="text-sm font-medium text-primary">{moodLabel}</p>
      </div>

      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        <MarkedMessage message={line} />
      </p>
    </div>
  );
}

function WeeklyProgressSection({
  weekDays,
}: {
  weekDays: DayOverview[];
}) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-foreground">{t("home.weeklyProgressTitle")}</h2>
      <WeeklyProgressCard weekDays={weekDays} />
    </div>
  );
}

function WeeklyProgressCard({
  weekDays,
}: {
  weekDays: DayOverview[];
}) {
  const { t } = useI18n();

  if (weekDays.length === 0) {
    return (
      <div className="flex min-h-[7rem] flex-1 items-center rounded-2xl border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-4 py-8 text-sm text-muted-foreground shadow-[var(--shadow-clay-inset)]">
        {t("home.weeklyRhythmEmpty")}
      </div>
    );
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

function WeeklyProgressDayChip({
  day,
  index,
}: {
  day: DayOverview;
  index: number;
}) {
  const { formatHours, formatWeekdayFromDate, t } = useI18n();
  const date = new Date(`${day.date}T12:00:00`);
  const ratio = day.targetHours > 0 ? Math.min(day.loggedHours / day.targetHours, 1) : 0;
  const fillHeight = ratio > 0 ? Math.max(ratio * 100, 12) : 0;
  const isToday = day.isToday;
  const toneClass =
      day.status === "non_workday"
      ? "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground"
      : ratio >= 1
        ? "border-primary/30 bg-primary/10 text-primary shadow-[var(--shadow-button-soft)]"
        : day.loggedHours > 0
          ? "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] text-foreground shadow-[var(--shadow-card)]"
          : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] text-muted-foreground shadow-[var(--shadow-clay)]";
  const todayClass = isToday ? "border-primary/40 bg-primary/10 text-foreground" : "";
  const fillClass =
    day.status === "non_workday"
      ? "from-border/20 via-border/10 to-border/5"
      : ratio >= 1
        ? "from-primary/40 via-primary/24 to-primary/10"
        : day.loggedHours > 0
          ? "from-primary/30 via-primary/18 to-primary/8"
          : "from-transparent via-transparent to-transparent";
  const loggedLabel = formatCompactHoursValue(day.loggedHours, formatHours);
  const targetLabel =
    day.status === "non_workday" && day.targetHours === 0
      ? t("home.weeklyOffLabel")
      : formatCompactHoursValue(day.targetHours, formatHours);
  const ariaLabel =
    day.status === "non_workday" && day.targetHours === 0
      ? `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("common.status.nonWorkday")}`
      : `${formatWeekdayFromDate(date)} ${loggedLabel} ${t("home.ofTarget", { target: targetLabel })}`;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.25, bounce: 0.1, delay: index * 0.03 }}
      aria-label={ariaLabel}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border-2 px-2 py-2",
        toneClass,
        todayClass,
      )}
    >
      <div
        className={cn(
          "absolute inset-[3px] overflow-hidden rounded-[1rem] bg-[color:var(--color-field)] shadow-[var(--shadow-clay-inset)]",
          isToday && "bg-primary/10",
        )}
      >
        <m.div
          className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t", fillClass)}
          initial={{ height: 0 }}
          animate={{ height: `${fillHeight}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.08 + index * 0.03 }}
        />
      </div>

      <div className="relative z-10 flex min-h-[6.75rem] flex-col items-center justify-between text-center">
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
              "font-display text-sm font-semibold leading-none",
              ratio >= 1 ? "text-primary" : day.loggedHours > 0 ? "text-foreground" : "text-muted-foreground",
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

function StreakSection({
  streak,
}: {
  streak: BootstrapPayload["streak"];
}) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-8 items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("home.streakPanelTitle")}
          </h2>
          <Badge tone="on_track" className="rounded-xl px-2.5 py-1 text-[0.72rem] leading-none shadow-[var(--shadow-button-soft)]">
            {streak.currentDays}d
          </Badge>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid h-full grid-cols-7 gap-2">
          {streak.window.map((day, index) => (
            <StreakDayChip key={day.date} day={day} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakDayChip({
  day,
  index,
}: {
  day: StreakDaySnapshot;
  index: number;
}) {
  const { formatWeekdayFromDate } = useI18n();
  const date = new Date(`${day.date}T12:00:00`);
  const isToday = day.isToday;
  const toneClass =
      day.state === "counted"
      ? "border-primary/30 bg-primary/10 text-primary shadow-[var(--shadow-button-soft)]"
      : day.state === "broken"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : day.state === "skipped"
          ? "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground"
          : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] text-muted-foreground shadow-[var(--shadow-clay)]";
  const todayClass =
    !isToday
      ? ""
      : day.state === "broken"
        ? "border-destructive/40 bg-destructive/12"
        : "border-primary/40 bg-primary/12 text-foreground";
  const isCounted = day.state === "counted";
  const flameClassName =
    day.state === "counted"
      ? "text-primary drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]"
      : day.state === "broken"
        ? "text-destructive"
        : day.state === "skipped"
          ? "text-muted-foreground/75"
          : "text-muted-foreground/60";

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.25, bounce: 0.1, delay: index * 0.03 }}
      className={cn(
        "flex min-h-[6.75rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center",
        toneClass,
        todayClass,
      )}
      >
      <AnimatedFlameIcon active={isCounted} enterDelay={0.1 + index * 0.04} iconClassName={cn("h-4 w-4", flameClassName)} />

      <p className={cn("text-xs font-semibold", isToday && "text-foreground")}>
        {formatWeekdayFromDate(date, "narrow")}
      </p>
      <p className="text-[0.65rem] text-muted-foreground">{date.getDate()}</p>
    </m.div>
  );
}

function AnimatedFlameIcon({
  active,
  ariaLabel,
  title,
  enterDelay = 0,
  iconClassName,
}: {
  active: boolean;
  ariaLabel?: string;
  title?: string;
  enterDelay?: number;
  iconClassName?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimateIn = active && !prefersReducedMotion;

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
      <Flame
        className={cn("shrink-0", iconClassName)}
      />
    </m.span>
  );
}

function buildHeadlineMessage(payload: BootstrapPayload, t: Translate, seed: string) {
  const key = pickVariant(
    payload.today.status === "met_target" || payload.today.status === "over_target"
      ? (["home.headlineVictoryA", "home.headlineVictoryB"] as const)
      : payload.today.status === "on_track"
        ? (["home.headlineFocusA", "home.headlineFocusB"] as const)
        : payload.today.status === "non_workday" && payload.today.holidayName
          ? (["home.headlineHolidayA", "home.headlineHolidayB"] as const)
          : payload.today.status === "non_workday"
          ? (["home.headlineWeekendA", "home.headlineWeekendB"] as const)
          : (["home.headlineWarmupA", "home.headlineWarmupB"] as const),
    seed,
  );

  return t(key, { alias: payload.profile.alias });
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

    return t(pickVariant(keys, seed), sharedParams);
  }

  const keys =
    companionMood === "excited"
      ? (["home.petExcitedA", "home.petExcitedB"] as const)
      : companionMood === "happy"
        ? (["home.petHappyA", "home.petHappyB"] as const)
        : companionMood === "focused"
          ? (["home.petFocusedA", "home.petFocusedB"] as const)
          : (["home.petCalmA", "home.petCalmB"] as const);

  return t(pickVariant(keys, seed), sharedParams);
}

function pickVariant<T extends string>(variants: readonly T[], seed: string): T {
  return variants[hashSeed(seed) % variants.length] ?? variants[0];
}

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function MarkedMessage({ message }: { message: string }) {
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
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string,
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
