import type { PlayPreviewState } from "@/features/play/types/play-provider-state";
import type { FoxVariant } from "@/shared/ui/FoxMascot/FoxMascot";

export const EMPTY_PLAY_PREVIEW: PlayPreviewState = {
  companionKey: null,
  environmentKey: null,
  accessories: {},
};

export function getVisiblePreviewKey(rewardKey: string | null, visible: Set<string>) {
  return rewardKey && visible.has(rewardKey) ? rewardKey : null;
}

export function getDefaultCompanionSpotlight(name: string, companionVariant: FoxVariant) {
  return {
    rewardKey: `default-${companionVariant}`,
    rewardName: name,
    companionVariant,
    rarity: "common" as const,
    owned: true,
    equipped: true,
  };
}
