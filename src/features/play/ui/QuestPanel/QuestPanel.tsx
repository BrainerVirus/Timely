import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Crosshair from "lucide-react/dist/esm/icons/crosshair.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Trophy from "lucide-react/dist/esm/icons/trophy.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { QuestLane } from "@/features/play/ui/QuestPanel/internal/QuestLane/QuestLane";
import { splitQuestsByCadence } from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";
import { springBouncy } from "@/shared/lib/animations/animations";

import type { QuestPanelQuest } from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";

interface QuestPanelProps {
  quests: QuestPanelQuest[];
  activatingQuestKey?: string | null;
  claimingQuestKey?: string | null;
  onActivateQuest?: (questKey: string) => void;
  onClaimQuest?: (questKey: string) => void;
}

export function QuestPanel({
  quests,
  activatingQuestKey,
  claimingQuestKey,
  onActivateQuest,
  onClaimQuest,
}: Readonly<QuestPanelProps>) {
  const { t } = useI18n();
  const { dailyQuests, weeklyQuests, achievementQuests } = splitQuestsByCadence(quests);

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
