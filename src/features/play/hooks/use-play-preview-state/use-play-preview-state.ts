import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEnvironmentHabitatScene,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
} from "@/features/play/ui/PlayScene/PlayScene";

import type { FoxAccessory, FoxVariant } from "@/shared/ui/FoxMascot/FoxMascot";
import type { PlaySnapshot } from "@/shared/types/dashboard";
import type { PlayPreviewState } from "@/features/play/types/play-provider-state";

const EMPTY_PLAY_PREVIEW: PlayPreviewState = {
  companionKey: null,
  environmentKey: null,
  accessories: {},
};

function getVisiblePreviewKey(rewardKey: string | null, visible: Set<string>) {
  return rewardKey && visible.has(rewardKey) ? rewardKey : null;
}

function getDefaultCompanionSpotlight(name: string, companionVariant: FoxVariant) {
  return {
    rewardKey: `default-${companionVariant}`,
    rewardName: name,
    companionVariant,
    rarity: "common" as const,
    owned: true,
    equipped: true,
  };
}

export function usePlayPreviewState(current: PlaySnapshot | null) {
  const [preview, setPreview] = useState<PlayPreviewState>(EMPTY_PLAY_PREVIEW);
  const companionRewards = useMemo(() => current?.storeCatalog.filter(isCompanionReward) ?? [], [
    current?.storeCatalog,
  ]);
  const environmentRewards = useMemo(() => current?.storeCatalog.filter(isEnvironmentReward) ?? [], [
    current?.storeCatalog,
  ]);
  const rewardByKey = useMemo(() => {
    const map = new Map<
      string,
      PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number]
    >();

    current?.storeCatalog.forEach((reward) => {
      map.set(reward.rewardKey, reward);
    });
    current?.inventory.forEach((reward) => {
      if (!map.has(reward.rewardKey)) {
        map.set(reward.rewardKey, reward);
      }
    });

    return map;
  }, [current?.inventory, current?.storeCatalog]);

  const equippedAccessories: FoxAccessory[] = (current?.inventory ?? [])
    .filter((reward) => reward.equipped && isFoxAccessorySlot(reward.accessorySlot))
    .map((reward) => ({
      slot: reward.accessorySlot as FoxAccessory["slot"],
      variant: reward.rewardKey,
    }));
  const equippedCompanionVariant =
    (current?.storeCatalog.find((reward) => reward.rewardType === "companion" && reward.equipped)
      ?.companionVariant as FoxVariant | undefined) ?? "aurora";
  const equippedCompanionReward = companionRewards.find((reward) => reward.equipped);
  const selectedCompanionReward = companionRewards.find(
    (reward) => reward.rewardKey === preview.companionKey,
  );
  const equippedEnvironmentReward = environmentRewards.find((reward) => reward.equipped);
  const selectedEnvironmentReward = environmentRewards.find(
    (reward) => reward.rewardKey === preview.environmentKey,
  );
  const spotlightCompanion =
    selectedCompanionReward ??
    equippedCompanionReward ??
    getDefaultCompanionSpotlight(current?.profile.companion ?? "Fox", equippedCompanionVariant);
  const activeEnvironmentReward = selectedEnvironmentReward ?? equippedEnvironmentReward;
  const previewAccessories = useMemo(() => {
    const accessoryMap = new Map<FoxAccessory["slot"], FoxAccessory>();

    equippedAccessories.forEach((accessory) => {
      accessoryMap.set(accessory.slot, accessory);
    });

    Object.entries(preview.accessories).forEach(([slot, rewardKey]) => {
      if (!rewardKey) return;
      const reward = rewardByKey.get(rewardKey);
      if (!reward || !isFoxAccessorySlot(reward.accessorySlot)) return;
      accessoryMap.set(slot as FoxAccessory["slot"], {
        slot: slot as FoxAccessory["slot"],
        variant: reward.rewardKey,
      });
    });

    return Array.from(accessoryMap.values());
  }, [equippedAccessories, preview.accessories, rewardByKey]);
  const activeHabitatScene = activeEnvironmentReward
    ? getEnvironmentHabitatScene(activeEnvironmentReward)
    : spotlightCompanion.companionVariant;
  const previewRewardKeys = useMemo(
    () =>
      [preview.companionKey, preview.environmentKey, ...Object.values(preview.accessories)].filter(
        (value): value is string => Boolean(value),
      ),
    [preview.accessories, preview.companionKey, preview.environmentKey],
  );
  const hasActivePreview = previewRewardKeys.length > 0;

  useEffect(() => {
    if (
      preview.companionKey &&
      !companionRewards.some((reward) => reward.rewardKey === preview.companionKey)
    ) {
      setPreview((currentPreview) => ({ ...currentPreview, companionKey: null }));
    }
  }, [companionRewards, preview.companionKey]);

  useEffect(() => {
    if (
      preview.environmentKey &&
      !environmentRewards.some((reward) => reward.rewardKey === preview.environmentKey)
    ) {
      setPreview((currentPreview) => ({ ...currentPreview, environmentKey: null }));
    }
  }, [environmentRewards, preview.environmentKey]);

  useEffect(() => {
    const accessoryKeys = Object.entries(preview.accessories);
    if (accessoryKeys.length === 0) {
      return;
    }

    const invalidSlots = accessoryKeys.filter(
      ([, rewardKey]) => rewardKey && !rewardByKey.has(rewardKey),
    );
    if (invalidSlots.length === 0) {
      return;
    }

    const isValidSlot = ([slot]: [string, string | null | undefined]) =>
      !invalidSlots.some(([invalidSlot]) => invalidSlot === slot);

    setPreview((currentPreview) => ({
      ...currentPreview,
      accessories: Object.fromEntries(
        Object.entries(currentPreview.accessories).filter(isValidSlot),
      ),
    }));
  }, [preview.accessories, rewardByKey]);

  const togglePreviewRewardKey = useCallback(
    (rewardKey: string) => {
      const reward = rewardByKey.get(rewardKey);
      if (!reward) {
        return;
      }

      if (isCompanionReward(reward as PlaySnapshot["storeCatalog"][number])) {
        setPreview((currentPreview) => ({
          ...currentPreview,
          companionKey: currentPreview.companionKey === rewardKey ? null : rewardKey,
        }));
        return;
      }

      if (isEnvironmentReward(reward)) {
        setPreview((currentPreview) => ({
          ...currentPreview,
          environmentKey: currentPreview.environmentKey === rewardKey ? null : rewardKey,
        }));
        return;
      }

      if (isFoxAccessorySlot(reward.accessorySlot)) {
        const accessorySlot = reward.accessorySlot;
        setPreview((currentPreview) => ({
          ...currentPreview,
          accessories: {
            ...currentPreview.accessories,
            [accessorySlot]:
              currentPreview.accessories[accessorySlot] === rewardKey ? null : rewardKey,
          },
        }));
      }
    },
    [rewardByKey],
  );

  const clearAllPreview = useCallback(() => {
    setPreview(EMPTY_PLAY_PREVIEW);
  }, []);

  const clearPreviewKeysNotIn = useCallback((rewardKeys: string[]) => {
    const visible = new Set(rewardKeys);
    setPreview((currentPreview) => {
      const nextCompanionKey = getVisiblePreviewKey(currentPreview.companionKey, visible);
      const nextEnvironmentKey = getVisiblePreviewKey(currentPreview.environmentKey, visible);
      const nextAccessories = Object.fromEntries(
        Object.entries(currentPreview.accessories).filter(
          ([, rewardKey]) => rewardKey && visible.has(rewardKey),
        ),
      );

      const accessoryEntries = Object.entries(currentPreview.accessories);
      const nextAccessoryEntries = Object.entries(nextAccessories);
      const accessoriesUnchanged =
        accessoryEntries.length === nextAccessoryEntries.length &&
        accessoryEntries.every(
          ([slot, rewardKey]) =>
            nextAccessories[slot as keyof typeof nextAccessories] === rewardKey,
        );

      if (
        currentPreview.companionKey === nextCompanionKey &&
        currentPreview.environmentKey === nextEnvironmentKey &&
        accessoriesUnchanged
      ) {
        return currentPreview;
      }

      return {
        companionKey: nextCompanionKey,
        environmentKey: nextEnvironmentKey,
        accessories: nextAccessories,
      };
    });
  }, []);

  return {
    activeEnvironmentReward,
    activeHabitatScene,
    clearAllPreview,
    clearPreviewKeysNotIn,
    equippedAccessories,
    equippedCompanionVariant,
    hasActivePreview,
    preview,
    previewAccessories,
    previewRewardKeys,
    rewardByKey,
    setPreview,
    spotlightCompanion,
    togglePreviewRewardKey,
  };
}
