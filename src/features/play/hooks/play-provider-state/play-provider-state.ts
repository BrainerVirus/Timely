import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getFoxMoodForCompanionMood } from "@/core/services/Companion/companion";
import { useI18n } from "@/core/services/I18nService/i18n";
import {
  activateQuest,
  claimQuestReward,
  equipReward,
  purchaseReward,
  unequipReward,
} from "@/core/services/TauriService/tauri";
import {
  getEnvironmentHabitatScene,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
} from "@/features/play/components/PlayScene/PlayScene";
import {
  getCachedPlaySnapshot,
  getCachedPlaySnapshotError,
  prefetchPlaySnapshot,
  primePlaySnapshot,
} from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";

import type {
  FoxAccessory,
  FoxAccessorySlot,
  FoxMood,
  FoxVariant,
} from "@/shared/components/FoxMascot/FoxMascot";
import type { BootstrapPayload, PlaySnapshot } from "@/shared/types/dashboard";

type Translate = ReturnType<typeof useI18n>["t"];

export type PlayPreviewState = {
  companionKey: string | null;
  environmentKey: string | null;
  accessories: Partial<Record<FoxAccessorySlot, string | null>>;
};

export type PlayContextValue = {
  snapshot: PlaySnapshot | null;
  loading: boolean;
  error: string | null;
  preview: PlayPreviewState;
  hasActivePreview: boolean;
  previewRewardKeys: string[];
  setPreviewCompanion: (rewardKey: string | null) => void;
  setPreviewEnvironment: (rewardKey: string | null) => void;
  togglePreviewRewardKey: (rewardKey: string) => void;
  clearAllPreview: () => void;
  clearPreviewKeysNotIn: (rewardKeys: string[]) => void;
  activateQuestKey: (questKey: string) => Promise<void>;
  claimQuestKey: (questKey: string) => Promise<void>;
  buyRewardKey: (rewardKey: string) => Promise<void>;
  equipRewardKey: (rewardKey: string) => Promise<void>;
  unequipRewardKey: (rewardKey: string) => Promise<void>;
  activatingQuestKey: string | null;
  claimingQuestKey: string | null;
  purchasingRewardKey: string | null;
  equippingRewardKey: string | null;
  unequippingRewardKey: string | null;
  equippedAccessories: FoxAccessory[];
  previewAccessories: FoxAccessory[];
  foxMood: FoxMood;
  equippedCompanionVariant: FoxVariant;
  spotlightCompanion: {
    rewardKey: string;
    rewardName: string;
    companionVariant: FoxVariant;
    rarity: "common" | "rare" | "epic";
    owned: boolean;
    equipped: boolean;
  };
  activeEnvironmentReward: PlaySnapshot["storeCatalog"][number] | undefined;
  activeHabitatScene: ReturnType<typeof getEnvironmentHabitatScene> | FoxVariant;
};

type PlayPendingState = {
  activatingQuestKey: string | null;
  claimingQuestKey: string | null;
  purchasingRewardKey: string | null;
  equippingRewardKey: string | null;
  unequippingRewardKey: string | null;
};

const EMPTY_PLAY_PREVIEW: PlayPreviewState = {
  companionKey: null,
  environmentKey: null,
  accessories: {},
};

const EMPTY_PLAY_PENDING: PlayPendingState = {
  activatingQuestKey: null,
  claimingQuestKey: null,
  purchasingRewardKey: null,
  equippingRewardKey: null,
  unequippingRewardKey: null,
};

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

