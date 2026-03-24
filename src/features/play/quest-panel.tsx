import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Crosshair from "lucide-react/dist/esm/icons/crosshair.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Trophy from "lucide-react/dist/esm/icons/trophy.js";
import { m } from "motion/react";
import { EmptyState } from "@/shared/components/empty-state";
import { StaggerGroup } from "@/shared/components/page-transition";
import { Button } from "@/shared/ui/button";
import { springBouncy, springData, staggerItem } from "@/shared/utils/animations";
import { useI18n } from "@/core/runtime/i18n";

import type { GamificationQuestSummary, Quest } from "@/shared/types/dashboard";

interface QuestPanelProps {
  quests: Array<Quest | GamificationQuestSummary>;
  activatingQuestKey?: string | null;
  claimingQuestKey?: string | null;
  onActivateQuest?: (questKey: string) => void;
  onClaimQuest?: (questKey: string) => void;
}

type QuestCadence = "daily" | "weekly" | "achievement";

function getProgress(quest: Quest | GamificationQuestSummary) {
  return "progressValue" in quest ? quest.progressValue : quest.progress;
}

function getTarget(quest: Quest | GamificationQuestSummary) {
  return "targetValue" in quest ? quest.targetValue : quest.total;
}

function getReward(quest: Quest | GamificationQuestSummary) {
  return "rewardLabel" in quest ? quest.rewardLabel : quest.reward;
}

function getDescription(quest: Quest | GamificationQuestSummary) {
  return "description" in quest ? quest.description : "";
}

function getKey(quest: Quest | GamificationQuestSummary) {
  return "questKey" in quest ? quest.questKey : quest.title;
}

function getCadence(quest: Quest | GamificationQuestSummary): QuestCadence {
  return "cadence" in quest ? quest.cadence : "daily";
}

function getCategory(quest: Quest | GamificationQuestSummary) {
  return "category" in quest ? quest.category : "focus";
}

export function QuestPanel({
  quests,
  activatingQuestKey,
  claimingQuestKey,
  onActivateQuest,
  onClaimQuest,
}: Readonly<QuestPanelProps>) {
  const { t } = useI18n();
  const dailyQuests = quests.filter((quest) => getCadence(quest) === "daily");
  const weeklyQuests = quests.filter((quest) => getCadence(quest) === "weekly");
  const achievementQuests = quests.filter((quest) => getCadence(quest) === "achievement");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-lg border-2 border-secondary/20 bg-secondary/10">
          <Crosshair className="h-3.5 w-3.5 text-secondary" />
        </div>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {t("gamification.activeMissions")}
        </span>
        <m.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springBouncy}
          className="ml-auto rounded-full border-2 border-secondary/20 bg-secondary/10 px-2 py-0.5 text-[0.65rem] font-bold text-secondary"
        >
          {quests.length}
        </m.span>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <QuestLane
          title={t("gamification.dailyMissions")}
          emptyTitle={t("gamification.emptyDaily")}
          emptyDescription={t("gamification.emptyDailyDescription")}
          icon={CalendarDays}
          quests={dailyQuests}
          iconTone="primary"
          limit={3}
          activatingQuestKey={activatingQuestKey}
          claimingQuestKey={claimingQuestKey}
          onActivateQuest={onActivateQuest}
          onClaimQuest={onClaimQuest}
        />
        <QuestLane
          title={t("gamification.weeklyMissions")}
          emptyTitle={t("gamification.emptyWeekly")}
          emptyDescription={t("gamification.emptyWeeklyDescription")}
          icon={Sparkles}
          quests={weeklyQuests}
          iconTone="secondary"
          limit={5}
          activatingQuestKey={activatingQuestKey}
          claimingQuestKey={claimingQuestKey}
          onActivateQuest={onActivateQuest}
          onClaimQuest={onClaimQuest}
        />
        <QuestLane
          title={t("gamification.achievementLog")}
          emptyTitle={t("gamification.emptyAchievements")}
          emptyDescription={t("gamification.emptyAchievementsDescription")}
          icon={Trophy}
          quests={achievementQuests}
          iconTone="success"
          activatingQuestKey={activatingQuestKey}
          claimingQuestKey={claimingQuestKey}
          onClaimQuest={onClaimQuest}
        />
      </div>
    </div>
  );
}

