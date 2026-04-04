import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { getCadence, getKey } from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";
import { springBouncy } from "@/shared/lib/animations/animations";
import { Button } from "@/shared/ui/Button/Button";

import type { QuestPanelQuest } from "@/features/play/ui/QuestPanel/internal/quest-panel-helpers";

interface QuestActionButtonProps {
  quest: QuestPanelQuest;
  canClaim: boolean;
  canActivate: boolean;
  isClaimed: boolean;
  isComplete: boolean;
  claimingQuestKey?: string | null;
  activatingQuestKey?: string | null;
  onClaimQuest?: (questKey: string) => void;
  onActivateQuest?: (questKey: string) => void;
}

export function QuestActionButton({
  quest,
  canClaim,
  canActivate,
  isClaimed,
  isComplete,
  claimingQuestKey,
  activatingQuestKey,
  onClaimQuest,
  onActivateQuest,
}: Readonly<QuestActionButtonProps>) {
  const { t } = useI18n();

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