function usePlaySnapshot() {
  const [snapshot, setSnapshot] = useState<PlaySnapshot | null>(() => getCachedPlaySnapshot());
  const [error, setError] = useState<string | null>(() => getCachedPlaySnapshotError());

  useEffect(() => {
    if (snapshot !== null) {
      return;
    }

    let cancelled = false;

    void prefetchPlaySnapshot()
      .then((value) => {
        if (cancelled) {
          return;
        }

        if (value == null) {
          setError(getCachedPlaySnapshotError());
          return;
        }
        setSnapshot(value);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(null);
          setError(getCachedPlaySnapshotError());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const updateSnapshot = useCallback((next: React.SetStateAction<PlaySnapshot | null>) => {
    setSnapshot((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved) {
        primePlaySnapshot(resolved);
      }
      return resolved;
    });
    setError(null);
  }, []);

  return { snapshot, error, setSnapshot: updateSnapshot };
}

function usePlayPreviewState(current: PlaySnapshot | null) {
  const [preview, setPreview] = useState<PlayPreviewState>(EMPTY_PLAY_PREVIEW);

  const companionRewards = useMemo(
    () => current?.storeCatalog.filter(isCompanionReward) ?? [],
    [current?.storeCatalog],
  );
  const environmentRewards = useMemo(
    () => current?.storeCatalog.filter(isEnvironmentReward) ?? [],
    [current?.storeCatalog],
  );
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

    const isValidSlot = ([slot]: [string, string | null]) =>
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
      const nextCompanionKey =
        currentPreview.companionKey && visible.has(currentPreview.companionKey)
          ? currentPreview.companionKey
          : null;
      const nextEnvironmentKey =
        currentPreview.environmentKey && visible.has(currentPreview.environmentKey)
          ? currentPreview.environmentKey
          : null;
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
    companionRewards,
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

function usePlayActionHandlers({
  questTitleByKey,
  rewardByKey,
  rewardTitleByKey,
  setPreview,
  setSnapshot,
  t,
}: {
  questTitleByKey: Map<string, string>;
  rewardByKey: Map<
    string,
    PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number]
  >;
  rewardTitleByKey: Map<string, string>;
  setPreview: React.Dispatch<React.SetStateAction<PlayPreviewState>>;
  setSnapshot: React.Dispatch<React.SetStateAction<PlaySnapshot | null>>;
  t: Translate;
}) {
  const [pending, setPending] = useState<PlayPendingState>(EMPTY_PLAY_PENDING);

  const activateQuestKey = useCallback(
    async (questKey: string) => {
      try {
        setPending((current) => ({ ...current, activatingQuestKey: questKey }));
        const nextSnapshot = await activateQuest({ questKey });
        setSnapshot(nextSnapshot);
        toast.success(t("gamification.toastQuestActivatedTitle"), {
          description: t("gamification.toastQuestActivatedDescription", {
            title: questTitleByKey.get(questKey) ?? questKey,
          }),
        });
      } catch (error) {
        toast.error(t("gamification.toastQuestActivationFailedTitle"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPending((current) => ({ ...current, activatingQuestKey: null }));
      }
    },
    [questTitleByKey, setSnapshot, t],
  );

  const claimQuestKey = useCallback(
    async (questKey: string) => {
      try {
        setPending((current) => ({ ...current, claimingQuestKey: questKey }));
        const nextSnapshot = await claimQuestReward({ questKey });
        setSnapshot(nextSnapshot);
        toast.success(t("gamification.toastRewardClaimedTitle"), {
          description: t("gamification.toastRewardClaimedDescription", {
            title: questTitleByKey.get(questKey) ?? questKey,
          }),
        });
      } catch (error) {
        toast.error(t("gamification.toastQuestClaimFailedTitle"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPending((current) => ({ ...current, claimingQuestKey: null }));
      }
    },
    [questTitleByKey, setSnapshot, t],
  );

  const buyRewardKey = useCallback(
    async (rewardKey: string) => {
      try {
        setPending((current) => ({ ...current, purchasingRewardKey: rewardKey }));
        const nextSnapshot = await purchaseReward({ rewardKey });
        setSnapshot(nextSnapshot);
        toast.success(t("play.toastPurchaseTitle"), {
          description: t("play.toastPurchaseDescription", {
            title: rewardTitleByKey.get(rewardKey) ?? rewardKey,
          }),
        });
      } catch (error) {
        toast.error(t("play.toastPurchaseFailedTitle"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPending((current) => ({ ...current, purchasingRewardKey: null }));
      }
    },
    [rewardTitleByKey, setSnapshot, t],
  );

  const equipRewardKey = useCallback(
    async (rewardKey: string) => {
      try {
        setPending((current) => ({ ...current, equippingRewardKey: rewardKey }));
        const nextSnapshot = await equipReward({ rewardKey });
        setSnapshot(nextSnapshot);
        const reward = rewardByKey.get(rewardKey);

        if (reward) {
          if (isCompanionReward(reward as PlaySnapshot["storeCatalog"][number])) {
            setPreview((state) => ({ ...state, companionKey: null }));
          } else if (isEnvironmentReward(reward)) {
            setPreview((state) => ({ ...state, environmentKey: null }));
          } else if (isFoxAccessorySlot(reward.accessorySlot)) {
            setPreview((state) => ({
              ...state,
              accessories: {
                ...state.accessories,
                [reward.accessorySlot]: null,
              },
            }));
          }
        }

        toast.success(t("play.toastEquipTitle"), {
          description: t("play.toastEquipDescription", {
            title: rewardTitleByKey.get(rewardKey) ?? rewardKey,
          }),
        });
      } catch (error) {
        toast.error(t("play.toastEquipFailedTitle"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPending((current) => ({ ...current, equippingRewardKey: null }));
      }
    },
    [rewardByKey, rewardTitleByKey, setPreview, setSnapshot, t],
  );

  const unequipRewardKey = useCallback(
    async (rewardKey: string) => {
      try {
        setPending((current) => ({ ...current, unequippingRewardKey: rewardKey }));
        const nextSnapshot = await unequipReward({ rewardKey });
        setSnapshot(nextSnapshot);
        toast.success(t("play.toastUnequipTitle"), {
          description: t("play.toastUnequipDescription", {
            title: rewardTitleByKey.get(rewardKey) ?? rewardKey,
          }),
        });
      } catch (error) {
        toast.error(t("play.toastUnequipFailedTitle"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPending((current) => ({ ...current, unequippingRewardKey: null }));
      }
    },
    [rewardTitleByKey, setSnapshot, t],
  );

  return {
    activateQuestKey,
    buyRewardKey,
    claimQuestKey,
    equipRewardKey,
    unequipRewardKey,
    ...pending,
  };
}

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
        previewState.setPreview((state) => ({ ...state, companionKey: rewardKey })),
      setPreviewEnvironment: (rewardKey) =>
        previewState.setPreview((state) => ({ ...state, environmentKey: rewardKey })),
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
