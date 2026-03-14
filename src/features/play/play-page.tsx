import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getFoxMoodForCompanionMood } from "@/lib/companion";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { StaggerGroup } from "@/components/shared/page-transition";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { springBouncy, staggerContainer, staggerItem, staggerItemScale } from "@/lib/animations";
import { activateQuest, loadPlaySnapshot } from "@/lib/tauri";

import type { BootstrapPayload, CompanionMood, PlaySnapshot } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

const primaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-primary) 14%, var(--color-panel-elevated))",
};

const secondaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-secondary) 16%, var(--color-panel-elevated))",
};

export function PlayPage({ payload }: { payload: BootstrapPayload }) {
  const { t } = useI18n();
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(null);
  const [activatingQuestKey, setActivatingQuestKey] = useState<string | null>(null);

  useEffect(() => {
    void loadPlaySnapshot().then(setPlaySnapshot);
  }, []);

  const current: PlaySnapshot = playSnapshot ?? {
      profile: payload.profile,
      streak: payload.streak,
      quests: [],
      tokens: 0,
      equippedCompanionMood: "calm" as CompanionMood,
      inventory: [],
  };

  const foxMood: FoxMood = getFoxMoodForCompanionMood(current.equippedCompanionMood);
  const xpForNextLevel = (current.profile.level + 1) * 100;
  const xpRatio = Math.min(current.profile.xp / xpForNextLevel, 1);
  const moodLabel = t(getMoodLabelKey(current.equippedCompanionMood));
  const moodSupport = t(getMoodSupportKey(current.equippedCompanionMood));

  async function handleActivateQuest(questKey: string) {
    try {
      setActivatingQuestKey(questKey);
      const nextSnapshot = await activateQuest({ questKey });
      setPlaySnapshot(nextSnapshot);
      const activatedQuest = nextSnapshot.quests.find((quest) => quest.questKey === questKey);

      toast.success(t("gamification.toastQuestActivatedTitle"), {
        description: t("gamification.toastQuestActivatedDescription", {
          title: activatedQuest?.title ?? questKey,
        }),
        duration: 3500,
      });
    } catch (error) {
      toast.error(t("gamification.toastQuestActivationFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setActivatingQuestKey(null);
    }
  }

  return (
    <m.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 bg-[color:var(--color-page-canvas)]"
    >
      {/* ─── Hero: Fox + Level Ring ─── */}
      <m.div
        variants={staggerItem}
        className="rounded-[1.75rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-5 py-5 shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
        {/* Fox in a level-ring container */}
        <div className="relative mx-auto md:mx-0">
          {/* Outer clay circle */}
          <div
            className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/15 shadow-[var(--shadow-card)]"
            style={primaryTintSurface}
          >
            <FoxMascot mood={foxMood} size={88} />
          </div>

          {/* XP progress ring overlay */}
          <svg
            className="pointer-events-none absolute inset-0 -rotate-90"
            viewBox="0 0 144 144"
            aria-hidden="true"
          >
            <circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary/10"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <m.circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 68}
              initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 68 - 2 * Math.PI * 68 * xpRatio,
              }}
              transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.3 }}
            />
          </svg>

          {/* Level badge */}
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springBouncy, delay: 0.2 }}
            className="absolute -right-1 -bottom-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-primary/30 shadow-[var(--shadow-card)]"
            style={primaryTintSurface}
          >
            <span className="font-display text-sm font-bold text-primary">
              {current.profile.level}
            </span>
          </m.div>
        </div>

        {/* Companion name + mood */}
        <div className="space-y-3 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {t("play.moodLabel")}
            </p>
            <p className="font-display text-xl font-semibold text-foreground">
              {current.profile.companion ?? "Fox"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("play.feeling", { mood: moodLabel })}
            </p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            {moodSupport}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <MoodBadge label={moodLabel} tone="primary" />
            <MoodBadge label={`${current.streak.currentDays}d ${t("play.streak")}`} tone="secondary" />
            <MoodBadge label={`Lv ${current.profile.level}`} tone="secondary" />
          </div>
        </div>
        </div>
      </m.div>

      {/* ─── Stats Grid ─── */}
      <StaggerGroup className="grid grid-cols-2 gap-2 @xs:grid-cols-4">
        <StatChip
          icon={Award}
          label={t("play.level")}
          value={current.profile.level}
          color="primary"
        />
        <StatChip
          icon={Sparkles}
          label={t("play.xp")}
          value={current.profile.xp}
          suffix={`/${xpForNextLevel}`}
          color="secondary"
        />
        <StatChip
          icon={Flame}
          label={t("play.streak")}
          value={current.streak.currentDays}
          suffix="d"
          color="primary"
        />
        <StatChip
          icon={Coins}
          label={t("play.tokens")}
          value={current.tokens}
          color="secondary"
        />
      </StaggerGroup>

      {/* ─── Streak ─── */}
      <m.div variants={staggerItem}>
        <StreakDisplay streakDays={Math.min(current.streak.currentDays, 7)} />
      </m.div>

      {/* ─── Quests ─── */}
      <m.div variants={staggerItem}>
        {current.quests.length > 0 ? (
          <QuestPanel
            quests={current.quests}
            activatingQuestKey={activatingQuestKey}
            onActivateQuest={handleActivateQuest}
          />
        ) : (
          <EmptyState
            title={t("play.noActiveQuests")}
            description={t("play.noActiveQuestsDescription")}
            mood="idle"
            foxSize={80}
          />
        )}
      </m.div>
    </m.div>
  );
}

