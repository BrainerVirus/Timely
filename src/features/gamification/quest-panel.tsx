import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import { m } from "motion/react";
import { cardContainerVariants, cardItemVariants } from "@/lib/animations";

import type { GamificationQuestSummary, Quest } from "@/types/dashboard";

interface QuestPanelProps {
  quests: Array<Quest | GamificationQuestSummary>;
}

export function QuestPanel({ quests }: QuestPanelProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Gamepad2 className="h-3.5 w-3.5 text-secondary" />
        Quests
      </div>
      <m.div
        variants={cardContainerVariants}
        initial="initial"
        animate="animate"
        className="space-y-1.5"
      >
        {quests.map((quest) => (
          <m.div
            key={"questKey" in quest ? quest.questKey : quest.title}
            variants={cardItemVariants}
            className="rounded-lg border border-border bg-card p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{quest.title}</p>
                <p className="text-xs text-muted-foreground">
                  {"rewardLabel" in quest ? quest.rewardLabel : quest.reward}
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold text-muted-foreground">
                {"progressValue" in quest ? quest.progressValue : quest.progress}/
                {"targetValue" in quest ? quest.targetValue : quest.total}
              </p>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-background">
              <m.div
                className="h-1 rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    (("progressValue" in quest ? quest.progressValue : quest.progress) /
                      Math.max("targetValue" in quest ? quest.targetValue : quest.total, 1)) *
                    100
                  }%`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 15,
                  delay: 0.2,
                }}
              />
            </div>
          </m.div>
        ))}
      </m.div>
    </div>
  );
}
