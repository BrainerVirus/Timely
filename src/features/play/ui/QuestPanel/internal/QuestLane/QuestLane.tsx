import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Trophy from "lucide-react/dist/esm/icons/trophy.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  getCadence,
  getCategory,
  getDescription,
  getKey,
  getProgress,
  getReward,
  getTarget,
  getToneClass,
} from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";
import { QuestActionButton } from "@/features/play/ui/QuestPanel/internal/QuestActionButton/QuestActionButton";
import { springData, staggerItem } from "@/shared/lib/animations/animations";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";

import type { QuestPanelQuest } from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";

interface QuestLaneProps {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: typeof CalendarDays;
  quests: QuestPanelQuest[];
  iconTone: "primary" | "secondary" | "success";
  limit?: number;
  activatingQuestKey?: string | null;
  claimingQuestKey?: string | null;
  onActivateQuest?: (questKey: string) => void;
  onClaimQuest?: (questKey: string) => void;
}

export function QuestLane({
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
}: Readonly<QuestLaneProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
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
          allowDecorativeAnimation={allowDecorativeAnimation}
          windowVisibility={windowVisibility}
        />
      ) : (
        <StaggerGroup
          className="space-y-2"
          allowDecorativeAnimation={allowDecorativeAnimation}
          windowVisibility={windowVisibility}
        >
          {quests.map((quest, index) => {
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
                        transition={{ ...springData, delay: 0.15 + index * 0.05 }}
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