function getMoodLabelKey(mood: PlaySnapshot["equippedCompanionMood"]) {
  switch (mood) {
    case "curious":
      return "home.petMoodCurious" as const;
    case "focused":
      return "home.petMoodFocused" as const;
    case "happy":
      return "home.petMoodHappy" as const;
    case "excited":
      return "home.petMoodExcited" as const;
    case "cozy":
      return "home.petMoodCozy" as const;
    case "playful":
      return "home.petMoodPlayful" as const;
    case "tired":
      return "home.petMoodTired" as const;
    case "drained":
      return "home.petMoodDrained" as const;
    default:
      return "home.petMoodCalm" as const;
  }
}

function getMoodSupportKey(mood: PlaySnapshot["equippedCompanionMood"]) {
  switch (mood) {
    case "curious":
      return "play.moodSupportCurious" as const;
    case "focused":
      return "play.moodSupportFocused" as const;
    case "happy":
      return "play.moodSupportHappy" as const;
    case "excited":
      return "play.moodSupportExcited" as const;
    case "cozy":
      return "play.moodSupportCozy" as const;
    case "playful":
      return "play.moodSupportPlayful" as const;
    case "tired":
      return "play.moodSupportTired" as const;
    case "drained":
      return "play.moodSupportDrained" as const;
    default:
      return "play.moodSupportCalm" as const;
  }
}

function MoodBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "secondary";
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/25 bg-primary/10 text-primary"
      : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground";

  return (
    <span className={`rounded-full border-2 px-3 py-1 text-xs font-semibold shadow-[var(--shadow-button-soft)] ${toneClasses}`}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Chip with animated counter                                    */
/* ------------------------------------------------------------------ */

function StatChip({
  icon: Icon,
  label,
  value,
  suffix,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  color?: "primary" | "secondary";
}) {
  const motionValue = useMotionValue(0);
  const displayText = useTransform(motionValue, (v) =>
    Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1),
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: 60,
      damping: 20,
    });
    return controls.stop;
  }, [value, motionValue]);

  const colorClasses =
    color === "primary"
      ? "border-primary/20 text-primary"
      : "border-secondary/20 text-secondary";
  const tintSurfaceStyle = color === "primary" ? primaryTintSurface : secondaryTintSurface;

  return (
    <m.div
      variants={staggerItemScale}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-3 py-3 shadow-[var(--shadow-card)]"
    >
      <div
        className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${colorClasses}`}
        style={tintSurfaceStyle}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-center">
        <span className="font-display text-lg font-bold tabular-nums text-foreground leading-none">
          <m.span>{displayText}</m.span>
          {suffix ? (
            <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </span>
      </div>
      <span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </m.div>
  );
}
