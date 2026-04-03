import type { GamificationQuestSummary, Quest } from "@/shared/types/dashboard";

export type QuestPanelQuest = Quest | GamificationQuestSummary;
export type QuestCadence = "daily" | "weekly" | "achievement";

export function getProgress(quest: QuestPanelQuest) {
  return "progressValue" in quest ? quest.progressValue : quest.progress;
}

export function getTarget(quest: QuestPanelQuest) {
  return "targetValue" in quest ? quest.targetValue : quest.total;
}

export function getReward(quest: QuestPanelQuest) {
  return "rewardLabel" in quest ? quest.rewardLabel : quest.reward;
}

export function getDescription(quest: QuestPanelQuest) {
  return "description" in quest ? quest.description : "";
}

export function getKey(quest: QuestPanelQuest) {
  return "questKey" in quest ? quest.questKey : quest.title;
}

export function getCadence(quest: QuestPanelQuest): QuestCadence {
  return "cadence" in quest ? quest.cadence : "daily";
}

export function getCategory(quest: QuestPanelQuest) {
  return "category" in quest ? quest.category : "focus";
}

export function getToneClass(iconTone: "primary" | "secondary" | "success"): string {
  if (iconTone === "primary") {
    return "border-primary/20 bg-primary/10 text-primary";
  }

  if (iconTone === "success") {
    return "border-success/20 bg-success/10 text-success";
  }

  return "border-secondary/20 bg-secondary/10 text-secondary";
}

export function splitQuestsByCadence(quests: QuestPanelQuest[]) {
  return {
    dailyQuests: quests.filter((quest) => getCadence(quest) === "daily"),
    weeklyQuests: quests.filter((quest) => getCadence(quest) === "weekly"),
    achievementQuests: quests.filter((quest) => getCadence(quest) === "achievement"),
  };
}