function QuestActionButton({
  quest,
  canClaim,
  canActivate,
  isClaimed,
  isComplete,
  claimingQuestKey,
  activatingQuestKey,
  onClaimQuest,
  onActivateQuest,
  t,
}: Readonly<{
  quest: Quest | GamificationQuestSummary;
  canClaim: boolean;
  canActivate: boolean;
  isClaimed: boolean;
  isComplete: boolean;
  claimingQuestKey?: string | null;
  activatingQuestKey?: string | null;
  onClaimQuest?: (questKey: string) => void;
  onActivateQuest?: (questKey: string) => void;
  t: ReturnType<typeof useI18n>["t"];
}>) {
  if (canClaim) {
    return (
      <Button
        type="button"
        size="sm"
        variant={getCadence(quest) === "achievement" ? "primary" : "soft"}
        disabled={claimingQuestKey === getKey(quest)}
        onClick={() => onClaimQuest?.(getKey(quest))}
      >
        {t("gamification.claimReward")}
      </Button>
    );
  }

  if (canActivate) {
    return (
      <Button
        type="button"
        size="sm"
        variant="soft"
        disabled={activatingQuestKey === getKey(quest)}
        onClick={() => onActivateQuest?.(getKey(quest))}
      >
        {t("gamification.activate")}
      </Button>
    );
  }

  if (isClaimed) {
    return (
      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[0.6rem] font-bold text-secondary">
        {t("gamification.claimed")}
      </span>
    );
  }

  if (isComplete) {
    return (
      <m.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springBouncy}
        className="rounded-full bg-success/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-success"
      >
        {t("gamification.complete")}
      </m.span>
    );
  }

  return null;
}

function getToneClass(iconTone: "primary" | "secondary" | "success"): string {
  if (iconTone === "primary") {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  if (iconTone === "success") {
    return "border-success/20 bg-success/10 text-success";
  }
  return "border-secondary/20 bg-secondary/10 text-secondary";
}

function QuestLane({
  title,
  emptyTitle,
  emptyDescription,
  icon: Icon,
  quests,
  iconTone,
  limit,
  activatingQuestKey,
  claimingQuestKey,
  onActivateQuest,
  onClaimQuest,
}: Readonly<{
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: typeof CalendarDays;
  quests: Array<Quest | GamificationQuestSummary>;
  iconTone: "primary" | "secondary" | "success";
  limit?: number;
  activatingQuestKey?: string | null;
  claimingQuestKey?: string | null;
  onActivateQuest?: (questKey: string) => void;
  onClaimQuest?: (questKey: string) => void;
}>) {
  const { t } = useI18n();
  const activeCount = quests.filter((quest) => "isActive" in quest && quest.isActive).length;
  const toneClass = getToneClass(iconTone);

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
      <div className="flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-xl border-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {limit ? t("gamification.activeCount", { count: activeCount, limit }) : quests.length}
          </p>
        </div>
      </div>

      {quests.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          mood="cozy"
          foxSize={68}
          variant="plain"
        />
      ) : (
        <StaggerGroup className="space-y-2">
          {quests.map((quest, i) => {
            const progress = getProgress(quest);
            const target = getTarget(quest);
            const pct = Math.min((progress / Math.max(target, 1)) * 100, 100);
            const isComplete = pct >= 100;
            const isActive = "isActive" in quest ? quest.isActive : false;
            const isClaimed = "isClaimed" in quest ? quest.isClaimed : false;
            const canActivate =
              !!onActivateQuest &&
              getCadence(quest) !== "achievement" &&
              !isActive &&
              !isClaimed &&
              !!("questKey" in quest);
            const canClaim = !!onClaimQuest && isComplete && !isClaimed && !!("questKey" in quest);

            return (
              <m.div
                key={getKey(quest)}
                variants={staggerItem}
                className="rounded-2xl border-2 border-border-subtle bg-field p-3 shadow-clay"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-border-subtle bg-panel shadow-button-soft">
                    {isComplete ? (
                      <Trophy className="h-4 w-4 text-success" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-secondary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{quest.title}</p>
                      <span className="shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold">
                      <span className="rounded-full border border-border-subtle bg-panel px-2 py-0.5 text-muted-foreground">
                        {t(`gamification.category.${getCategory(quest)}` as const)}
                      </span>
                      <span className="text-muted-foreground">{getReward(quest)}</span>
                    </div>

                    {getDescription(quest) ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {getDescription(quest)}
                      </p>
                    ) : null}

                    <div className="h-2 overflow-hidden rounded-full bg-panel shadow-clay-inset">
                      <m.div
                        className="h-2 rounded-full bg-linear-to-r from-primary to-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ ...springData, delay: 0.15 + i * 0.05 }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[0.65rem] font-bold text-muted-foreground tabular-nums">
                        {progress} / {target}
                      </span>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
                            {t("gamification.activeNow")}
                          </span>
                        ) : null}
                        <QuestActionButton
                          quest={quest}
                          canClaim={canClaim}
                          canActivate={canActivate}
                          isClaimed={isClaimed}
                          isComplete={isComplete}
                          claimingQuestKey={claimingQuestKey}
                          activatingQuestKey={activatingQuestKey}
                          onClaimQuest={onClaimQuest}
                          onActivateQuest={onActivateQuest}
                          t={t}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            );
          })}
        </StaggerGroup>
      )}
    </section>
  );
}
