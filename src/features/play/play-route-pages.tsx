import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoxMascot, type FoxAccessory, type FoxMood, type FoxVariant } from "@/components/shared/fox-mascot";
import { StaggerGroup } from "@/components/shared/page-transition";
import { useI18n } from "@/lib/i18n";
import { staggerItem, staggerItemScale } from "@/lib/animations";
import { getNeutralSegmentedControlClassName } from "@/lib/control-styles";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { usePlayContext } from "@/features/play/play-layout";
import {
  HabitatPreviewSurface,
  RewardArtPreview,
  type HabitatSceneKey,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
  isCompanionReward,
} from "@/features/play/play-scene";
import type { PlaySnapshot } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

type PlayMessageKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];
type StorePrimaryTab = "all" | "featured" | "companions" | "accessories";
type StoreSecondaryFilter = "all" | "owned" | "locked" | "habitats" | "wearables" | "recovery";

const STORE_PAGE_SIZE = 6;

const primaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-primary) 14%, var(--color-panel-elevated))",
};

const secondaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-secondary) 16%, var(--color-panel-elevated))",
};

function getMoodLabelKey(mood: PlaySnapshot["equippedCompanionMood"]) {
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

function getMoodSupportKey(mood: PlaySnapshot["equippedCompanionMood"]) {
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

function getCompanionTitleKey(variant: FoxVariant) {
  return `play.companionVariant.${variant}.title` as const;
}

function getCompanionPersonalityKey(variant: FoxVariant) {
  return `play.companionVariant.${variant}.personality` as const;
}

function getCompanionBestForKey(variant: FoxVariant) {
  return `play.companionVariant.${variant}.bestFor` as const;
}

function getRewardDisplayNameKey(rewardKey: string) {
  return `play.reward.${rewardKey}.name` as PlayMessageKey;
}

function getRewardDisplayDescriptionKey(rewardKey: string) {
  return `play.reward.${rewardKey}.description` as PlayMessageKey;
}

function getQuestTitleKey(questKey: string) {
  return `play.quest.${questKey}.title` as PlayMessageKey;
}

function getQuestDescriptionKey(questKey: string) {
  return `play.quest.${questKey}.description` as PlayMessageKey;
}

function getQuestRewardLabelKey(questKey: string) {
  return `play.quest.${questKey}.rewardLabel` as PlayMessageKey;
}

function translateRewardName(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "rewardKey" | "rewardName">,
  t: ReturnType<typeof useI18n>["t"],
) {
  const key = getRewardDisplayNameKey(reward.rewardKey);
  const translated = t(key);
  return translated === key ? reward.rewardName : translated;
}

function translateRewardDescription(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "rewardKey">,
  t: ReturnType<typeof useI18n>["t"],
) {
  const key = getRewardDisplayDescriptionKey(reward.rewardKey);
  const translated = t(key);
  return translated === key ? undefined : translated;
}

function withTranslatedReward<T extends Pick<PlaySnapshot["storeCatalog"][number], "rewardKey" | "rewardName">>(
  reward: T,
  t: ReturnType<typeof useI18n>["t"],
) {
  return {
    ...reward,
    rewardName: translateRewardName(reward, t),
  };
}

function withTranslatedQuest<T extends PlaySnapshot["quests"][number]>(quest: T, t: ReturnType<typeof useI18n>["t"]) {
  const titleKey = getQuestTitleKey(quest.questKey);
  const descriptionKey = getQuestDescriptionKey(quest.questKey);
  const rewardLabelKey = getQuestRewardLabelKey(quest.questKey);
  const translatedTitle = t(titleKey);
  const translatedDescription = t(descriptionKey);
  const translatedRewardLabel = t(rewardLabelKey);

  return {
    ...quest,
    title: translatedTitle === titleKey ? quest.title : translatedTitle,
    description: translatedDescription === descriptionKey ? quest.description : translatedDescription,
    rewardLabel:
      translatedRewardLabel === rewardLabelKey ? quest.rewardLabel : translatedRewardLabel,
  };
}

function getPrimaryTabLabelKey(tab: StorePrimaryTab) {
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

function getSecondaryFilterLabelKey(filter: StoreSecondaryFilter) {
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

function resolveUnlockHint(reward: RewardCardProps["reward"], t: ReturnType<typeof useI18n>["t"]) {
  if ("unlockHintKey" in reward && reward.unlockHintKey) {
    return t(reward.unlockHintKey as PlayMessageKey);
  }

  return "unlockHint" in reward ? reward.unlockHint : undefined;
}

function isRewardPreviewSelected(rewardKey: string, previewRewardKeys: string[]) {
  return previewRewardKeys.includes(rewardKey);
}

export function PlayOverviewPage({
  onOpenShop,
  onOpenCollection,
  onOpenMissions,
  onOpenAchievements,
}: {
  onOpenShop?: () => void;
  onOpenCollection?: () => void;
  onOpenMissions?: () => void;
  onOpenAchievements?: () => void;
}) {
  const { t } = useI18n();
  const { snapshot, foxMood, spotlightCompanion, activeEnvironmentReward, activeHabitatScene, previewAccessories } = usePlayContext();

  const xpForNextLevel = (snapshot.profile.level + 1) * 100;
  const equippedItems = snapshot.inventory.filter((reward) => reward.equipped && reward.accessorySlot !== "environment");
  const ownedInventory = snapshot.inventory.filter((reward) => reward.owned);
  const moodLabel = t(getMoodLabelKey(snapshot.equippedCompanionMood));
  const moodSupport = t(getMoodSupportKey(snapshot.equippedCompanionMood));
  const dailyMissionCount = snapshot.quests.filter((quest) => quest.cadence === "daily").length;
  const weeklyMissionCount = snapshot.quests.filter((quest) => quest.cadence === "weekly").length;
  const achievementCount = snapshot.quests.filter((quest) => quest.cadence === "achievement").length;

  return (
    <m.div className="space-y-6">
      <m.section
        variants={staggerItem}
        className="rounded-[1.75rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-5 py-5 shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <MoodBadge label={`Lv ${snapshot.profile.level}`} tone="primary" />
              <MoodBadge label={`${snapshot.tokens} ${t("play.tokens")}`} tone="secondary" />
              <MoodBadge label={`${snapshot.streak.currentDays}${t("common.daysShort")} ${t("play.streak")}`} tone="secondary" />
            </div>

            <div className="space-y-2">
              <p className="font-display text-2xl font-semibold text-foreground">{translateRewardName(spotlightCompanion, t)}</p>
              <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{t("play.moodLabel")}</p>
              <p className="text-sm text-muted-foreground">{t("play.feeling", { mood: moodLabel })}</p>
              <p className="text-sm text-muted-foreground">{moodSupport}</p>
              <p className="text-sm text-muted-foreground">{t("play.overviewDescription")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <EquipmentChip title={t("play.slot.companion")} value={translateRewardName(spotlightCompanion, t)} support={t("play.overviewEquippedCompanion")} />
              <EquipmentChip
                title={t("play.slot.environment")}
                value={activeEnvironmentReward ? translateRewardName(activeEnvironmentReward, t) : t("play.habitatModeDefault")}
                support={t("play.overviewEquippedEnvironment")}
              />
              <EquipmentChip title={t("play.overviewAccessoriesTitle")} value={equippedItems.length.toString()} support={t("play.overviewAccessoriesSupport")} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onOpenShop}>{t("play.shopNav")}</Button>
              <Button type="button" variant="ghost" onClick={onOpenCollection}>{t("play.collectionNav")}</Button>
              <Button type="button" variant="ghost" onClick={onOpenMissions}>{t("play.missionsNav")}</Button>
              <Button type="button" variant="ghost" onClick={onOpenAchievements}>{t("play.achievementsNav")}</Button>
            </div>
          </div>

          <HabitatPreviewSurface
            scene={activeHabitatScene}
            mood={foxMood}
            companionVariant={spotlightCompanion.companionVariant}
            accessories={previewAccessories}
            badgeLabel={t("play.previewPanelBadge")}
            rewardLabel={activeEnvironmentReward ? translateRewardName(activeEnvironmentReward, t) : undefined}
            t={t}
          />
        </div>
      </m.section>

      <StaggerGroup className="grid grid-cols-2 gap-2 @xs:grid-cols-4">
        <StatChip icon={Award} label={t("play.level")} value={snapshot.profile.level} color="primary" />
        <StatChip icon={Sparkles} label={t("play.xp")} value={snapshot.profile.xp} suffix={`/${xpForNextLevel}`} color="secondary" />
        <StatChip icon={Flame} label={t("play.streak")} value={snapshot.streak.currentDays} suffix={t("common.daysShort")} color="primary" />
        <StatChip icon={Coins} label={t("play.tokens")} value={snapshot.tokens} color="secondary" />
      </StaggerGroup>

      <m.div variants={staggerItem}>
        <StreakDisplay streakDays={Math.min(snapshot.streak.currentDays, 7)} />
      </m.div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="grid gap-3 sm:grid-cols-2">
          <OverviewDestinationCard
            title={t("play.shopNav")}
            description={t("play.shopRouteDescription")}
            meta={t("play.overviewShopMeta", { count: snapshot.storeCatalog.length })}
            buttonLabel={t("play.openSection")}
            onClick={onOpenShop}
          />
          <OverviewDestinationCard
            title={t("play.collectionNav")}
            description={t("play.collectionRouteDescription")}
            meta={t("play.overviewCollectionMeta", { count: ownedInventory.length })}
            buttonLabel={t("play.openSection")}
            onClick={onOpenCollection}
          />
          <OverviewDestinationCard
            title={t("play.missionsNav")}
            description={t("play.missionsRouteDescription")}
            meta={t("play.overviewMissionMeta", { daily: dailyMissionCount, weekly: weeklyMissionCount })}
            buttonLabel={t("play.openSection")}
            onClick={onOpenMissions}
          />
          <OverviewDestinationCard
            title={t("play.achievementsNav")}
            description={t("play.achievementsRouteDescription")}
            meta={t("play.overviewAchievementMeta", { count: achievementCount })}
            buttonLabel={t("play.openSection")}
            onClick={onOpenAchievements}
          />
        </section>

        <div className="space-y-4">
          <CompanionSpotlightCard companionVariant={spotlightCompanion.companionVariant} foxMood={foxMood} accessories={previewAccessories} />
          <HabitatSceneCard
            scene={activeHabitatScene}
            foxMood={foxMood}
            companionVariant={spotlightCompanion.companionVariant}
            accessories={previewAccessories}
            rewardName={activeEnvironmentReward ? translateRewardName(activeEnvironmentReward, t) : undefined}
            previewSelected={false}
            hasEquippedOverride={Boolean(activeEnvironmentReward?.equipped)}
          />
        </div>
      </div>
    </m.div>
  );
}

function useTranslatedQuests() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(() => snapshot.quests.map((quest) => withTranslatedQuest(quest, t)), [snapshot.quests, t]);
}

function useTranslatedInventory() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(() => snapshot.inventory.map((reward) => withTranslatedReward(reward, t)), [snapshot.inventory, t]);
}

function useTranslatedCatalog() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(() => snapshot.storeCatalog.map((reward) => withTranslatedReward(reward, t)), [snapshot.storeCatalog, t]);
}

export function PlayShopPage() {
  const { t } = useI18n();
  const {
    snapshot,
    foxMood,
    spotlightCompanion,
    previewAccessories,
    purchasingRewardKey,
    previewRewardKeys,
    hasActivePreview,
    togglePreviewRewardKey,
    clearAllPreview,
    clearPreviewKeysNotIn,
    buyRewardKey,
  } = usePlayContext();
  const translatedCatalog = useTranslatedCatalog();
  const [primaryTab, setPrimaryTab] = useState<StorePrimaryTab>("all");
  const [secondaryFilter, setSecondaryFilter] = useState<StoreSecondaryFilter>("all");
  const [page, setPage] = useState(1);

  const availableSecondaryFilters = useMemo<StoreSecondaryFilter[]>(() => {
    const base: StoreSecondaryFilter[] = ["all", "owned", "locked", "recovery"];
    if (primaryTab === "all" || primaryTab === "featured") {
      base.push("habitats", "wearables");
    }
    if (primaryTab === "accessories") {
      base.push("wearables");
    }
    if (primaryTab === "companions") {
      return ["all", "owned", "locked"];
    }

    return Array.from(new Set(base));
  }, [primaryTab]);

  useEffect(() => {
    if (!availableSecondaryFilters.includes(secondaryFilter)) {
      setSecondaryFilter("all");
    }
  }, [availableSecondaryFilters, secondaryFilter]);

  const filteredRewards = useMemo(() => {
    let rewards = translatedCatalog;
    if (primaryTab === "featured") {
      rewards = rewards.filter((reward) => reward.featured || reward.storeSection === "featured");
    } else if (primaryTab === "companions") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "companion");
    } else if (primaryTab === "accessories") {
      rewards = rewards.filter((reward) => reward.accessorySlot !== "companion");
    }

    if (secondaryFilter === "owned") {
      rewards = rewards.filter((reward) => reward.owned);
    } else if (secondaryFilter === "locked") {
      rewards = rewards.filter((reward) => reward.unlocked === false);
    } else if (secondaryFilter === "habitats") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "environment");
    } else if (secondaryFilter === "wearables") {
      rewards = rewards.filter((reward) => reward.accessorySlot !== "environment" && reward.accessorySlot !== "companion");
    } else if (secondaryFilter === "recovery") {
      rewards = rewards.filter((reward) => reward.themeTag === "recovery");
    }

    return rewards;
  }, [primaryTab, secondaryFilter, translatedCatalog]);

  const totalPages = Math.max(1, Math.ceil(filteredRewards.length / STORE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRewards = filteredRewards.slice((safePage - 1) * STORE_PAGE_SIZE, safePage * STORE_PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [primaryTab, secondaryFilter]);

  useEffect(() => {
    clearPreviewKeysNotIn(pagedRewards.map((reward) => reward.rewardKey));
  }, [clearPreviewKeysNotIn, pagedRewards]);

  return (
    <PlaySectionPage title={t("play.storeTitle")} description={t("play.shopRouteDescription")}>
      <div className="space-y-4">
        <section className="space-y-4 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-foreground">{t("play.storeBrowseTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("play.storeBrowseDescription")}</p>
              </div>
              <div className="rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-1 text-xs font-bold text-muted-foreground shadow-[var(--shadow-clay)]">
                {t("play.storeBrowseCount", { count: filteredRewards.length })}
              </div>
            </div>

            <Tabs value={primaryTab} onValueChange={(value) => setPrimaryTab(value as StorePrimaryTab)}>
              <TabsList className="w-full flex-wrap justify-start">
                {(["all", "featured", "companions", "accessories"] as const).map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {t(getPrimaryTabLabelKey(tab))}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-2" role="group" aria-label={t("play.storeSecondaryFilters")}>
              {availableSecondaryFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={getNeutralSegmentedControlClassName(secondaryFilter === filter)}
                  onClick={() => setSecondaryFilter(filter)}
                >
                  {t(getSecondaryFilterLabelKey(filter))}
                </button>
              ))}
            </div>
          </div>

          {pagedRewards.length === 0 ? (
            <EmptyCollectionState title={t("play.emptyStoreFilterTitle")} description={t("play.emptyStoreFilterDescription")} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedRewards.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onPurchase={() => void buyRewardKey(reward.rewardKey)}
                  pending={purchasingRewardKey === reward.rewardKey}
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          )}

          <PaginationRow
            currentPage={safePage}
            totalPages={totalPages}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </section>

        {hasActivePreview ? (
          <PlayPreviewPanel onClearAllPreview={clearAllPreview} />
        ) : null}
      </div>
    </PlaySectionPage>
  );
}

export function PlayCollectionPage() {
  const { t } = useI18n();
  const {
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

  const owned = translatedInventory.filter((reward) => reward.owned);
  const companions = translatedCatalog.filter((reward) => reward.owned && isCompanionReward(reward));
  const environments = owned.filter((reward) => reward.accessorySlot === "environment");
  const accessories = owned.filter((reward) => reward.accessorySlot !== "environment");

  return (
    <PlaySectionPage title={t("play.inventoryTitle")} description={t("play.collectionRouteDescription")}>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <CollectionSection title={t("play.collectionCompanionsTitle")} description={t("play.collectionCompanionsDescription")}>
            <div className="grid gap-3 lg:grid-cols-2">
              {companions.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={equippingRewardKey === reward.rewardKey || unequippingRewardKey === reward.rewardKey}
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          </CollectionSection>

          <CollectionSection title={t("play.inventoryHabitatsTitle")} description={t("play.collectionHabitatsDescription")}>
            <div className="grid gap-3 lg:grid-cols-2">
              {environments.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={equippingRewardKey === reward.rewardKey || unequippingRewardKey === reward.rewardKey}
                  companionVariant={spotlightCompanion.companionVariant}
                  mood={foxMood}
                  accessories={previewAccessories}
                />
              ))}
            </div>
          </CollectionSection>

          <CollectionSection title={t("play.inventoryAccessoriesTitle")} description={t("play.collectionAccessoriesDescription")}>
            <div className="grid gap-3 lg:grid-cols-2">
              {accessories.map((reward) => (
                <RewardCard
                  key={reward.rewardKey}
                  reward={reward}
                  tokens={snapshot.tokens}
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
                  onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                  onEquip={() => void equipRewardKey(reward.rewardKey)}
                  onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                  pending={equippingRewardKey === reward.rewardKey || unequippingRewardKey === reward.rewardKey}
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

export function PlayMissionsPage() {
  const { t } = useI18n();
  const { activatingQuestKey, claimingQuestKey, activateQuestKey, claimQuestKey } = usePlayContext();
  const quests = useTranslatedQuests();

  return (
    <PlaySectionPage title={t("play.missionsNav")} description={t("play.missionsRouteDescription")}>
      <QuestPanel
        quests={quests.filter((quest) => quest.cadence !== "achievement")}
        activatingQuestKey={activatingQuestKey}
        claimingQuestKey={claimingQuestKey}
        onActivateQuest={activateQuestKey}
        onClaimQuest={claimQuestKey}
      />
    </PlaySectionPage>
  );
}

export function PlayAchievementsPage() {
  const { t } = useI18n();
  const { claimingQuestKey, claimQuestKey } = usePlayContext();
  const quests = useTranslatedQuests();

  return (
    <PlaySectionPage title={t("play.achievementsNav")} description={t("play.achievementsRouteDescription")}>
      <QuestPanel
        quests={quests.filter((quest) => quest.cadence === "achievement")}
        claimingQuestKey={claimingQuestKey}
        onClaimQuest={claimQuestKey}
      />
    </PlaySectionPage>
  );
}

function PlayPreviewPanel({ onClearAllPreview }: { onClearAllPreview?: () => void }) {
  const { t } = useI18n();
  const { spotlightCompanion, activeEnvironmentReward, activeHabitatScene, foxMood, previewAccessories } = usePlayContext();

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">{t("play.previewPanelTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("play.previewPanelDescription")}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClearAllPreview}>
          {t("play.clearPreview")}
        </Button>
      </div>

      <HabitatPreviewSurface
        scene={activeHabitatScene}
        mood={foxMood}
        companionVariant={spotlightCompanion.companionVariant}
        accessories={previewAccessories}
        rewardLabel={activeEnvironmentReward ? translateRewardName(activeEnvironmentReward, t) : undefined}
        badgeLabel={t("play.previewPanelBadge")}
        t={t}
      />
    </section>
  );
}

type RewardCardProps = {
  reward: PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number];
  tokens: number;
  previewSelected?: boolean;
  onPreview?: () => void;
  onPurchase?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  pending?: boolean;
  hideRewardNameOnArt?: boolean;
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
};

function RewardCard({ reward, tokens, previewSelected = false, onPreview, onPurchase, onEquip, onUnequip, pending = false, hideRewardNameOnArt = false, companionVariant, mood, accessories }: RewardCardProps) {
  const { t } = useI18n();
  const rarity = "rarity" in reward ? reward.rarity : undefined;
  const showEquipAction = Boolean(onEquip);
  const showUnequipAction = Boolean(onUnequip);
  const isLocked = "unlocked" in reward && reward.unlocked === false;
  const unlockHint = resolveUnlockHint(reward, t);
  const description = translateRewardDescription(reward, t);

  return (
    <div className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-3 shadow-[var(--shadow-card)]">
      <RewardArtPreview
        reward={reward}
        companionVariant={companionVariant}
        mood={mood}
        accessories={accessories}
        showRewardLabel={!hideRewardNameOnArt}
        t={t}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{translateRewardName(reward, t)}</p>
          {rarity ? <span className={getRarityBadgeClasses(rarity)}>{t(`play.rarity.${rarity}` as const)}</span> : null}
          {reward.themeTag ? <span className={getThemeTagClasses(reward.themeTag)}>{t(getThemeTagLabelKey(reward.themeTag))}</span> : null}
          {reward.owned ? (
            <span className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
              {reward.equipped ? t("gamification.activeNow") : t("play.owned")}
            </span>
          ) : null}
          {isLocked ? <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">{t("play.locked")}</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">{t(getRewardSlotLabelKey(reward.accessorySlot))}</p>
        {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button type="button" size="sm" variant={previewSelected ? "primary" : "ghost"} onClick={onPreview}>
            {previewSelected ? t("play.previewing") : t("play.preview")}
          </Button>
        ) : null}

        {reward.owned ? (
          reward.equipped ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending || !showUnequipAction} onClick={onUnequip}>
              {t("play.unequip")}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="soft" disabled={pending || !showEquipAction} onClick={onEquip}>
              {t("play.equip")}
            </Button>
          )
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending || tokens < reward.costTokens || isLocked}
            onClick={onPurchase}
          >
            {isLocked ? t("play.locked") : `${t("play.buy")} - ${reward.costTokens}`}
          </Button>
        )}
      </div>

      {unlockHint ? <p className="text-xs leading-relaxed text-muted-foreground">{unlockHint}</p> : null}
    </div>
  );
}

