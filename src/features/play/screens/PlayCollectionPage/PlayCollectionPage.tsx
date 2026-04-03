import { useI18n } from "@/app/providers/I18nService/i18n";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";
import { isCompanionReward } from "@/features/play/ui/PlayScene/PlayScene";
import {
  useTranslatedCatalog,
  useTranslatedInventory,
} from "@/features/play/lib/play-route-data/play-route-data";
import { PlayPreviewPanel } from "@/features/play/ui/PlayPreviewPanel/PlayPreviewPanel";
import { PlayStatusState } from "@/features/play/ui/PlayStatusState/PlayStatusState";
import { RewardCard } from "@/features/play/ui/RewardCard/RewardCard";
import {
  CollectionSection,
  PlaySectionPage,
} from "@/features/play/ui/PlayRouteScaffold/PlayRouteScaffold";

export function PlayCollectionPage() {
  const { t } = useI18n();
  const {
    error,
    loading,
    snapshot,
    foxMood,
    spotlightCompanion,
    previewAccessories,
    equippingRewardKey,
    unequippingRewardKey,
    equipRewardKey,
    unequipRewardKey,
    previewRewardKeys,
    hasActivePreview,
    togglePreviewRewardKey,
    clearAllPreview,
  } = usePlayContext();
  const translatedCatalog = useTranslatedCatalog();
  const translatedInventory = useTranslatedInventory();

  if (loading) {
    return <PlayStatusState title={t("app.loadingPlayCenter")} description={t("common.loading")} />;
  }

  if (!snapshot) {
    return (
      <PlayStatusState
        title={t("play.failedToLoadTitle")}
        description={error ?? t("play.failedToLoadDescription")}
        mood="tired"
      />
    );
  }

  const owned = translatedInventory.filter((reward) => reward.owned);
  const companions = translatedCatalog.filter(
    (reward) => reward.owned && isCompanionReward(reward),
  );
  const environments = owned.filter((reward) => reward.accessorySlot === "environment");
  const accessories = owned.filter((reward) => reward.accessorySlot !== "environment");

  return (
    <PlaySectionPage
      title={t("play.inventoryTitle")}
      description={t("play.collectionRouteDescription")}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <CollectionSection
            title={t("play.collectionCompanionsTitle")}
            description={t("play.collectionCompanionsDescription")}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {companions.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={previewRewardKeys.includes(reward.rewardKey)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={
                    equippingRewardKey === reward.rewardKey ||
                    unequippingRewardKey === reward.rewardKey
                  }
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          </CollectionSection>

          <CollectionSection
            title={t("play.inventoryHabitatsTitle")}
            description={t("play.collectionHabitatsDescription")}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {environments.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={previewRewardKeys.includes(reward.rewardKey)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={
                    equippingRewardKey === reward.rewardKey ||
                    unequippingRewardKey === reward.rewardKey
                  }
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          </CollectionSection>

          <CollectionSection
            title={t("play.inventoryAccessoriesTitle")}
            description={t("play.collectionAccessoriesDescription")}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {accessories.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={previewRewardKeys.includes(reward.rewardKey)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={
                    equippingRewardKey === reward.rewardKey ||
                    unequippingRewardKey === reward.rewardKey
                  }
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          </CollectionSection>
        </div>

        {hasActivePreview ? <PlayPreviewPanel onClearAllPreview={clearAllPreview} /> : null}
      </div>
    </PlaySectionPage>
  );
}
