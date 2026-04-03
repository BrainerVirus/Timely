import type { PlaySnapshot } from "@/shared/types/dashboard";

export type StorePrimaryTab = "all" | "featured" | "companions" | "accessories";
export type StoreSecondaryFilter =
  | "all"
  | "owned"
  | "locked"
  | "habitats"
  | "wearables"
  | "recovery";

export function getMoodLabelKey(mood: PlaySnapshot["equippedCompanionMood"]) {
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

export function getMoodSupportKey(mood: PlaySnapshot["equippedCompanionMood"]) {
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

export function sortRecommendedQuests(
  left: PlaySnapshot["quests"][number],
  right: PlaySnapshot["quests"][number],
) {
  const rank = (quest: PlaySnapshot["quests"][number]) => {
    if (!quest.isClaimed && quest.progressValue >= quest.targetValue) return 0;
    if (quest.isActive) return 1;
    if (!quest.isClaimed) return 2;
    return 3;
  };

  const rankDifference = rank(left) - rank(right);
  if (rankDifference !== 0) {
    return rankDifference;
  }

  const leftCompletion = left.targetValue === 0 ? 0 : left.progressValue / left.targetValue;
  const rightCompletion = right.targetValue === 0 ? 0 : right.progressValue / right.targetValue;
  return rightCompletion - leftCompletion;
}

type PlayMessageKey = string;

export function getRewardDisplayNameKey(rewardKey: string) {
  return `play.reward.${rewardKey}.name` as PlayMessageKey;
}

export function getRewardDisplayDescriptionKey(rewardKey: string) {
  return `play.reward.${rewardKey}.description` as PlayMessageKey;
}

export function getQuestTitleKey(questKey: string) {
  return `play.quest.${questKey}.title` as PlayMessageKey;
}

export function getQuestDescriptionKey(questKey: string) {
  return `play.quest.${questKey}.description` as PlayMessageKey;
}

export function getQuestRewardLabelKey(questKey: string) {
  return `play.quest.${questKey}.rewardLabel` as PlayMessageKey;
}

export function translateRewardName(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "rewardKey" | "rewardName">,
  t: (key: string) => string,
) {
  const key = getRewardDisplayNameKey(reward.rewardKey);
  const translated = t(key);
  return translated === key ? reward.rewardName : translated;
}

export function translateRewardDescription(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "rewardKey">,
  t: (key: string) => string,
) {
  const key = getRewardDisplayDescriptionKey(reward.rewardKey);
  const translated = t(key);
  return translated === key ? undefined : translated;
}

export function withTranslatedReward<
  T extends Pick<PlaySnapshot["storeCatalog"][number], "rewardKey" | "rewardName">,
>(reward: T, t: (key: string) => string) {
  return {
    ...reward,
    rewardName: translateRewardName(reward, t),
  };
}

export function withTranslatedQuest<T extends PlaySnapshot["quests"][number]>(
  quest: T,
  t: (key: string) => string,
) {
  const titleKey = getQuestTitleKey(quest.questKey);
  const descriptionKey = getQuestDescriptionKey(quest.questKey);
  const rewardLabelKey = getQuestRewardLabelKey(quest.questKey);
  const translatedTitle = t(titleKey);
  const translatedDescription = t(descriptionKey);
  const translatedRewardLabel = t(rewardLabelKey);

  return {
    ...quest,
    title: translatedTitle === titleKey ? quest.title : translatedTitle,
    description:
      translatedDescription === descriptionKey ? quest.description : translatedDescription,
    rewardLabel:
      translatedRewardLabel === rewardLabelKey ? quest.rewardLabel : translatedRewardLabel,
  };
}

export function getPrimaryTabLabelKey(tab: StorePrimaryTab) {
  switch (tab) {
    case "featured":
      return "play.storeTabFeatured" as const;
    case "companions":
      return "play.storeTabCompanions" as const;
    case "accessories":
      return "play.storeTabAccessories" as const;
    default:
      return "play.storeTabAll" as const;
  }
}

export function getSecondaryFilterLabelKey(filter: StoreSecondaryFilter) {
  switch (filter) {
    case "owned":
      return "play.filterOwned" as const;
    case "locked":
      return "play.filterLocked" as const;
    case "habitats":
      return "play.filterHabitats" as const;
    case "wearables":
      return "play.filterWearables" as const;
    case "recovery":
      return "play.filterRecovery" as const;
    default:
      return "play.filterAll" as const;
  }
}

export function resolveUnlockHint(
  reward: { unlockHintKey?: string; unlockHint?: string },
  t: (key: string) => string,
): string | undefined {
  if (reward.unlockHintKey) {
    return t(reward.unlockHintKey);
  }
  return reward.unlockHint;
}

export function isRewardPreviewSelected(rewardKey: string, previewRewardKeys: string[]) {
  return previewRewardKeys.includes(rewardKey);
}
