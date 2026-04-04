import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import { useEffect, useState, type ReactNode } from "react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  getFoxMoodForCompanionMood,
  normalizeCompanionMood,
} from "@/features/home/lib/Companion/companion";
import {
  buildHeadlineMessage,
  buildHeroPills,
  buildInsightMessage,
  buildPetStatusMessage,
  formatDateLabel,
} from "@/features/home/lib/home-hero-content/home-hero-content";
import {
  getCachedPlaySnapshot,
  prefetchPlaySnapshot,
} from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";
import { getCompactActionButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { FoxMascot, type FoxMood } from "@/shared/ui/FoxMascot/FoxMascot";

import type { BootstrapPayload, CompanionMood, PlaySnapshot } from "@/shared/types/dashboard";

const primaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-primary) 14%, var(--color-panel-elevated))",
};

const heroSurface =
  "bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_42%),linear-gradient(135deg,color-mix(in_oklab,var(--color-panel-elevated)_88%,var(--color-page-canvas)),color-mix(in_oklab,var(--color-panel)_82%,var(--color-page-canvas)))]";

export function HomeHeroSection({
  payload,
  needsSetup,
  onOpenSetup,
  onOpenWorklog,
}: Readonly<{
  payload: BootstrapPayload;
  needsSetup: boolean;
  onOpenSetup: () => void;
  onOpenWorklog?: (mode: "day" | "week" | "period") => void;
}>) {
  const fh = useFormatHours();
  const { formatDateLong, formatDateShort, formatDayStatus, formatWeekdayFromDate, t } = useI18n();
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(() =>
    getCachedPlaySnapshot(),
  );
  const today = payload.today;
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
    <>
      {needsSetup ? (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/7 px-4 py-3 shadow-clay">
          <span className="flex-1 text-sm text-foreground">{t("home.finishSetup")}</span>
          <Button onClick={onOpenSetup}>{t("home.continueSetup")}</Button>
        </div>
      ) : null}

      <section
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
      </section>
    </>
  );
}

function QuickLinkButton({
  label,
  note,
  onClick,
}: Readonly<{ label: string; note: string; onClick?: () => void }>) {
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
  const motionSettings = useMotionSettings();
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

  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center xl:pr-4">
      <div className="relative">
        <div className="absolute inset-4 rounded-full bg-primary/12 blur-2xl" aria-hidden="true" />
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-primary/15 shadow-card sm:h-44 sm:w-44"
          style={primaryTintSurface}
        >
          <FoxMascot
            mood={foxMood}
            size={104}
            animationMode="full"
            motionSettings={motionSettings}
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {t("home.petPanelTitle")}
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground">{companionName}</h2>
        <p className="text-sm font-medium text-primary">{t(moodLabelKeys[mood])}</p>
      </div>

      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        <MarkedMessage message={line} />
      </p>
    </div>
  );
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
