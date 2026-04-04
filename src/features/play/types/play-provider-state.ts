import { getEnvironmentHabitatScene } from "@/features/play/ui/PlayScene/PlayScene";

import type { PlaySnapshot } from "@/shared/types/dashboard";
import type {
  FoxAccessory,
  FoxAccessorySlot,
  FoxMood,
  FoxVariant,
} from "@/shared/ui/FoxMascot/FoxMascot";

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

export type PlayPendingState = {
  activatingQuestKey: string | null;
  claimingQuestKey: string | null;
  purchasingRewardKey: string | null;
  equippingRewardKey: string | null;
  unequippingRewardKey: string | null;
};
