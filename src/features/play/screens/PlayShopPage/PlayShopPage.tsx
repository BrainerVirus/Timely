import { useEffect } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { useShopFilters } from "@/features/play/hooks/use-shop-filters/use-shop-filters";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";
import { getPrimaryTabLabelKey, getSecondaryFilterLabelKey } from "@/features/play/lib/play-i18n";
import { useTranslatedCatalog } from "@/features/play/lib/play-route-data/play-route-data";
import { PlayPreviewPanel } from "@/features/play/ui/PlayPreviewPanel/PlayPreviewPanel";
import { PlayStatusState } from "@/features/play/ui/PlayStatusState/PlayStatusState";
import { RewardCard } from "@/features/play/ui/RewardCard/RewardCard";
import {
  EmptyCollectionState,
  PaginationRow,
  PlaySectionPage,
} from "@/features/play/ui/PlayRouteScaffold/PlayRouteScaffold";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/Tabs/Tabs";
import { getNeutralSegmentedControlClassName } from "@/shared/lib/control-styles/control-styles";

export function PlayShopPage() {
  const { t } = useI18n();
  const {
    error,
    loading,
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
  const {
    primaryTab,
    secondaryFilter,
    availableSecondaryFilters,
    filteredRewards,
    pagedRewards,
    totalPages,
    safePage,
    handleTabChange,
    handleFilterChange,
    handlePagePrevious,
    handlePageNext,
  } = useShopFilters(translatedCatalog);
  const { allowDecorativeAnimation } = useMotionSettings();

  useEffect(() => {
    clearPreviewKeysNotIn(pagedRewards.map((reward) => reward.rewardKey));
  }, [clearPreviewKeysNotIn, pagedRewards]);

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

  return (
    <PlaySectionPage title={t("play.storeTitle")} description={t("play.shopRouteDescription")}>
      <div className="space-y-4">
        <section className="space-y-4 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  {t("play.storeBrowseTitle")}
                </p>
                <p className="text-sm text-muted-foreground">{t("play.storeBrowseDescription")}</p>
              </div>
              <div className="rounded-full border-2 border-border-subtle bg-field px-3 py-1 text-xs font-bold text-muted-foreground shadow-clay">
                {t("play.storeBrowseCount", { count: filteredRewards.length })}
              </div>
            </div>

            <Tabs
              value={primaryTab}
              onValueChange={handleTabChange}
              allowDecorativeAnimation={allowDecorativeAnimation}
            >
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
                  className={getNeutralSegmentedControlClassName(secondaryFilter === filter)}
                  onClick={() => handleFilterChange(filter)}
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
                  previewSelected={previewRewardKeys.includes(reward.rewardKey)}
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
            onPrevious={handlePagePrevious}
            onNext={handlePageNext}
          />
        </section>

        {hasActivePreview ? <PlayPreviewPanel onClearAllPreview={clearAllPreview} /> : null}
      </div>
    </PlaySectionPage>
  );
}
