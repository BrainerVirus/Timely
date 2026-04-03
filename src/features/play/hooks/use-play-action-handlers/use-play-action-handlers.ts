import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  activateQuest,
  claimQuestReward,
  equipReward,
  purchaseReward,
  unequipReward,
} from "@/app/desktop/TauriService/tauri";
import {
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
} from "@/features/play/ui/PlayScene/PlayScene";
import { useI18n } from "@/app/providers/I18nService/i18n";

import type { Dispatch, SetStateAction } from "react";
import type { PlaySnapshot } from "@/shared/types/dashboard";
import type {
  PlayPendingState,
  PlayPreviewState,
} from "@/features/play/types/play-provider-state";

const EMPTY_PLAY_PENDING: PlayPendingState = {
  activatingQuestKey: null,
  claimingQuestKey: null,
  purchasingRewardKey: null,
  equippingRewardKey: null,
  unequippingRewardKey: null,
};

type Translate = ReturnType<typeof useI18n>["t"];

interface UsePlayActionHandlersOptions {
  questTitleByKey: Map<string, string>;
  rewardByKey: Map<
    string,
    PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number]
  >;
  rewardTitleByKey: Map<string, string>;
  setPreview: Dispatch<SetStateAction<PlayPreviewState>>;
  setSnapshot: Dispatch<SetStateAction<PlaySnapshot | null>>;
  t: Translate;
}

export function usePlayActionHandlers({
  questTitleByKey,
  rewardByKey,
  rewardTitleByKey,
  setPreview,
  setSnapshot,
  t,
}: UsePlayActionHandlersOptions) {
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
