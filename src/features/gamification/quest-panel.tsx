import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import { m } from "motion/react";

import type { GamificationQuestSummary, Quest } from "@/types/dashboard";

interface QuestPanelProps {
  quests: Array<Quest | GamificationQuestSummary>;
}

export function QuestPanel({ quests }: QuestPanelProps) {
  return (
    <div className="space-y-2 rounded-2xl border-2 border-border bg-muted p-4 shadow-[var(--shadow-clay)]">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Gamepad2 className="h-3.5 w-3.5 text-secondary" />
        Quests
      </div>
      <div className="space-y-2">
        {quests.map((quest, i) => (
          <m.div
            key={"questKey" in quest ? quest.questKey : quest.title}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.1, delay: i * 0.05 }}
            className="rounded-xl border-2 border-border bg-card p-3 shadow-[1px_1px_0_0_var(--color-border)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground">{quest.title}</p>
                <p className="text-xs text-muted-foreground">
                  {"rewardLabel" in quest ? quest.rewardLabel : quest.reward}
                </p>
              </div>
              <p className="shrink-0 text-xs font-bold text-muted-foreground">
                {"progressValue" in quest ? quest.progressValue : quest.progress}/
                {"targetValue" in quest ? quest.targetValue : quest.total}
              </p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-background shadow-[var(--shadow-clay-inset)]">
              <m.div
                className="h-1.5 rounded-full bg-primary"
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
                  delay: 0.2 + i * 0.05,
                }}
              />
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
}
