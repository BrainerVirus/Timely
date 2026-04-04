import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  getMoodLabelKey,
  getMoodSupportKey,
  sortRecommendedQuests,
  translateRewardName,
  withTranslatedQuest,
  withTranslatedReward,
} from "@/features/play/lib/play-i18n";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";
import {
  HeroInlineStat,
  HeroMetricPill,
  RecommendedMissionCard,
} from "@/features/play/ui/PlayRouteScaffold/PlayRouteScaffold";
import { HabitatPreviewSurface, getHabitatTitleKey } from "@/features/play/ui/PlayScene/PlayScene";
import { PlayStatusState } from "@/features/play/ui/PlayStatusState/PlayStatusState";
import { RewardCard } from "@/features/play/ui/RewardCard/RewardCard";
import { StreakDisplay } from "@/features/play/ui/StreakDisplay/StreakDisplay";
import { staggerItem } from "@/shared/lib/animations/animations";
import { Button } from "@/shared/ui/Button/Button";

type PlayMessageKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

export function PlayOverviewPage({
  onOpenShop,
  onOpenCollection,
  onOpenMissions,
  onOpenAchievements,
}: Readonly<{
  onOpenShop?: () => void;
  onOpenCollection?: () => void;
  onOpenMissions?: () => void;
  onOpenAchievements?: () => void;
}>) {
  const { t } = useI18n();
  const {
    error,
    loading,
    snapshot,
    foxMood,
    spotlightCompanion,
    activeEnvironmentReward,
    activeHabitatScene,
    previewAccessories,
  } = usePlayContext();

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
    .map((quest) => withTranslatedQuest(quest, t as (key: string) => string));
  const currentEnvironmentLabel = activeEnvironmentReward
    ? translateRewardName(activeEnvironmentReward, t as (key: string) => string)
    : t(getHabitatTitleKey(activeHabitatScene));
  const accessorySummary =
    equippedItems.length === 0
      ? t("play.heroAccessoriesEmpty" as PlayMessageKey)
      : t("play.heroAccessoriesCount" as PlayMessageKey, { count: equippedItems.length });

  return (
    <m.div className="space-y-6">
      <m.section
        variants={staggerItem}
        className="overflow-hidden rounded-[1.9rem] border-2 border-border-subtle shadow-card"
      >
        <HabitatPreviewSurface
          scene={activeHabitatScene}
          mood={foxMood}
          companionVariant={spotlightCompanion.companionVariant}
          accessories={previewAccessories}
          badgeLabel={t("play.heroSceneBadge" as PlayMessageKey)}
          rewardLabel={currentEnvironmentLabel}
          mascotSize={108}
          mascotAnimationMode="full"
          className="min-h-80 p-5 md:min-h-90"
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
                  {translateRewardName(spotlightCompanion, t as (key: string) => string)}
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
        <section className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
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
                reward={withTranslatedReward(reward, t as (key: string) => string)}
                tokens={snapshot.tokens}
                onPurchase={() => onOpenShop?.()}
                companionVariant={spotlightCompanion.companionVariant}
                mood={foxMood}
                accessories={previewAccessories}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
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
