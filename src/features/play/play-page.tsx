import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxAccessory, type FoxMood, type FoxVariant } from "@/components/shared/fox-mascot";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { PlayProvider, usePlayContext } from "@/features/play/play-layout";
import {
  HabitatPreviewSurface,
  RewardArtPreview,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
} from "@/features/play/play-scene";
import { useI18n } from "@/lib/i18n";

import type { BootstrapPayload, CompanionMood, RewardCatalogItem, RewardInventoryItem } from "@/types/dashboard";

function getRewardDisplayNameKey(rewardKey: string) {
  return `play.reward.${rewardKey}.name` as const;
}

function getRewardDisplayDescriptionKey(rewardKey: string) {
  return `play.reward.${rewardKey}.description` as const;
}

function getQuestTitleKey(questKey: string) {
  return `play.quest.${questKey}.title` as const;
}

function getQuestDescriptionKey(questKey: string) {
  return `play.quest.${questKey}.description` as const;
}

function getQuestRewardLabelKey(questKey: string) {
  return `play.quest.${questKey}.rewardLabel` as const;
}

function translateRewardName(reward: { rewardKey: string; rewardName: string }, t: ReturnType<typeof useI18n>["t"]) {
  const key = getRewardDisplayNameKey(reward.rewardKey) as Parameters<ReturnType<typeof useI18n>["t"]>[0];
  const translated = t(key);
  return translated === key ? reward.rewardName : translated;
}

function translateRewardDescription(rewardKey: string, t: ReturnType<typeof useI18n>["t"]) {
  const key = getRewardDisplayDescriptionKey(rewardKey) as Parameters<ReturnType<typeof useI18n>["t"]>[0];
  const translated = t(key);
  return translated === key ? undefined : translated;
}

