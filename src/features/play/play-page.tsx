import Award from "lucide-react/dist/esm/icons/award.js";
import Coins from "lucide-react/dist/esm/icons/coins.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getFoxMoodForCompanionMood } from "@/lib/companion";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { FoxMascot, type FoxAccessory, type FoxMood, type FoxVariant } from "@/components/shared/fox-mascot";
import { StaggerGroup } from "@/components/shared/page-transition";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { springBouncy, staggerContainer, staggerItem, staggerItemScale } from "@/lib/animations";
import {
  activateQuest,
  claimQuestReward,
  equipReward,
  loadPlaySnapshot,
  purchaseReward,
  unequipReward,
} from "@/lib/tauri";

import type { BootstrapPayload, CompanionMood, PlaySnapshot } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

type HabitatSceneKey = FoxVariant | "starlit-camp" | "sunlit-studio" | "rainy-retreat";
type HabitatPropLabelKey =
  | "play.habitat.propLantern"
  | "play.habitat.propDesk"
  | "play.habitat.propSnowDrift"
  | "play.habitat.propGlowRing"
  | "play.habitat.propWindow"
  | "play.habitat.propCushion";

type HabitatTitleKey =
  | "play.habitat.aurora.title"
  | "play.habitat.arctic.title"
  | "play.habitat.kitsune.title"
  | "play.habitat.starlitCamp.title"
  | "play.habitat.sunlitStudio.title"
  | "play.habitat.rainyRetreat.title";

type HabitatDescriptionKey =
  | "play.habitat.aurora.description"
  | "play.habitat.arctic.description"
  | "play.habitat.kitsune.description"
  | "play.habitat.starlitCamp.description"
  | "play.habitat.sunlitStudio.description"
  | "play.habitat.rainyRetreat.description";

type ThemeTagKey = "play.themeTag.focus" | "play.themeTag.craft" | "play.themeTag.recovery";

type HabitatProp = {
  className: string;
  labelKey: HabitatPropLabelKey;
};

type HabitatSceneConfig = {
  titleKey: HabitatTitleKey;
  descriptionKey: HabitatDescriptionKey;
  sceneClassName: string;
  groundClassName: string;
  accentClassName: string;
  props: HabitatProp[];
};

const primaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-primary) 14%, var(--color-panel-elevated))",
};

const secondaryTintSurface = {
  backgroundColor: "color-mix(in oklab, var(--color-secondary) 16%, var(--color-panel-elevated))",
};

