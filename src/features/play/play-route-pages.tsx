import { m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { usePlayContext } from "@/features/play/play-layout";
import {
  HabitatPreviewSurface,
  RewardArtPreview,
  getHabitatTitleKey,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
  isCompanionReward,
} from "@/features/play/play-scene";
import { staggerItem } from "@/lib/animations";
import { getNeutralSegmentedControlClassName } from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";

import type { FoxAccessory, FoxMood, FoxVariant } from "@/components/shared/fox-mascot";
import type { PlaySnapshot } from "@/types/dashboard";

type PlayMessageKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];
type StorePrimaryTab = "all" | "featured" | "companions" | "accessories";
type StoreSecondaryFilter = "all" | "owned" | "locked" | "habitats" | "wearables" | "recovery";
const STORE_PAGE_SIZE = 6;

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

function sortRecommendedQuests(
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

function withTranslatedReward<
  T extends Pick<PlaySnapshot["storeCatalog"][number], "rewardKey" | "rewardName">,
>(reward: T, t: ReturnType<typeof useI18n>["t"]) {
  return {
    ...reward,
    rewardName: translateRewardName(reward, t),
  };
}

function withTranslatedQuest<T extends PlaySnapshot["quests"][number]>(
  quest: T,
  t: ReturnType<typeof useI18n>["t"],
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
  const {
    snapshot,
    foxMood,
    spotlightCompanion,
    activeEnvironmentReward,
    activeHabitatScene,
    previewAccessories,
  } = usePlayContext();

  const equippedItems = snapshot.inventory.filter(
    (reward) => reward.equipped && reward.accessorySlot !== "environment",
  );
  const moodLabel = t(getMoodLabelKey(snapshot.equippedCompanionMood));
  const moodSupport = t(getMoodSupportKey(snapshot.equippedCompanionMood));
  const featuredRewards = snapshot.storeCatalog.filter((reward) => reward.featured).slice(0, 4);
  const recommendedQuests = snapshot.quests
    .filter((quest) => !quest.isClaimed)
    .slice()
    .sort(sortRecommendedQuests)
    .slice(0, 3)
    .map((quest) => withTranslatedQuest(quest, t));
  const currentEnvironmentLabel = activeEnvironmentReward
    ? translateRewardName(activeEnvironmentReward, t)
    : t(getHabitatTitleKey(activeHabitatScene));
  const accessorySummary =
    equippedItems.length === 0
      ? t("play.heroAccessoriesEmpty" as PlayMessageKey)
      : t("play.heroAccessoriesCount" as PlayMessageKey, { count: equippedItems.length });

  return (
    <m.div className="space-y-6">
      <m.section
        variants={staggerItem}
        className="overflow-hidden rounded-[1.9rem] border-2 border-[color:var(--color-border-subtle)] shadow-[var(--shadow-card)]"
      >
        <HabitatPreviewSurface
          scene={activeHabitatScene}
          mood={foxMood}
          companionVariant={spotlightCompanion.companionVariant}
          accessories={previewAccessories}
          badgeLabel={t("play.heroSceneBadge" as PlayMessageKey)}
          rewardLabel={currentEnvironmentLabel}
          mascotSize={108}
          className="min-h-[320px] p-5 md:min-h-[360px]"
          detailsContent={
            <div className="space-y-4 text-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <HeroMetricPill label={t("play.heroSceneBadge" as PlayMessageKey)} tone="neutral" />
                <HeroMetricPill label={`Lv ${snapshot.profile.level}`} tone="primary" />
                <HeroMetricPill label={`${snapshot.tokens} ${t("play.tokens")}`} tone="neutral" />
                <HeroMetricPill
                  label={`${snapshot.streak.currentDays}${t("common.daysShort")} ${t("play.streak")}`}
                  tone="neutral"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[0.68rem] font-bold tracking-[0.18em] text-foreground/70 uppercase">
                  {t("play.heroEyebrow" as PlayMessageKey)}
                </p>
                <p className="font-display text-3xl font-semibold text-foreground md:text-4xl">
                  {translateRewardName(spotlightCompanion, t)}
                </p>
                <p className="text-sm font-semibold text-foreground/84">
                  {currentEnvironmentLabel}
                </p>
                <p className="max-w-xl text-sm leading-relaxed text-foreground/78">{moodSupport}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <HeroInlineStat label={t("play.moodLabel")} value={moodLabel} />
                <HeroInlineStat
                  label={t("play.slot.environment")}
                  value={currentEnvironmentLabel}
                />
                <HeroInlineStat
                  label={t("play.overviewAccessoriesTitle")}
                  value={accessorySummary}
                />
              </div>
            </div>
          }
          t={t}
        />
      </m.section>

      <m.div variants={staggerItem}>
        <StreakDisplay streakDays={Math.min(snapshot.streak.currentDays, 7)} compact />
      </m.div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {t("play.overviewFeaturedTitle" as PlayMessageKey)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("play.overviewFeaturedDescription" as PlayMessageKey)}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenShop}>
              {t("play.shopNav")}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {featuredRewards.map((reward) => (
              <RewardCard
                key={reward.rewardKey}
                reward={withTranslatedReward(reward, t)}
                tokens={snapshot.tokens}
                onPurchase={() => onOpenShop?.()}
                companionVariant={spotlightCompanion.companionVariant}
                mood={foxMood}
                accessories={previewAccessories}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {t("play.overviewRecommendedMissionsTitle" as PlayMessageKey)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("play.overviewRecommendedMissionsDescription" as PlayMessageKey)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={onOpenMissions}>
                {t("play.missionsNav")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenCollection}>
                {t("play.collectionNav")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenAchievements}>
                {t("play.achievementsNav")}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {recommendedQuests.map((quest) => (
              <RecommendedMissionCard key={quest.questKey} quest={quest} />
            ))}
          </div>
        </section>
      </div>
    </m.div>
  );
}

function useTranslatedQuests() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () => snapshot.quests.map((quest) => withTranslatedQuest(quest, t)),
    [snapshot.quests, t],
  );
}

function useTranslatedInventory() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () => snapshot.inventory.map((reward) => withTranslatedReward(reward, t)),
    [snapshot.inventory, t],
  );
}