function getMoodLabelKey(mood: CompanionMood) {
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

function getMoodSupportKey(mood: CompanionMood) {
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

type LegacyStoreCardProps = {
  reward: RewardCatalogItem;
  tokens: number;
  previewSelected: boolean;
  onPreview?: () => void;
  onPurchase?: () => void;
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
};

function LegacyStoreCard({
  reward,
  tokens,
  previewSelected,
  onPreview,
  onPurchase,
  companionVariant,
  mood,
  accessories,
}: LegacyStoreCardProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-3 shadow-[var(--shadow-card)]">
      <RewardArtPreview reward={reward} companionVariant={companionVariant} mood={mood} accessories={accessories} t={t} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{translateRewardName(reward, t)}</p>
          <span className={getRarityBadgeClasses(reward.rarity)}>{t(`play.rarity.${reward.rarity}` as const)}</span>
          {reward.themeTag ? <span className={getThemeTagClasses(reward.themeTag)}>{t(getThemeTagLabelKey(reward.themeTag))}</span> : null}
          {reward.owned ? (
            <span className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
              {reward.equipped ? t("gamification.activeNow") : t("play.owned")}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t(getRewardSlotLabelKey(reward.accessorySlot))}</p>
        {translateRewardDescription(reward.rewardKey, t) ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{translateRewardDescription(reward.rewardKey, t)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button type="button" size="sm" variant={previewSelected ? "primary" : "ghost"} onClick={onPreview}>
            {previewSelected ? t("play.previewing") : t("play.preview")}
          </Button>
        ) : null}
        {!reward.owned && onPurchase ? (
          <Button
            type="button"
            size="sm"
            disabled={tokens < reward.costTokens || reward.unlocked === false}
            onClick={onPurchase}
          >
            {t("play.buy")} - {reward.costTokens}
          </Button>
        ) : null}
      </div>

      {reward.unlockHint ? <p className="text-xs leading-relaxed text-muted-foreground">{reward.unlockHint}</p> : null}
    </div>
  );
}

type LegacyInventoryCardProps = {
  reward: RewardInventoryItem;
  previewSelected?: boolean;
  onPreview?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
};

function LegacyInventoryCard({
  reward,
  previewSelected = false,
  onPreview,
  onEquip,
  onUnequip,
  companionVariant,
  mood,
  accessories,
}: LegacyInventoryCardProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-3 shadow-[var(--shadow-card)]">
      <RewardArtPreview
        reward={reward}
        companionVariant={companionVariant}
        mood={mood}
        accessories={accessories}
        showRewardLabel={false}
        t={t}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{translateRewardName(reward, t)}</p>
          {reward.equipped ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
              {t("gamification.activeNow")}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t(getRewardSlotLabelKey(reward.accessorySlot))}</p>
        {translateRewardDescription(reward.rewardKey, t) ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{translateRewardDescription(reward.rewardKey, t)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button type="button" size="sm" variant={previewSelected ? "primary" : "ghost"} onClick={onPreview}>
            {previewSelected ? t("play.previewing") : t("play.preview")}
          </Button>
        ) : null}
        {reward.equipped ? (
          <Button type="button" size="sm" variant="ghost" onClick={onUnequip}>
            {t("play.unequip")}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="soft" onClick={onEquip}>
            {t("play.equip")}
          </Button>
        )}
      </div>
    </div>
  );
}

function StoreLane({
  title,
  rewards,
  tokens,
  previewRewardKeys,
  onPreviewReward,
  onPurchase,
  companionVariant,
  mood,
  accessories,
}: {
  title: string;
  rewards: RewardCatalogItem[];
  tokens: number;
  previewRewardKeys: string[];
  onPreviewReward: (rewardKey: string) => void;
  onPurchase: (rewardKey: string) => Promise<void>;
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
}) {
  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {rewards.map((reward) => (
          <LegacyStoreCard
            key={reward.rewardKey}
            reward={reward}
            tokens={tokens}
            previewSelected={previewRewardKeys.includes(reward.rewardKey)}
            onPreview={() => onPreviewReward(reward.rewardKey)}
            onPurchase={!reward.owned ? () => void onPurchase(reward.rewardKey) : undefined}
            companionVariant={companionVariant}
            mood={mood}
            accessories={accessories}
          />
        ))}
      </div>
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

function LegacyPlayOverview() {
  const { t } = useI18n();
  const {
    snapshot,
    preview,
    previewRewardKeys,
    foxMood,
    spotlightCompanion,
    activeEnvironmentReward,
    activeHabitatScene,
    equippedAccessories,
    activatingQuestKey,
    claimingQuestKey,
    purchasingRewardKey,
    activateQuestKey,
    claimQuestKey,
    buyRewardKey,
    equipRewardKey,
    unequipRewardKey,
    togglePreviewRewardKey,
  } = usePlayContext();

  const xpForNextLevel = (snapshot.profile.level + 1) * 100;
  const featured = snapshot.storeCatalog.filter((reward) => reward.storeSection === "featured");
  const companions = snapshot.storeCatalog.filter((reward) => reward.storeSection === "companions");
  const accessories = snapshot.storeCatalog.filter((reward) => reward.storeSection === "accessories");
  const ownedInventory = snapshot.inventory.filter((reward) => reward.owned);
  const ownedHabitats = ownedInventory.filter((reward) => reward.accessorySlot === "environment");
  const ownedAccessories = ownedInventory.filter((reward) => reward.accessorySlot !== "environment");
  const moodLabel = t(getMoodLabelKey(snapshot.equippedCompanionMood));
  const moodSupport = t(getMoodSupportKey(snapshot.equippedCompanionMood));
  const companionTitle = t(getCompanionTitleKey(spotlightCompanion.companionVariant));
  const habitatMode = preview.environmentKey
    ? t("play.habitatModePreview")
    : activeEnvironmentReward?.equipped
      ? t("play.habitatModeEquipped")
      : t("play.habitatModeDefault");
  const translatedQuests = snapshot.quests.map((quest) => {
    const titleKey = getQuestTitleKey(quest.questKey) as Parameters<ReturnType<typeof useI18n>["t"]>[0];
    const descriptionKey = getQuestDescriptionKey(quest.questKey) as Parameters<ReturnType<typeof useI18n>["t"]>[0];
    const rewardLabelKey = getQuestRewardLabelKey(quest.questKey) as Parameters<ReturnType<typeof useI18n>["t"]>[0];
    const translatedTitle = t(titleKey);
    const translatedDescription = t(descriptionKey);
    const translatedRewardLabel = t(rewardLabelKey);

    return {
      ...quest,
      title: translatedTitle === titleKey ? quest.title : translatedTitle,
      description: translatedDescription === descriptionKey ? quest.description : translatedDescription,
      rewardLabel: translatedRewardLabel === rewardLabelKey ? quest.rewardLabel : translatedRewardLabel,
    };
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-5 py-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border-2 border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-[var(--shadow-button-soft)]">
                Lv {snapshot.profile.level}
              </span>
              <span className="rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-button-soft)]">
                {snapshot.tokens} {t("play.tokens")}
              </span>
              <span className="rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-button-soft)]">
                {snapshot.streak.currentDays}d {t("play.streak")}
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-display text-2xl font-semibold text-foreground">{translateRewardName(spotlightCompanion, t)}</p>
              <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{t("play.moodLabel")}</p>
              <p className="text-sm text-muted-foreground">{t("play.feeling", { mood: moodLabel })}</p>
              <p className="text-sm text-muted-foreground">{moodSupport}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] p-3 shadow-[var(--shadow-clay)]">
            <HabitatPreviewSurface
              scene={activeHabitatScene}
              mood={foxMood}
              companionVariant={spotlightCompanion.companionVariant}
              accessories={equippedAccessories}
              showDetails={false}
              t={t}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 @xs:grid-cols-4">
        <StatChip label={t("play.level")} value={snapshot.profile.level} />
        <StatChip label={t("play.xp")} value={snapshot.profile.xp} suffix={`/${xpForNextLevel}`} />
        <StatChip label={t("play.streak")} value={snapshot.streak.currentDays} suffix={t("common.daysShort")} />
        <StatChip label={t("play.tokens")} value={snapshot.tokens} />
      </div>

      <StreakDisplay streakDays={Math.min(snapshot.streak.currentDays, 7)} />

      <QuestPanel
        quests={translatedQuests}
        activatingQuestKey={activatingQuestKey}
        claimingQuestKey={claimingQuestKey}
        onActivateQuest={activateQuestKey}
        onClaimQuest={claimQuestKey}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
          <div>
            <p className="font-display text-lg font-semibold text-foreground">{t("play.storeTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("play.storeDescription")}</p>
          </div>

          <StoreLane
            title={t("play.storeFeatured")}
            rewards={featured}
            tokens={snapshot.tokens}
            previewRewardKeys={previewRewardKeys}
            onPreviewReward={togglePreviewRewardKey}
            onPurchase={buyRewardKey}
            companionVariant={spotlightCompanion.companionVariant}
            mood={foxMood}
            accessories={equippedAccessories}
          />
          <StoreLane
            title={t("play.storeCompanions")}
            rewards={companions}
            tokens={snapshot.tokens}
            previewRewardKeys={previewRewardKeys}
            onPreviewReward={togglePreviewRewardKey}
            onPurchase={buyRewardKey}
            companionVariant={spotlightCompanion.companionVariant}
            mood={foxMood}
            accessories={equippedAccessories}
          />
          <StoreLane
            title={t("play.storeAccessories")}
            rewards={accessories}
            tokens={snapshot.tokens}
            previewRewardKeys={previewRewardKeys}
            onPreviewReward={togglePreviewRewardKey}
            onPurchase={buyRewardKey}
            companionVariant={spotlightCompanion.companionVariant}
            mood={foxMood}
            accessories={equippedAccessories}
          />
        </section>

        <div className="space-y-4">
          <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{t("play.companionSpotlightTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("play.companionSpotlightDescription")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex justify-center rounded-[1.5rem] border-2 border-primary/15 bg-[color:var(--color-field)] p-4 shadow-[var(--shadow-clay)]">
                <FoxMascot mood={foxMood} size={92} accessories={equippedAccessories} variant={spotlightCompanion.companionVariant} />
              </div>
              <div className="space-y-2">
                <p className="font-display text-xl font-semibold text-foreground">{companionTitle}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(getCompanionPersonalityKey(spotlightCompanion.companionVariant))}</p>
                <div className="space-y-1 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
                  <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{t("play.companionSpotlightBestFor")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t(getCompanionBestForKey(spotlightCompanion.companionVariant))}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{t("play.habitatTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("play.habitatDescription")}</p>
            </div>
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">{habitatMode}</p>
            <div className="rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] p-3 shadow-[var(--shadow-clay)]">
              <HabitatPreviewSurface
                scene={activeHabitatScene}
                mood={foxMood}
                companionVariant={spotlightCompanion.companionVariant}
                accessories={equippedAccessories}
                t={t}
              />
            </div>
          </section>

          <CollectionSection title={t("play.inventoryTitle")} description={t("play.inventoryDescription")}>
            {ownedInventory.length === 0 ? (
              <EmptyState title={t("play.emptyInventory")} description={t("play.emptyInventoryDescription")} mood="cozy" foxSize={68} variant="plain" />
            ) : (
              <div className="space-y-4">
                {ownedHabitats.length > 0 ? (
                  <CollectionSection title={t("play.inventoryHabitatsTitle")} description={t("play.inventoryHabitatsDescription")}>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {ownedHabitats.map((reward) => (
                        <LegacyInventoryCard
                          key={reward.rewardKey}
                          reward={reward}
                          previewSelected={previewRewardKeys.includes(reward.rewardKey)}
                          onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                          onEquip={() => void equipRewardKey(reward.rewardKey)}
                          onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                          companionVariant={spotlightCompanion.companionVariant}
                          mood={foxMood}
                          accessories={equippedAccessories}
                        />
                      ))}
                    </div>
                  </CollectionSection>
                ) : null}

                {ownedAccessories.length > 0 ? (
                  <CollectionSection title={t("play.inventoryAccessoriesTitle")} description={t("play.inventoryAccessoriesDescription")}>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {ownedAccessories.map((reward) => (
                        <LegacyInventoryCard
                          key={reward.rewardKey}
                          reward={reward}
                          previewSelected={previewRewardKeys.includes(reward.rewardKey)}
                          onPreview={() => togglePreviewRewardKey(reward.rewardKey)}
                          onEquip={() => void equipRewardKey(reward.rewardKey)}
                          onUnequip={() => void unequipRewardKey(reward.rewardKey)}
                          companionVariant={spotlightCompanion.companionVariant}
                          mood={foxMood}
                          accessories={equippedAccessories}
                        />
                      ))}
                    </div>
                  </CollectionSection>
                ) : null}
              </div>
            )}
          </CollectionSection>
        </div>
      </div>

      <div className="hidden">{purchasingRewardKey}</div>
    </div>
  );
}

function StatChip({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-3 py-3 text-center shadow-[var(--shadow-card)]">
      <p className="font-display text-lg font-bold text-foreground">
        {value}
        {suffix ? <span className="text-xs font-normal text-muted-foreground">{suffix}</span> : null}
      </p>
      <p className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

export function PlayPage({ payload }: { payload: BootstrapPayload }) {
  return (
    <PlayProvider payload={payload}>
      <LegacyPlayOverview />
    </PlayProvider>
  );
}