const HABITAT_SCENE_CONFIG: Record<HabitatSceneKey, HabitatSceneConfig> = {
  aurora: {
    titleKey: "play.habitat.aurora.title",
    descriptionKey: "play.habitat.aurora.description",
    sceneClassName:
      "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(234,245,228,0.98)_0%,rgba(209,233,206,0.95)_58%,rgba(196,223,180,0.97)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-20 rounded-t-[42%] bg-[linear-gradient(180deg,rgba(191,223,168,0.5)_0%,rgba(160,202,136,0.92)_100%)]",
    accentClassName: "absolute bottom-6 left-5 h-12 w-24 rounded-full bg-emerald-200/50 blur-[1px]",
    props: [
      {
        className:
          "absolute bottom-9 left-6 h-10 w-10 rounded-full border border-emerald-100/60 bg-emerald-100/35 shadow-[0_8px_22px_rgba(103,168,120,0.16)]",
        labelKey: "play.habitat.propGlowRing",
      },
    ],
  },
  arctic: {
    titleKey: "play.habitat.arctic.title",
    descriptionKey: "play.habitat.arctic.description",
    sceneClassName:
      "border-sky-200/70 bg-[linear-gradient(180deg,rgba(242,249,255,0.96)_0%,rgba(217,236,252,0.92)_52%,rgba(228,240,250,0.95)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-20 rounded-t-[40%] bg-[linear-gradient(180deg,rgba(235,245,255,0.65)_0%,rgba(221,236,252,0.96)_100%)]",
    accentClassName: "absolute bottom-7 left-5 h-10 w-28 rounded-full bg-white/55 blur-[1px]",
    props: [
      {
        className:
          "absolute bottom-9 left-7 h-8 w-20 rounded-full border border-white/65 bg-white/45 shadow-[0_10px_22px_rgba(255,255,255,0.22)]",
        labelKey: "play.habitat.propSnowDrift",
      },
    ],
  },
  kitsune: {
    titleKey: "play.habitat.kitsune.title",
    descriptionKey: "play.habitat.kitsune.description",
    sceneClassName:
      "border-amber-200/65 bg-[linear-gradient(180deg,rgba(53,39,82,0.95)_0%,rgba(109,74,124,0.92)_54%,rgba(223,140,87,0.82)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-24 rounded-t-[42%] bg-[linear-gradient(180deg,rgba(84,54,79,0.08)_0%,rgba(72,48,73,0.58)_45%,rgba(54,36,58,0.82)_100%)]",
    accentClassName:
      "absolute right-10 bottom-8 h-14 w-14 rounded-full border border-amber-100/50 bg-amber-100/20 blur-[1px]",
    props: [
      {
        className:
          "absolute top-7 left-8 h-10 w-10 rounded-full border border-amber-100/45 bg-amber-100/15 shadow-[0_0_24px_rgba(255,196,112,0.28)]",
        labelKey: "play.habitat.propGlowRing",
      },
    ],
  },
  "starlit-camp": {
    titleKey: "play.habitat.starlitCamp.title",
    descriptionKey: "play.habitat.starlitCamp.description",
    sceneClassName:
      "border-indigo-200/50 bg-[linear-gradient(180deg,rgba(30,34,69,0.96)_0%,rgba(53,65,109,0.94)_52%,rgba(111,80,116,0.9)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-24 rounded-t-[42%] bg-[linear-gradient(180deg,rgba(35,54,68,0.18)_0%,rgba(30,48,58,0.64)_38%,rgba(24,38,46,0.88)_100%)]",
    accentClassName:
      "absolute right-8 bottom-8 h-12 w-12 rounded-full border border-amber-100/50 bg-amber-100/25 shadow-[0_0_30px_rgba(255,214,128,0.45)]",
    props: [
      {
        className:
          "absolute bottom-10 left-7 h-12 w-10 rounded-[1rem] border border-amber-100/60 bg-[linear-gradient(180deg,rgba(255,231,176,0.92)_0%,rgba(164,117,69,0.88)_100%)] shadow-[0_0_28px_rgba(255,211,130,0.4)]",
        labelKey: "play.habitat.propLantern",
      },
    ],
  },
  "sunlit-studio": {
    titleKey: "play.habitat.sunlitStudio.title",
    descriptionKey: "play.habitat.sunlitStudio.description",
    sceneClassName:
      "border-orange-200/60 bg-[linear-gradient(180deg,rgba(255,246,229,0.98)_0%,rgba(248,225,196,0.94)_52%,rgba(226,196,162,0.96)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-24 rounded-t-[42%] bg-[linear-gradient(180deg,rgba(214,175,135,0.18)_0%,rgba(202,156,115,0.62)_38%,rgba(171,124,88,0.86)_100%)]",
    accentClassName:
      "absolute right-8 bottom-8 h-14 w-14 rounded-2xl border border-orange-100/65 bg-white/30 shadow-[0_8px_24px_rgba(212,145,86,0.22)]",
    props: [
      {
        className:
          "absolute bottom-10 left-6 h-14 w-24 rounded-[1.2rem] border border-orange-100/70 bg-[linear-gradient(180deg,rgba(255,249,240,0.96)_0%,rgba(222,191,158,0.96)_100%)] shadow-[0_10px_24px_rgba(181,128,83,0.18)]",
        labelKey: "play.habitat.propDesk",
      },
    ],
  },
  "rainy-retreat": {
    titleKey: "play.habitat.rainyRetreat.title",
    descriptionKey: "play.habitat.rainyRetreat.description",
    sceneClassName:
      "border-slate-200/70 bg-[linear-gradient(180deg,rgba(226,235,243,0.98)_0%,rgba(194,209,221,0.94)_52%,rgba(142,159,176,0.96)_100%)]",
    groundClassName:
      "absolute right-0 bottom-0 left-0 h-24 rounded-t-[42%] bg-[linear-gradient(180deg,rgba(98,112,128,0.14)_0%,rgba(86,101,118,0.46)_38%,rgba(69,82,98,0.82)_100%)]",
    accentClassName:
      "absolute top-5 right-7 h-16 w-16 rounded-[1.5rem] border border-white/45 bg-white/20 shadow-[0_10px_28px_rgba(111,132,162,0.2)]",
    props: [
      {
        className:
          "absolute top-6 left-7 h-16 w-20 rounded-[1.25rem] border border-white/50 bg-[linear-gradient(180deg,rgba(242,247,252,0.72)_0%,rgba(191,207,221,0.36)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
        labelKey: "play.habitat.propWindow",
      },
      {
        className:
          "absolute bottom-9 left-10 h-8 w-16 rounded-full bg-[linear-gradient(180deg,rgba(223,196,166,0.92)_0%,rgba(177,143,116,0.96)_100%)] shadow-[0_10px_24px_rgba(91,74,58,0.16)]",
        labelKey: "play.habitat.propCushion",
      },
    ],
  },
};

