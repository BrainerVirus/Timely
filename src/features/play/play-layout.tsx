import Award from "lucide-react/dist/esm/icons/award.js";
import Archive from "lucide-react/dist/esm/icons/archive.js";
import Crosshair from "lucide-react/dist/esm/icons/crosshair.js";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FoxAccessorySlot, FoxAccessory, FoxMood, FoxVariant } from "@/components/shared/fox-mascot";
import { useI18n } from "@/lib/i18n";
import { getFoxMoodForCompanionMood } from "@/lib/companion";
import { activateQuest, claimQuestReward, equipReward, loadPlaySnapshot, purchaseReward, unequipReward } from "@/lib/tauri";
import {
  getEnvironmentHabitatScene,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
} from "@/features/play/play-scene";
import type { BootstrapPayload, PlaySnapshot } from "@/types/dashboard";

type PlayPreviewState = {
  companionKey: string | null;
  environmentKey: string | null;
  accessories: Partial<Record<FoxAccessorySlot, string | null>>;
};

type PlayContextValue = {
  snapshot: PlaySnapshot;
  loading: boolean;
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

const PlayContext = createContext<PlayContextValue | null>(null);

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

export function PlayProvider({ payload, children }: { payload: BootstrapPayload; children: ReactNode }) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<PlaySnapshot | null>(null);
  const [preview, setPreview] = useState<PlayPreviewState>({
    companionKey: null,
    environmentKey: null,
    accessories: {},
  });
  const [activatingQuestKey, setActivatingQuestKey] = useState<string | null>(null);
  const [claimingQuestKey, setClaimingQuestKey] = useState<string | null>(null);
  const [purchasingRewardKey, setPurchasingRewardKey] = useState<string | null>(null);
  const [equippingRewardKey, setEquippingRewardKey] = useState<string | null>(null);
  const [unequippingRewardKey, setUnequippingRewardKey] = useState<string | null>(null);

  useEffect(() => {
    void loadPlaySnapshot().then(setSnapshot);
  }, []);

  const current = useMemo<PlaySnapshot>(
    () =>
      snapshot ?? {
        profile: payload.profile,
        streak: payload.streak,
        quests: [],
        tokens: 0,
        equippedCompanionMood: "calm",
        storeCatalog: [],
        inventory: [],
      },
    [payload.profile, payload.streak, snapshot],
  );

  const foxMood = getFoxMoodForCompanionMood(current.equippedCompanionMood);
  const companionRewards = current.storeCatalog.filter(isCompanionReward);
  const environmentRewards = current.storeCatalog.filter(isEnvironmentReward);
  const rewardByKey = useMemo(() => {
    const map = new Map<string, PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number]>();
    current.storeCatalog.forEach((reward) => {
      map.set(reward.rewardKey, reward);
    });
    current.inventory.forEach((reward) => {
      if (!map.has(reward.rewardKey)) {
        map.set(reward.rewardKey, reward);
      }
    });
    return map;
  }, [current.inventory, current.storeCatalog]);
  const equippedAccessories: FoxAccessory[] = current.inventory
    .filter((reward) => reward.equipped && isFoxAccessorySlot(reward.accessorySlot))
    .map((reward) => ({ slot: reward.accessorySlot as FoxAccessory["slot"], variant: reward.rewardKey }));
  const equippedCompanionVariant =
    (current.storeCatalog.find((reward) => reward.rewardType === "companion" && reward.equipped)
      ?.companionVariant as FoxVariant | undefined) ?? "aurora";
  const equippedCompanionReward = companionRewards.find((reward) => reward.equipped);
  const selectedCompanionReward = companionRewards.find((reward) => reward.rewardKey === preview.companionKey);
  const equippedEnvironmentReward = environmentRewards.find((reward) => reward.equipped);
  const selectedEnvironmentReward = environmentRewards.find((reward) => reward.rewardKey === preview.environmentKey);
  const spotlightCompanion =
    selectedCompanionReward ??
    equippedCompanionReward ??
    getDefaultCompanionSpotlight(current.profile.companion ?? "Fox", equippedCompanionVariant);
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
      [
        preview.companionKey,
        preview.environmentKey,
        ...Object.values(preview.accessories),
      ].filter((value): value is string => Boolean(value)),
    [preview.accessories, preview.companionKey, preview.environmentKey],
  );
  const hasActivePreview = previewRewardKeys.length > 0;

  const questTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    current.quests.forEach((quest) => {
      map.set(quest.questKey, quest.title);
    });
    return map;
  }, [current.quests]);

  const rewardTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    current.storeCatalog.forEach((reward) => {
      map.set(reward.rewardKey, reward.rewardName);
    });
    current.inventory.forEach((reward) => {
      if (!map.has(reward.rewardKey)) {
        map.set(reward.rewardKey, reward.rewardName);
      }
    });
    return map;
  }, [current.inventory, current.storeCatalog]);

  useEffect(() => {
    if (preview.companionKey && !companionRewards.some((reward) => reward.rewardKey === preview.companionKey)) {
      setPreview((currentPreview) => ({ ...currentPreview, companionKey: null }));
    }
  }, [companionRewards, preview.companionKey]);

  useEffect(() => {
    if (preview.environmentKey && !environmentRewards.some((reward) => reward.rewardKey === preview.environmentKey)) {
      setPreview((currentPreview) => ({ ...currentPreview, environmentKey: null }));
    }
  }, [environmentRewards, preview.environmentKey]);

  useEffect(() => {
    const accessoryKeys = Object.entries(preview.accessories);
    if (accessoryKeys.length === 0) {
      return;
    }

    const invalidSlots = accessoryKeys.filter(([, rewardKey]) => rewardKey && !rewardByKey.has(rewardKey));
    if (invalidSlots.length === 0) {
      return;
    }

    setPreview((currentPreview) => ({
      ...currentPreview,
      accessories: Object.fromEntries(
        Object.entries(currentPreview.accessories).filter(([slot]) => !invalidSlots.some(([invalidSlot]) => invalidSlot === slot)),
      ),
    }));
  }, [preview.accessories, rewardByKey]);

  const togglePreviewRewardKey = useCallback((rewardKey: string) => {
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
          [accessorySlot]: currentPreview.accessories[accessorySlot] === rewardKey ? null : rewardKey,
        },
      }));
    }
  }, [rewardByKey]);

  const clearAllPreview = useCallback(() => {
    setPreview({ companionKey: null, environmentKey: null, accessories: {} });
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
        Object.entries(currentPreview.accessories).filter(([, rewardKey]) => rewardKey && visible.has(rewardKey)),
      );

      const accessoryEntries = Object.entries(currentPreview.accessories);
      const nextAccessoryEntries = Object.entries(nextAccessories);
      const accessoriesUnchanged =
        accessoryEntries.length === nextAccessoryEntries.length &&
        accessoryEntries.every(([slot, rewardKey]) => nextAccessories[slot as keyof typeof nextAccessories] === rewardKey);

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

  const activateQuestKey = useCallback(async (questKey: string) => {
    try {
      setActivatingQuestKey(questKey);
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
      setActivatingQuestKey(null);
    }
  }, [questTitleByKey, t]);

  const claimQuestKey = useCallback(async (questKey: string) => {
    try {
      setClaimingQuestKey(questKey);
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
      setClaimingQuestKey(null);
    }
  }, [questTitleByKey, t]);

  const buyRewardKey = useCallback(async (rewardKey: string) => {
    try {
      setPurchasingRewardKey(rewardKey);
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
      setPurchasingRewardKey(null);
    }
  }, [rewardTitleByKey, t]);

  const equipRewardKey = useCallback(async (rewardKey: string) => {
    try {
      setEquippingRewardKey(rewardKey);
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
      setEquippingRewardKey(null);
    }
  }, [rewardByKey, rewardTitleByKey, t]);

  const unequipRewardKey = useCallback(async (rewardKey: string) => {
    try {
      setUnequippingRewardKey(rewardKey);
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
      setUnequippingRewardKey(null);
    }
  }, [rewardTitleByKey, t]);

  const contextValue = useMemo<PlayContextValue>(
    () => ({
      snapshot: current,
      loading: snapshot === null,
      preview,
      hasActivePreview,
      previewRewardKeys,
      setPreviewCompanion: (rewardKey) => setPreview((state) => ({ ...state, companionKey: rewardKey })),
      setPreviewEnvironment: (rewardKey) => setPreview((state) => ({ ...state, environmentKey: rewardKey })),
      togglePreviewRewardKey,
      clearAllPreview,
      clearPreviewKeysNotIn,
      activateQuestKey,
      claimQuestKey,
      buyRewardKey,
      equipRewardKey,
      unequipRewardKey,
      activatingQuestKey,
      claimingQuestKey,
      purchasingRewardKey,
      equippingRewardKey,
      unequippingRewardKey,
      equippedAccessories,
      previewAccessories,
      foxMood,
      equippedCompanionVariant,
      spotlightCompanion,
      activeEnvironmentReward,
      activeHabitatScene,
    }),
    [
      current,
      snapshot,
      preview,
      hasActivePreview,
      previewRewardKeys,
      togglePreviewRewardKey,
      clearAllPreview,
      clearPreviewKeysNotIn,
      activateQuestKey,
      claimQuestKey,
      buyRewardKey,
      equipRewardKey,
      unequipRewardKey,
      activatingQuestKey,
      claimingQuestKey,
      purchasingRewardKey,
      equippingRewardKey,
      unequippingRewardKey,
      equippedAccessories,
      previewAccessories,
      foxMood,
      equippedCompanionVariant,
      spotlightCompanion,
      activeEnvironmentReward,
      activeHabitatScene,
    ],
  );

  return (
    <PlayContext.Provider value={contextValue}>
      {children}
    </PlayContext.Provider>
  );
}

export function PlayLayout({ payload }: { payload: BootstrapPayload }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location.pathname });

  const tabs = [
    { to: "/play", label: t("common.play"), icon: Award },
    { to: "/play/shop", label: t("play.shopNav"), icon: ShoppingBag },
    { to: "/play/collection", label: t("play.collectionNav"), icon: Archive },
    { to: "/play/missions", label: t("play.missionsNav"), icon: Crosshair },
    { to: "/play/achievements", label: t("play.achievementsNav"), icon: Award },
  ] as const;

  return (
    <PlayProvider payload={payload}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/play" ? location === "/play" : location.startsWith(to);
            return (
              <Button
                key={to}
                type="button"
                variant={active ? "primary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => navigate({ to })}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            );
          })}
        </div>
        <Outlet />
      </div>
    </PlayProvider>
  );
}

export function usePlayContext() {
  const context = useContext(PlayContext);
  if (!context) {
    throw new Error("usePlayContext must be used within PlayLayout");
  }

  return context;
}