function useTranslatedCatalog() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () => snapshot.storeCatalog.map((reward) => withTranslatedReward(reward, t)),
    [snapshot.storeCatalog, t],
  );
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

  const activeSecondaryFilter = availableSecondaryFilters.includes(secondaryFilter)
    ? secondaryFilter
    : "all";

  const filteredRewards = useMemo(() => {
    let rewards = translatedCatalog;
    if (primaryTab === "featured") {
      rewards = rewards.filter((reward) => reward.featured || reward.storeSection === "featured");
    } else if (primaryTab === "companions") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "companion");
    } else if (primaryTab === "accessories") {
      rewards = rewards.filter((reward) => reward.accessorySlot !== "companion");
    }

    if (activeSecondaryFilter === "owned") {
      rewards = rewards.filter((reward) => reward.owned);
    } else if (activeSecondaryFilter === "locked") {
      rewards = rewards.filter((reward) => reward.unlocked === false);
    } else if (activeSecondaryFilter === "habitats") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "environment");
    } else if (activeSecondaryFilter === "wearables") {
      rewards = rewards.filter(
        (reward) => reward.accessorySlot !== "environment" && reward.accessorySlot !== "companion",
      );
    } else if (activeSecondaryFilter === "recovery") {
      rewards = rewards.filter((reward) => reward.themeTag === "recovery");
    }

    return rewards;
  }, [activeSecondaryFilter, primaryTab, translatedCatalog]);

  const totalPages = Math.max(1, Math.ceil(filteredRewards.length / STORE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRewards = filteredRewards.slice(
    (safePage - 1) * STORE_PAGE_SIZE,
    safePage * STORE_PAGE_SIZE,
  );

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    clearPreviewKeysNotIn(pagedRewards.map((reward) => reward.rewardKey));
  }, [clearPreviewKeysNotIn, pagedRewards]);

  function handlePrimaryTabChange(value: string) {
    setPrimaryTab(value as StorePrimaryTab);
    setPage(1);
  }

  function handleSecondaryFilterChange(filter: StoreSecondaryFilter) {
    setSecondaryFilter(filter);
    setPage(1);
  }

  return (
    <PlaySectionPage title={t("play.storeTitle")} description={t("play.shopRouteDescription")}>
      <div className="space-y-4">
        <section className="space-y-4 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  {t("play.storeBrowseTitle")}
                </p>
                <p className="text-sm text-muted-foreground">{t("play.storeBrowseDescription")}</p>
              </div>
              <div className="rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-1 text-xs font-bold text-muted-foreground shadow-[var(--shadow-clay)]">
                {t("play.storeBrowseCount", { count: filteredRewards.length })}
              </div>
            </div>

            <Tabs value={primaryTab} onValueChange={handlePrimaryTabChange}>
              <TabsList className="w-full flex-wrap justify-start">
                {(["all", "featured", "companions", "accessories"] as const).map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {t(getPrimaryTabLabelKey(tab))}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t("play.storeSecondaryFilters")}
            >
              {availableSecondaryFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={getNeutralSegmentedControlClassName(activeSecondaryFilter === filter)}
                  onClick={() => handleSecondaryFilterChange(filter)}
                >
                  {t(getSecondaryFilterLabelKey(filter))}
                </button>
              ))}
            </div>
          </div>

          {pagedRewards.length === 0 ? (
            <EmptyCollectionState
              title={t("play.emptyStoreFilterTitle")}
              description={t("play.emptyStoreFilterDescription")}
            />
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

        {hasActivePreview ? <PlayPreviewPanel onClearAllPreview={clearAllPreview} /> : null}
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
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
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
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
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
                  previewSelected={isRewardPreviewSelected(reward.rewardKey, previewRewardKeys)}
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

export function PlayMissionsPage() {
  const { t } = useI18n();
  const { activatingQuestKey, claimingQuestKey, activateQuestKey, claimQuestKey } =
    usePlayContext();
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
    <PlaySectionPage
      title={t("play.achievementsNav")}
      description={t("play.achievementsRouteDescription")}
    >
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
  const {
    spotlightCompanion,
    activeEnvironmentReward,
    activeHabitatScene,
    foxMood,
    previewAccessories,
  } = usePlayContext();

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {t("play.previewPanelTitle")}
          </p>
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
        rewardLabel={
          activeEnvironmentReward ? translateRewardName(activeEnvironmentReward, t) : undefined
        }
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

function RewardCard({
  reward,
  tokens,
  previewSelected = false,
  onPreview,
  onPurchase,
  onEquip,
  onUnequip,
  pending = false,
  hideRewardNameOnArt = false,
  companionVariant,
  mood,
  accessories,
}: RewardCardProps) {
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
          {rarity ? (
            <span className={getRarityBadgeClasses(rarity)}>
              {t(`play.rarity.${rarity}` as const)}
            </span>
          ) : null}
          {reward.themeTag ? (
            <span className={getThemeTagClasses(reward.themeTag)}>
              {t(getThemeTagLabelKey(reward.themeTag))}
            </span>
          ) : null}
          {reward.owned ? (
            <span className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
              {reward.equipped ? t("gamification.activeNow") : t("play.owned")}
            </span>
          ) : null}
          {isLocked ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
              {t("play.locked")}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(getRewardSlotLabelKey(reward.accessorySlot))}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button
            type="button"
            size="sm"
            variant={previewSelected ? "primary" : "ghost"}
            onClick={onPreview}
          >
            {previewSelected ? t("play.previewing") : t("play.preview")}
          </Button>
        ) : null}

        {reward.owned ? (
          reward.equipped ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending || !showUnequipAction}
              onClick={onUnequip}
            >
              {t("play.unequip")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="soft"
              disabled={pending || !showEquipAction}
              onClick={onEquip}
            >
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

      {unlockHint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{unlockHint}</p>
      ) : null}
    </div>
  );
}

function PlaySectionPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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

function CollectionSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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

function PaginationRow({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("play.pageLabel", { current: currentPage, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={currentPage <= 1}
          onClick={onPrevious}
        >
          {t("common.previous")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={currentPage >= totalPages}
          onClick={onNext}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}

function HeroMetricPill({ label, tone }: { label: string; tone: "primary" | "neutral" }) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/20 bg-primary/18 text-primary"
      : "border-white/35 bg-white/26 text-foreground/80";
  return (
    <span
      className={`rounded-full border-2 px-3 py-1 text-xs font-semibold shadow-[var(--shadow-button-soft)] backdrop-blur-md ${toneClasses}`}
    >
      {label}
    </span>
  );
}

function HeroInlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[1.15rem] border-2 border-white/28 px-3 py-2.5 shadow-[var(--shadow-clay)] backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-panel-elevated) 72%, transparent)",
      }}
    >
      <p className="text-[0.68rem] font-bold tracking-[0.18em] text-foreground/66 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function RecommendedMissionCard({ quest }: { quest: PlaySnapshot["quests"][number] }) {
  const { t } = useI18n();
  const progress =
    quest.targetValue === 0 ? 0 : Math.min(quest.progressValue / quest.targetValue, 1);
  const stateLabel =
    !quest.isClaimed && quest.progressValue >= quest.targetValue
      ? t("gamification.complete")
      : quest.isActive
        ? t("gamification.activeNow")
        : t(`gamification.category.${quest.category}` as const);

  return (
    <div className="rounded-[1.25rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{quest.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{quest.description}</p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/12 px-2 py-0.5 text-[0.65rem] font-bold text-primary">
          {stateLabel}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>{quest.rewardLabel}</span>
          <span>
            {quest.progressValue}/{quest.targetValue}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[color:var(--color-panel)] shadow-[var(--shadow-clay-inset)]">
          <div
            className="h-1.5 rounded-full bg-linear-to-r from-primary to-secondary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