export function PlayPage({ payload }: { payload: BootstrapPayload }) {
  const { t } = useI18n();
  const [playSnapshot, setPlaySnapshot] = useState<PlaySnapshot | null>(null);
  const [selectedCompanionKey, setSelectedCompanionKey] = useState<string | null>(null);
  const [selectedEnvironmentKey, setSelectedEnvironmentKey] = useState<string | null>(null);
  const [activatingQuestKey, setActivatingQuestKey] = useState<string | null>(null);
  const [claimingQuestKey, setClaimingQuestKey] = useState<string | null>(null);
  const [purchasingRewardKey, setPurchasingRewardKey] = useState<string | null>(null);
  const [equippingRewardKey, setEquippingRewardKey] = useState<string | null>(null);
  const [unequippingRewardKey, setUnequippingRewardKey] = useState<string | null>(null);

  useEffect(() => {
    void loadPlaySnapshot().then(setPlaySnapshot);
  }, []);

  const current: PlaySnapshot = playSnapshot ?? {
      profile: payload.profile,
      streak: payload.streak,
      quests: [],
      tokens: 0,
      equippedCompanionMood: "calm" as CompanionMood,
      storeCatalog: [],
      inventory: [],
  };

  const foxMood: FoxMood = getFoxMoodForCompanionMood(current.equippedCompanionMood);
  const xpForNextLevel = (current.profile.level + 1) * 100;
  const xpRatio = Math.min(current.profile.xp / xpForNextLevel, 1);
  const moodLabel = t(getMoodLabelKey(current.equippedCompanionMood));
  const moodSupport = t(getMoodSupportKey(current.equippedCompanionMood));
  const companionRewards = current.storeCatalog.filter(isCompanionReward);
  const environmentRewards = current.storeCatalog.filter(isEnvironmentReward);
  const equippedAccessories: FoxAccessory[] = current.inventory
    .filter((reward) => reward.equipped && isFoxAccessorySlot(reward.accessorySlot))
    .map((reward) => ({
      slot: reward.accessorySlot as FoxAccessory["slot"],
      variant: reward.rewardKey,
    }));
  const equippedCompanionVariant =
    (current.storeCatalog.find((reward) => reward.rewardType === "companion" && reward.equipped)
      ?.companionVariant as FoxVariant | undefined) ?? ("aurora" as FoxVariant);
  const equippedCompanionReward = companionRewards.find((reward) => reward.equipped);
  const selectedCompanionReward = companionRewards.find((reward) => reward.rewardKey === selectedCompanionKey);
  const equippedEnvironmentReward = environmentRewards.find((reward) => reward.equipped);
  const selectedEnvironmentReward = environmentRewards.find((reward) => reward.rewardKey === selectedEnvironmentKey);
  const ownedInventory = current.inventory.filter((reward) => reward.owned);
  const ownedEnvironmentInventory = ownedInventory.filter((reward) => reward.accessorySlot === "environment");
  const ownedAccessoryInventory = ownedInventory.filter((reward) => reward.accessorySlot !== "environment");
  const spotlightCompanion =
    selectedCompanionReward ??
    equippedCompanionReward ??
    getDefaultCompanionSpotlight(current.profile.companion ?? "Fox", equippedCompanionVariant);
  const habitatScene = selectedEnvironmentReward
    ? getEnvironmentHabitatScene(selectedEnvironmentReward)
    : equippedEnvironmentReward
      ? getEnvironmentHabitatScene(equippedEnvironmentReward)
      : spotlightCompanion.companionVariant;
  const habitatBadgeLabel = selectedEnvironmentReward?.equipped || equippedEnvironmentReward
      ? t("play.habitatModeEquipped")
      : selectedEnvironmentReward
        ? t("play.habitatModePreview")
        : t("play.habitatModeDefault");
  const habitatBadgeTone =
    selectedEnvironmentReward || equippedEnvironmentReward ? "primary" : "secondary";
  const habitatProps = getHabitatProps(habitatScene);

  useEffect(() => {
    if (selectedCompanionKey && !companionRewards.some((reward) => reward.rewardKey === selectedCompanionKey)) {
      setSelectedCompanionKey(null);
    }
  }, [companionRewards, selectedCompanionKey]);

  useEffect(() => {
    if (
      selectedEnvironmentKey &&
      !environmentRewards.some((reward) => reward.rewardKey === selectedEnvironmentKey)
    ) {
      setSelectedEnvironmentKey(null);
    }
  }, [environmentRewards, selectedEnvironmentKey]);

  async function handleActivateQuest(questKey: string) {
    try {
      setActivatingQuestKey(questKey);
      const nextSnapshot = await activateQuest({ questKey });
      setPlaySnapshot(nextSnapshot);
      const activatedQuest = nextSnapshot.quests.find((quest) => quest.questKey === questKey);

      toast.success(t("gamification.toastQuestActivatedTitle"), {
        description: t("gamification.toastQuestActivatedDescription", {
          title: activatedQuest?.title ?? questKey,
        }),
        duration: 3500,
      });
    } catch (error) {
      toast.error(t("gamification.toastQuestActivationFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setActivatingQuestKey(null);
    }
  }

  async function handleClaimQuest(questKey: string) {
    try {
      setClaimingQuestKey(questKey);
      const nextSnapshot = await claimQuestReward({ questKey });
      setPlaySnapshot(nextSnapshot);
      const claimedQuest = nextSnapshot.quests.find((quest) => quest.questKey === questKey);
      const isAchievement = claimedQuest?.cadence === "achievement";

      toast.success(
        isAchievement
          ? t("gamification.toastAchievementUnlockedTitle")
          : t("gamification.toastRewardClaimedTitle"),
        {
          description: t("gamification.toastRewardClaimedDescription", {
            title: claimedQuest?.title ?? questKey,
          }),
          duration: isAchievement ? 5500 : 4000,
        },
      );
    } catch (error) {
      toast.error(t("gamification.toastQuestClaimFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setClaimingQuestKey(null);
    }
  }

  async function handlePurchaseReward(rewardKey: string) {
    try {
      setPurchasingRewardKey(rewardKey);
      const nextSnapshot = await purchaseReward({ rewardKey });
      setPlaySnapshot(nextSnapshot);
      const purchasedReward = nextSnapshot.inventory.find((reward) => reward.rewardKey === rewardKey);

      toast.success(t("play.toastPurchaseTitle"), {
        description: t("play.toastPurchaseDescription", {
          title: purchasedReward?.rewardName ?? rewardKey,
        }),
        duration: 4000,
      });
    } catch (error) {
      toast.error(t("play.toastPurchaseFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setPurchasingRewardKey(null);
    }
  }

  async function handleEquipReward(rewardKey: string) {
    try {
      setEquippingRewardKey(rewardKey);
      const nextSnapshot = await equipReward({ rewardKey });
      setPlaySnapshot(nextSnapshot);
      const equippedReward = nextSnapshot.inventory.find((reward) => reward.rewardKey === rewardKey);

      toast.success(t("play.toastEquipTitle"), {
        description: t("play.toastEquipDescription", {
          title: equippedReward?.rewardName ?? rewardKey,
        }),
        duration: 3500,
      });
    } catch (error) {
      toast.error(t("play.toastEquipFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setEquippingRewardKey(null);
    }
  }

  async function handleUnequipReward(rewardKey: string) {
    try {
      setUnequippingRewardKey(rewardKey);
      const nextSnapshot = await unequipReward({ rewardKey });
      setPlaySnapshot(nextSnapshot);
      const unequippedReward = nextSnapshot.inventory.find((reward) => reward.rewardKey === rewardKey);

      toast.success(t("play.toastUnequipTitle"), {
        description: t("play.toastUnequipDescription", {
          title: unequippedReward?.rewardName ?? rewardKey,
        }),
        duration: 3200,
      });
    } catch (error) {
      toast.error(t("play.toastUnequipFailedTitle"), {
        description: error instanceof Error ? error.message : String(error),
        duration: 4500,
      });
    } finally {
      setUnequippingRewardKey(null);
    }
  }

  return (
    <m.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 bg-[color:var(--color-page-canvas)]"
    >
      {/* ─── Hero: Fox + Level Ring ─── */}
      <m.div
        variants={staggerItem}
        className="rounded-[1.75rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-5 py-5 shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
        {/* Fox in a level-ring container */}
        <div className="relative mx-auto md:mx-0">
          {/* Outer clay circle */}
          <div
            className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/15 shadow-[var(--shadow-card)]"
            style={primaryTintSurface}
          >
            <FoxMascot
              mood={foxMood}
              size={88}
              accessories={equippedAccessories}
              variant={equippedCompanionVariant}
            />
          </div>

          {/* XP progress ring overlay */}
          <svg
            className="pointer-events-none absolute inset-0 -rotate-90"
            viewBox="0 0 144 144"
            aria-hidden="true"
          >
            <circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary/10"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <m.circle
              cx="72"
              cy="72"
              r="68"
              className="fill-none stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 68}
              initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 68 - 2 * Math.PI * 68 * xpRatio,
              }}
              transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.3 }}
            />
          </svg>

          {/* Level badge */}
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springBouncy, delay: 0.2 }}
            className="absolute -right-1 -bottom-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-primary/30 shadow-[var(--shadow-card)]"
            style={primaryTintSurface}
          >
            <span className="font-display text-sm font-bold text-primary">
              {current.profile.level}
            </span>
          </m.div>
        </div>

        {/* Companion name + mood */}
        <div className="space-y-3 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {t("play.moodLabel")}
            </p>
            <p className="font-display text-xl font-semibold text-foreground">
              {current.profile.companion ?? "Fox"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("play.feeling", { mood: moodLabel })}
            </p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            {moodSupport}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <MoodBadge label={moodLabel} tone="primary" />
            <MoodBadge label={`${current.streak.currentDays}d ${t("play.streak")}`} tone="secondary" />
            <MoodBadge label={`Lv ${current.profile.level}`} tone="secondary" />
          </div>
        </div>
        </div>
      </m.div>

      {/* ─── Stats Grid ─── */}
      <StaggerGroup className="grid grid-cols-2 gap-2 @xs:grid-cols-4">
        <StatChip
          icon={Award}
          label={t("play.level")}
          value={current.profile.level}
          color="primary"
        />
        <StatChip
          icon={Sparkles}
          label={t("play.xp")}
          value={current.profile.xp}
          suffix={`/${xpForNextLevel}`}
          color="secondary"
        />
        <StatChip
          icon={Flame}
          label={t("play.streak")}
          value={current.streak.currentDays}
          suffix="d"
          color="primary"
        />
        <StatChip
          icon={Coins}
          label={t("play.tokens")}
          value={current.tokens}
          color="secondary"
        />
      </StaggerGroup>

      {/* ─── Streak ─── */}
      <m.div variants={staggerItem}>
        <StreakDisplay streakDays={Math.min(current.streak.currentDays, 7)} />
      </m.div>

      {/* ─── Quests ─── */}
      <m.div variants={staggerItem}>
        {current.quests.length > 0 ? (
          <QuestPanel
            quests={current.quests}
            activatingQuestKey={activatingQuestKey}
            claimingQuestKey={claimingQuestKey}
            onActivateQuest={handleActivateQuest}
            onClaimQuest={handleClaimQuest}
          />
        ) : (
          <EmptyState
            title={t("play.noActiveQuests")}
            description={t("play.noActiveQuestsDescription")}
            mood="idle"
            foxSize={80}
          />
        )}
      </m.div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <m.section
          variants={staggerItem}
          className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]"
        >
          <div>
            <p className="font-display text-lg font-semibold text-foreground">{t("play.storeTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("play.storeDescription")}</p>
          </div>

          <div className="space-y-4">
            <StoreSection
              title={t("play.storeFeatured")}
              description={t("play.storeFeaturedDescription")}
              rewards={current.storeCatalog.filter((reward) => reward.storeSection === "featured")}
              tokens={current.tokens}
              purchasingRewardKey={purchasingRewardKey}
              onPurchase={handlePurchaseReward}
              selectedRewardKey={selectedEnvironmentKey ?? equippedEnvironmentReward?.rewardKey ?? null}
              onSelectReward={setSelectedEnvironmentKey}
              t={t}
            />
            <StoreSection
              title={t("play.storeCompanions")}
              description={t("play.storeCompanionsDescription")}
              rewards={current.storeCatalog.filter((reward) => reward.storeSection === "companions")}
              tokens={current.tokens}
              purchasingRewardKey={purchasingRewardKey}
              onPurchase={handlePurchaseReward}
              selectedRewardKey={selectedCompanionKey ?? spotlightCompanion.rewardKey}
              onSelectReward={setSelectedCompanionKey}
              t={t}
            />
            <StoreSection
              title={t("play.storeAccessories")}
              description={t("play.storeAccessoriesDescription")}
              rewards={current.storeCatalog.filter((reward) => reward.storeSection === "accessories")}
              tokens={current.tokens}
              purchasingRewardKey={purchasingRewardKey}
              onPurchase={handlePurchaseReward}
              t={t}
            />
          </div>
        </m.section>

        <div className="space-y-4">
          <m.section
            variants={staggerItem}
            className="space-y-4 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{t("play.companionSpotlightTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("play.companionSpotlightDescription")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
              <div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-[1.75rem] border-2 border-primary/20 shadow-[var(--shadow-card)] md:mx-0"
                style={primaryTintSurface}
              >
                <FoxMascot
                  mood={foxMood}
                  size={80}
                  accessories={equippedAccessories}
                  variant={spotlightCompanion.companionVariant}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {spotlightCompanion.rewardName}
                    </p>
                    <span className={getRarityBadgeClasses(spotlightCompanion.rarity)}>
                      {t(`play.rarity.${spotlightCompanion.rarity}` as const)}
                    </span>
                    <span className={getCompanionStatusClasses(spotlightCompanion)}>
                      {t(getCompanionStatusKey(spotlightCompanion))}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t(getCompanionVariantTitleKey(spotlightCompanion.companionVariant))}
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
                  {t(getCompanionVariantPersonalityKey(spotlightCompanion.companionVariant))}
                </p>

                <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]">
                  <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                    {t("play.companionSpotlightBestFor")}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {t(getCompanionVariantBestForKey(spotlightCompanion.companionVariant))}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">{t("play.companionSpotlightHint")}</p>
              </div>
            </div>
          </m.section>

          <m.section
            variants={staggerItem}
            className="space-y-4 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{t("play.habitatTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("play.habitatDescription")}</p>
            </div>

            <div
              className={cn(
                "relative overflow-hidden rounded-[1.75rem] border-2 p-4 shadow-[var(--shadow-clay)]",
                getHabitatSceneClasses(habitatScene),
              )}
            >
              <div className="pointer-events-none absolute inset-0 opacity-90">
                <div className="absolute top-3 right-3 h-12 w-12 rounded-full bg-white/45 blur-[2px]" />
                <div className="absolute top-10 left-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
                <div className="absolute right-6 bottom-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                <div className={getHabitatGroundClasses(habitatScene)} />
                <div className={getHabitatAccentShapeClasses(habitatScene)} />
                {habitatProps.map((prop) => (
                  <div
                    key={prop.className}
                    aria-hidden="true"
                    className={prop.className}
                    title={t(prop.labelKey)}
                  />
                ))}
              </div>

                <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="max-w-sm space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.68rem] font-bold tracking-[0.18em] text-foreground/65 uppercase">
                      {t("play.habitatNowShowing")}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[0.65rem] font-bold",
                        habitatBadgeTone === "primary"
                          ? "bg-primary/15 text-primary"
                          : "bg-white/45 text-foreground/65",
                      )}
                    >
                      {habitatBadgeLabel}
                    </span>
                    {selectedEnvironmentReward || equippedEnvironmentReward ? (
                      <span className="rounded-full bg-white/45 px-2 py-1 text-[0.65rem] font-bold text-foreground/70">
                        {(selectedEnvironmentReward ?? equippedEnvironmentReward)?.rewardName}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-display text-xl font-semibold text-foreground">
                    {t(getHabitatTitleKey(habitatScene))}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {t(getHabitatDescriptionKey(habitatScene))}
                  </p>
                </div>

                <div className="mx-auto md:mx-0">
                  <FoxMascot
                    mood={foxMood}
                    size={92}
                    accessories={equippedAccessories}
                    variant={spotlightCompanion.companionVariant}
                  />
                </div>
              </div>
            </div>
          </m.section>

          <m.section
            variants={staggerItem}
            className="space-y-3 rounded-[1.5rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{t("play.inventoryTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("play.inventoryDescription")}</p>
            </div>

            {ownedInventory.length > 0 ? (
              <div className="space-y-4">
                {ownedEnvironmentInventory.length > 0 ? (
                  <InventorySection
                    title={t("play.inventoryHabitatsTitle")}
                    description={t("play.inventoryHabitatsDescription")}
                    rewards={ownedEnvironmentInventory}
                    equippingRewardKey={equippingRewardKey}
                    unequippingRewardKey={unequippingRewardKey}
                    onEquip={handleEquipReward}
                    onUnequip={handleUnequipReward}
                    t={t}
                  />
                ) : null}

                {ownedAccessoryInventory.length > 0 ? (
                  <InventorySection
                    title={t("play.inventoryAccessoriesTitle")}
                    description={t("play.inventoryAccessoriesDescription")}
                    rewards={ownedAccessoryInventory}
                    equippingRewardKey={equippingRewardKey}
                    unequippingRewardKey={unequippingRewardKey}
                    onEquip={handleEquipReward}
                    onUnequip={handleUnequipReward}
                    t={t}
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                title={t("play.emptyInventory")}
                description={t("play.emptyInventoryDescription")}
                mood="cozy"
                foxSize={68}
                variant="plain"
              />
            )}
          </m.section>
        </div>
      </div>
    </m.div>
  );
}

function isCompanionReward(
  reward: PlaySnapshot["storeCatalog"][number],
): reward is PlaySnapshot["storeCatalog"][number] & { companionVariant: FoxVariant } {
  return reward.rewardType === "companion" && Boolean(reward.companionVariant);
}

function isEnvironmentReward(reward: PlaySnapshot["storeCatalog"][number]) {
  return reward.accessorySlot === "environment";
}

function isFoxAccessorySlot(slot: PlaySnapshot["inventory"][number]["accessorySlot"]): slot is FoxAccessory["slot"] {
  return slot === "headwear" || slot === "eyewear" || slot === "neckwear" || slot === "charm";
}

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

function MoodBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "secondary";
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/25 bg-primary/10 text-primary"
      : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground";

  return (
    <span className={`rounded-full border-2 px-3 py-1 text-xs font-semibold shadow-[var(--shadow-button-soft)] ${toneClasses}`}>
      {label}
    </span>
  );
}