function OverviewDestinationCard({
  title,
  description,
  meta,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  meta: string;
  buttonLabel: string;
  onClick?: () => void;
}) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div className="space-y-1.5">
        <p className="font-display text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs font-semibold text-muted-foreground">{meta}</p>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onClick}>
        {buttonLabel}
      </Button>
    </section>
  );
}

function PlaySectionPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function CollectionSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyCollectionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-4 py-6 text-center shadow-[var(--shadow-clay-inset)]">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PaginationRow({ currentPage, totalPages, onPrevious, onNext }: { currentPage: number; totalPages: number; onPrevious: () => void; onNext: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
      <p className="text-xs font-semibold text-muted-foreground">{t("play.pageLabel", { current: currentPage, total: totalPages })}</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={currentPage <= 1} onClick={onPrevious}>
          {t("common.previous")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={currentPage >= totalPages} onClick={onNext}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}

function CompanionSpotlightCard({ companionVariant, foxMood, accessories }: { companionVariant: FoxVariant; foxMood: FoxMood; accessories: FoxAccessory[] }) {
  const { t } = useI18n();

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{t("play.companionSpotlightTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("play.companionSpotlightDescription")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex justify-center rounded-[1.5rem] border-2 border-primary/15 bg-[color:var(--color-field)] p-4 shadow-[var(--shadow-clay)]">
          <FoxMascot mood={foxMood} size={92} accessories={accessories} variant={companionVariant} />
        </div>

        <div className="space-y-2">
          <p className="font-display text-xl font-semibold text-foreground">{t(getCompanionTitleKey(companionVariant))}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t(getCompanionPersonalityKey(companionVariant))}</p>
          <div className="space-y-1 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
            <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{t("play.companionSpotlightBestFor")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t(getCompanionBestForKey(companionVariant))}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HabitatSceneCard({ scene, foxMood, companionVariant, accessories, rewardName, previewSelected, hasEquippedOverride }: { scene: HabitatSceneKey; foxMood: FoxMood; companionVariant: FoxVariant; accessories: FoxAccessory[]; rewardName?: string; previewSelected: boolean; hasEquippedOverride: boolean }) {
  const { t } = useI18n();
  const badgeLabel = previewSelected
    ? t("play.habitatModePreview")
    : hasEquippedOverride
      ? t("play.habitatModeEquipped")
      : t("play.habitatModeDefault");

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{t("play.habitatTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("play.habitatDescription")}</p>
      </div>

      <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">{badgeLabel}</p>

      <HabitatPreviewSurface
        scene={scene}
        mood={foxMood}
        companionVariant={companionVariant}
        accessories={accessories}
        badgeLabel={badgeLabel}
        rewardLabel={rewardName}
        t={t}
      />
    </section>
  );
}

function EquipmentChip({ title, value, support }: { title: string; value: string; support: string }) {
  return (
    <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
      <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{title}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{support}</p>
    </div>
  );
}

function MoodBadge({ label, tone }: { label: string; tone: "primary" | "secondary" }) {
  const toneClasses = tone === "primary" ? "border-primary/25 bg-primary/10 text-primary" : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground";
  return <span className={`rounded-full border-2 px-3 py-1 text-xs font-semibold shadow-[var(--shadow-button-soft)] ${toneClasses}`}>{label}</span>;
}

function StatChip({ icon: Icon, label, value, suffix, color = "primary" }: { icon: LucideIcon; label: string; value: number; suffix?: string; color?: "primary" | "secondary" }) {
  const motionValue = useMotionValue(0);
  const displayText = useTransform(motionValue, (v) => (Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1)));

  useEffect(() => {
    const controls = animate(motionValue, value, { type: "spring", stiffness: 60, damping: 20 });
    return controls.stop;
  }, [value, motionValue]);

  const colorClasses = color === "primary" ? "border-primary/20 text-primary" : "border-secondary/20 text-secondary";
  const tintSurfaceStyle = color === "primary" ? primaryTintSurface : secondaryTintSurface;

  return (
    <m.div variants={staggerItemScale} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-3 py-3 shadow-[var(--shadow-card)]">
      <div className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${colorClasses}`} style={tintSurfaceStyle}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-center">
        <span className="font-display text-lg leading-none font-bold tabular-nums text-foreground">
          <m.span>{displayText}</m.span>
          {suffix ? <span className="text-xs font-normal text-muted-foreground">{suffix}</span> : null}
        </span>
      </div>
      <span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">{label}</span>
    </m.div>
  );
}
