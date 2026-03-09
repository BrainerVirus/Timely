import Crosshair from "lucide-react/dist/esm/icons/crosshair.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Trophy from "lucide-react/dist/esm/icons/trophy.js";
import { m } from "motion/react";
import { StaggerGroup } from "@/components/shared/page-transition";
import { springBouncy, springData, staggerItem } from "@/lib/animations";

import type { GamificationQuestSummary, Quest } from "@/types/dashboard";

interface QuestPanelProps {
  quests: Array<Quest | GamificationQuestSummary>;
}

function getProgress(quest: Quest | GamificationQuestSummary) {
  return "progressValue" in quest ? quest.progressValue : quest.progress;
}

function getTarget(quest: Quest | GamificationQuestSummary) {
  return "targetValue" in quest ? quest.targetValue : quest.total;
}

function getReward(quest: Quest | GamificationQuestSummary) {
  return "rewardLabel" in quest ? quest.rewardLabel : quest.reward;
}

function getKey(quest: Quest | GamificationQuestSummary) {
  return "questKey" in quest ? quest.questKey : quest.title;
}

export function QuestPanel({ quests }: QuestPanelProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-lg border-2 border-secondary/20 bg-secondary/10">
          <Crosshair className="h-3.5 w-3.5 text-secondary" />
        </div>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Active missions
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

      {/* Quest cards */}
      <StaggerGroup className="space-y-2">
        {quests.map((quest, i) => {
          const progress = getProgress(quest);
          const target = getTarget(quest);
          const pct = Math.min((progress / Math.max(target, 1)) * 100, 100);
          const isComplete = pct >= 100;

          return (
            <m.div
              key={getKey(quest)}
              variants={staggerItem}
              className="rounded-xl border-2 border-border bg-card p-3 shadow-[var(--shadow-clay)] transition-shadow hover:shadow-[var(--shadow-clay-hover)]"
            >
              <div className="flex items-start gap-3">
                {/* Quest icon */}
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-border bg-muted shadow-[1px_1px_0_0_var(--color-border)]">
                  {isComplete ? (
                    <Trophy className="h-4 w-4 text-success" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-secondary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title + percentage */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{quest.title}</p>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </div>

                  {/* Reward label */}
                  <p className="mt-0.5 text-xs text-muted-foreground">{getReward(quest)}</p>

                  {/* Progress bar — constrained to parent, no overflow */}
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background shadow-[var(--shadow-clay-inset)]">
                    <m.div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ ...springData, delay: 0.15 + i * 0.05 }}
                    />
                  </div>

                  {/* Progress numbers */}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[0.65rem] font-bold tabular-nums text-muted-foreground">
                      {progress} / {target}
                    </span>
                    {isComplete && (
                      <m.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={springBouncy}
                        className="rounded-full bg-success/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-success"
                      >
                        Complete!
                      </m.span>
                    )}
                  </div>
                </div>
              </div>
            </m.div>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
