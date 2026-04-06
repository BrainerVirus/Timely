import { useMemo } from "react";
import { getFoxMoodForCompanionMood } from "@/features/home/lib/Companion/companion";
import { usePlayActionHandlers } from "@/features/play/hooks/use-play-action-handlers/use-play-action-handlers";
import { usePlayPreviewState } from "@/features/play/hooks/use-play-preview-state/use-play-preview-state";
import { usePlaySnapshot } from "@/features/play/hooks/use-play-snapshot/use-play-snapshot";

import type { useI18n } from "@/app/providers/I18nService/i18n";
import type { PlayContextValue, PlayPreviewState } from "@/features/play/types/play-provider-state";
import type { BootstrapPayload } from "@/shared/types/dashboard";

type Translate = ReturnType<typeof useI18n>["t"];

export type { PlayContextValue, PlayPreviewState };

export function usePlayProviderValue(_payload: BootstrapPayload, t: Translate): PlayContextValue {
  const { snapshot, error, setSnapshot } = usePlaySnapshot();
  const previewState = usePlayPreviewState(snapshot);
  const foxMood = snapshot ? getFoxMoodForCompanionMood(snapshot.equippedCompanionMood) : "idle";
  const questTitleByKey = useMemo(() => {
    const map = new Map<string, string>();

    snapshot?.quests.forEach((quest) => {
      map.set(quest.questKey, quest.title);
    });

    return map;
  }, [snapshot?.quests]);
  const rewardTitleByKey = useMemo(() => {
    const map = new Map<string, string>();

    snapshot?.storeCatalog.forEach((reward) => {
      map.set(reward.rewardKey, reward.rewardName);
    });
    snapshot?.inventory.forEach((reward) => {
      if (!map.has(reward.rewardKey)) {
        map.set(reward.rewardKey, reward.rewardName);
      }
    });

    return map;
  }, [snapshot?.inventory, snapshot?.storeCatalog]);
  const actions = usePlayActionHandlers({
    questTitleByKey,
    rewardByKey: previewState.rewardByKey,
    rewardTitleByKey,
    setPreview: previewState.setPreview,
    setSnapshot,
    t,
  });

  return useMemo(
    () => ({
      snapshot,
      loading: snapshot === null && error === null,
      error,
      preview: previewState.preview,
      hasActivePreview: previewState.hasActivePreview,
      previewRewardKeys: previewState.previewRewardKeys,
      setPreviewCompanion: (rewardKey) =>
        previewState.setPreview((state: PlayPreviewState) => ({
          ...state,
          companionKey: rewardKey,
        })),
      setPreviewEnvironment: (rewardKey) =>
        previewState.setPreview((state: PlayPreviewState) => ({
          ...state,
          environmentKey: rewardKey,
        })),
      togglePreviewRewardKey: previewState.togglePreviewRewardKey,
      clearAllPreview: previewState.clearAllPreview,
      clearPreviewKeysNotIn: previewState.clearPreviewKeysNotIn,
      activateQuestKey: actions.activateQuestKey,
      claimQuestKey: actions.claimQuestKey,
      buyRewardKey: actions.buyRewardKey,
      equipRewardKey: actions.equipRewardKey,
      unequipRewardKey: actions.unequipRewardKey,
      activatingQuestKey: actions.activatingQuestKey,
      claimingQuestKey: actions.claimingQuestKey,
      purchasingRewardKey: actions.purchasingRewardKey,
      equippingRewardKey: actions.equippingRewardKey,
      unequippingRewardKey: actions.unequippingRewardKey,
      equippedAccessories: previewState.equippedAccessories,
      previewAccessories: previewState.previewAccessories,
      foxMood,
      equippedCompanionVariant: previewState.equippedCompanionVariant,
      spotlightCompanion: previewState.spotlightCompanion,
      activeEnvironmentReward: previewState.activeEnvironmentReward,
      activeHabitatScene: previewState.activeHabitatScene,
    }),
    [actions, error, foxMood, previewState, snapshot],
  );
}