function StoreSection({
  title,
  description,
  rewards,
  tokens,
  purchasingRewardKey,
  onPurchase,
  selectedRewardKey,
  onSelectReward,
  t,
}: {
  title: string;
  description: string;
  rewards: PlaySnapshot["storeCatalog"];
  tokens: number;
  purchasingRewardKey: string | null;
  onPurchase: (rewardKey: string) => Promise<void>;
  selectedRewardKey?: string | null;
  onSelectReward?: (rewardKey: string) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        {rewards.map((reward) => {
          const isSelected = selectedRewardKey === reward.rewardKey;
          const canPreview = isPreviewableReward(reward) && Boolean(onSelectReward);

          return (
            <div
              key={reward.rewardKey}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border-2 bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)] transition-colors",
                isSelected
                  ? "border-primary/35 bg-primary/10"
                  : "border-[color:var(--color-border-subtle)]",
              )}
            >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{reward.rewardName}</p>
                    <span className={getRarityBadgeClasses(reward.rarity)}>{t(`play.rarity.${reward.rarity}` as const)}</span>
                    {isEnvironmentReward(reward) && reward.themeTag ? (
                      <span className={getThemeTagClasses(reward.themeTag)}>
                        {t(getThemeTagLabelKey(reward.themeTag))}
                      </span>
                    ) : null}
                  </div>
                <p className="text-xs text-muted-foreground">
                  {t(getRewardSlotLabelKey(reward.accessorySlot))} - {reward.costTokens} {t("play.tokens")}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {canPreview ? (
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border-2 px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-button-soft)] active:translate-y-[1px] active:shadow-none",
                      isSelected
                        ? "border-primary/35 bg-primary/12 text-primary"
                        : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] text-muted-foreground",
                    )}
                    onClick={() => onSelectReward?.(reward.rewardKey)}
                  >
                    {isSelected ? t("play.previewing") : t("play.preview")}
                  </button>
                ) : null}

                {reward.owned ? (
                  <span className="rounded-full bg-secondary/10 px-2 py-1 text-[0.65rem] font-bold text-secondary">
                    {reward.equipped ? t("gamification.activeNow") : t("play.owned")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl border-2 border-primary/35 bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary shadow-[var(--shadow-button-soft)] active:translate-y-[1px] active:shadow-none"
                    disabled={purchasingRewardKey === reward.rewardKey || tokens < reward.costTokens}
                    onClick={() => void onPurchase(reward.rewardKey)}
                  >
                    {t("play.buy")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventorySection({
  title,
  description,
  rewards,
  equippingRewardKey,
  unequippingRewardKey,
  onEquip,
  onUnequip,
  t,
}: {
  title: string;
  description: string;
  rewards: PlaySnapshot["inventory"];
  equippingRewardKey: string | null;
  unequippingRewardKey: string | null;
  onEquip: (rewardKey: string) => Promise<void>;
  onUnequip: (rewardKey: string) => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        {rewards.map((reward) => (
          <div
            key={reward.rewardKey}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-3 shadow-[var(--shadow-clay)]"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{reward.rewardName}</p>
              <p className="text-xs text-muted-foreground">{t(getRewardSlotLabelKey(reward.accessorySlot))}</p>
            </div>

            {reward.equipped ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary">
                  {t("gamification.activeNow")}
                </span>
                <button
                  type="button"
                  className="rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-[var(--shadow-button-soft)]"
                  disabled={unequippingRewardKey === reward.rewardKey}
                  onClick={() => void onUnequip(reward.rewardKey)}
                >
                  {t("play.unequip")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="rounded-xl border-2 border-primary/35 bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary shadow-[var(--shadow-button-soft)]"
                disabled={equippingRewardKey === reward.rewardKey || unequippingRewardKey === reward.rewardKey}
                onClick={() => void onEquip(reward.rewardKey)}
              >
                {t("play.equip")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getRarityBadgeClasses(rarity: PlaySnapshot["storeCatalog"][number]["rarity"]) {
  if (rarity === "epic") {
    return "rounded-full border border-secondary/25 bg-secondary/12 px-2 py-0.5 text-[0.65rem] font-bold text-secondary";
  }

  if (rarity === "rare") {
    return "rounded-full border border-primary/25 bg-primary/12 px-2 py-0.5 text-[0.65rem] font-bold text-primary";
  }

  return "rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground";
}

function getCompanionStatusKey(companion: {
  equipped: boolean;
  owned: boolean;
}) {
  if (companion.equipped) {
    return "gamification.activeNow" as const;
  }

  if (companion.owned) {
    return "play.owned" as const;
  }

  return "play.available" as const;
}

function getCompanionStatusClasses(companion: {
  equipped: boolean;
  owned: boolean;
}) {
  if (companion.equipped) {
    return "rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary";
  }

  if (companion.owned) {
    return "rounded-full bg-secondary/10 px-2 py-1 text-[0.65rem] font-bold text-secondary";
  }

  return "rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-2 py-1 text-[0.65rem] font-bold text-muted-foreground";
}

function getCompanionVariantTitleKey(variant: FoxVariant) {
  switch (variant) {
    case "arctic":
      return "play.companionVariant.arctic.title" as const;
    case "kitsune":
      return "play.companionVariant.kitsune.title" as const;
    default:
      return "play.companionVariant.aurora.title" as const;
  }
}

function getCompanionVariantPersonalityKey(variant: FoxVariant) {
  switch (variant) {
    case "arctic":
      return "play.companionVariant.arctic.personality" as const;
    case "kitsune":
      return "play.companionVariant.kitsune.personality" as const;
    default:
      return "play.companionVariant.aurora.personality" as const;
  }
}

function getCompanionVariantBestForKey(variant: FoxVariant) {
  switch (variant) {
    case "arctic":
      return "play.companionVariant.arctic.bestFor" as const;
    case "kitsune":
      return "play.companionVariant.kitsune.bestFor" as const;
    default:
      return "play.companionVariant.aurora.bestFor" as const;
  }
}

function getHabitatTitleKey(scene: HabitatSceneKey): HabitatTitleKey {
  return HABITAT_SCENE_CONFIG[scene].titleKey;
}

function getHabitatDescriptionKey(scene: HabitatSceneKey): HabitatDescriptionKey {
  return HABITAT_SCENE_CONFIG[scene].descriptionKey;
}

function getHabitatSceneClasses(scene: HabitatSceneKey) {
  return HABITAT_SCENE_CONFIG[scene].sceneClassName;
}

function getHabitatGroundClasses(scene: HabitatSceneKey) {
  return HABITAT_SCENE_CONFIG[scene].groundClassName;
}

function getHabitatAccentShapeClasses(scene: HabitatSceneKey) {
  return HABITAT_SCENE_CONFIG[scene].accentClassName;
}

function getHabitatProps(scene: HabitatSceneKey): HabitatProp[] {
  return HABITAT_SCENE_CONFIG[scene].props;
}

function getEnvironmentHabitatScene(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "environmentSceneKey" | "rewardKey">,
): HabitatSceneKey {
  if (reward.environmentSceneKey) {
    return reward.environmentSceneKey;
  }

  return reward.rewardKey as HabitatSceneKey;
}

function isPreviewableReward(reward: PlaySnapshot["storeCatalog"][number]) {
  return isCompanionReward(reward) || isEnvironmentReward(reward);
}

function getRewardSlotLabelKey(slot: PlaySnapshot["storeCatalog"][number]["accessorySlot"]) {
  switch (slot) {
    case "headwear":
      return "play.slot.headwear" as const;
    case "eyewear":
      return "play.slot.eyewear" as const;
    case "neckwear":
      return "play.slot.neckwear" as const;
    case "charm":
      return "play.slot.charm" as const;
    case "environment":
      return "play.slot.environment" as const;
    default:
      return "play.slot.companion" as const;
  }
}

function getThemeTagLabelKey(
  themeTag: NonNullable<PlaySnapshot["storeCatalog"][number]["themeTag"]>,
): ThemeTagKey {
  switch (themeTag) {
    case "craft":
      return "play.themeTag.craft" as const;
    case "recovery":
      return "play.themeTag.recovery" as const;
    default:
      return "play.themeTag.focus" as const;
  }
}

function getThemeTagClasses(themeTag: NonNullable<PlaySnapshot["storeCatalog"][number]["themeTag"]>) {
  switch (themeTag) {
    case "craft":
      return "rounded-full border border-orange-200/60 bg-orange-100/60 px-2 py-0.5 text-[0.65rem] font-bold text-orange-700";
    case "recovery":
      return "rounded-full border border-sky-200/65 bg-sky-100/70 px-2 py-0.5 text-[0.65rem] font-bold text-sky-700";
    default:
      return "rounded-full border border-indigo-200/60 bg-indigo-100/65 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-700";
  }
}

/* ------------------------------------------------------------------ */
/*  Stat Chip with animated counter                                    */
/* ------------------------------------------------------------------ */

function StatChip({
  icon: Icon,
  label,
  value,
  suffix,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  color?: "primary" | "secondary";
}) {
  const motionValue = useMotionValue(0);
  const displayText = useTransform(motionValue, (v) =>
    Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1),
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: 60,
      damping: 20,
    });
    return controls.stop;
  }, [value, motionValue]);

  const colorClasses =
    color === "primary"
      ? "border-primary/20 text-primary"
      : "border-secondary/20 text-secondary";
  const tintSurfaceStyle = color === "primary" ? primaryTintSurface : secondaryTintSurface;

  return (
    <m.div
      variants={staggerItemScale}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-3 py-3 shadow-[var(--shadow-card)]"
    >
      <div
        className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${colorClasses}`}
        style={tintSurfaceStyle}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-center">
        <span className="font-display text-lg font-bold tabular-nums text-foreground leading-none">
          <m.span>{displayText}</m.span>
          {suffix ? (
            <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </span>
      </div>
      <span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </m.div>
  );
}
