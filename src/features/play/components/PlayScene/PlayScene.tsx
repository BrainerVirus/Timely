import {
  FoxMascot,
  type FoxAccessory,
  type FoxAnimationMode,
  type FoxMood,
  type FoxVariant,
} from "@/shared/components/FoxMascot/FoxMascot";
import { useI18n } from "@/core/services/I18nService/i18n";
import { cn } from "@/shared/utils/utils";

import type { PlaySnapshot } from "@/shared/types/dashboard";
import type { ReactNode } from "react";

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

export function isCompanionReward(
  reward: PlaySnapshot["storeCatalog"][number],
): reward is PlaySnapshot["storeCatalog"][number] & { companionVariant: FoxVariant } {
  return reward.rewardType === "companion" && Boolean(reward.companionVariant);
}

export function isEnvironmentReward(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "accessorySlot">,
) {
  return reward.accessorySlot === "environment";
}

export function isFoxAccessorySlot(
  slot: PlaySnapshot["inventory"][number]["accessorySlot"],
): slot is FoxAccessory["slot"] {
  return slot === "headwear" || slot === "eyewear" || slot === "neckwear" || slot === "charm";
}

export function getEnvironmentHabitatScene(
  reward: Pick<PlaySnapshot["storeCatalog"][number], "environmentSceneKey" | "rewardKey">,
): HabitatSceneKey {
  if (reward.environmentSceneKey) {
    return reward.environmentSceneKey;
  }

  return reward.rewardKey as HabitatSceneKey;
}

export function getRewardSlotLabelKey(slot: PlaySnapshot["storeCatalog"][number]["accessorySlot"]) {
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

export function getThemeTagLabelKey(
  themeTag: NonNullable<PlaySnapshot["storeCatalog"][number]["themeTag"]>,
): ThemeTagKey {
  switch (themeTag) {
    case "craft":
      return "play.themeTag.craft";
    case "recovery":
      return "play.themeTag.recovery";
    default:
      return "play.themeTag.focus";
  }
}

export function getThemeTagClasses(
  themeTag: NonNullable<PlaySnapshot["storeCatalog"][number]["themeTag"]>,
) {
  switch (themeTag) {
    case "craft":
      return "rounded-full border border-orange-200/60 bg-orange-100/60 px-2 py-0.5 text-[0.65rem] font-bold text-orange-700";
    case "recovery":
      return "rounded-full border border-sky-200/65 bg-sky-100/70 px-2 py-0.5 text-[0.65rem] font-bold text-sky-700";
    default:
      return "rounded-full border border-indigo-200/60 bg-indigo-100/65 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-700";
  }
}

export function getRarityBadgeClasses(rarity: PlaySnapshot["storeCatalog"][number]["rarity"]) {
  if (rarity === "epic") {
    return "rounded-full border border-secondary/25 bg-secondary/12 px-2 py-0.5 text-[0.65rem] font-bold text-secondary";
  }

  if (rarity === "rare") {
    return "rounded-full border border-primary/25 bg-primary/12 px-2 py-0.5 text-[0.65rem] font-bold text-primary";
  }

  return "rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground";
}

export function getHabitatTitleKey(scene: HabitatSceneKey) {
  return HABITAT_SCENE_CONFIG[scene].titleKey;
}

function getHabitatDescriptionKey(scene: HabitatSceneKey) {
  return HABITAT_SCENE_CONFIG[scene].descriptionKey;
}

type DetailsCardProps = {
  compact: boolean;
  badgeLabel?: string;
  rewardLabel?: string;
  title?: string;
  description?: string;
  detailsContent?: ReactNode;
  scene: HabitatSceneKey;
  t: ReturnType<typeof useI18n>["t"];
};

function DetailsCard({
  compact,
  badgeLabel,
  rewardLabel,
  title,
  description,
  detailsContent,
  scene,
  t,
}: Readonly<DetailsCardProps>) {
  return (
    <div
      className="max-w-sm rounded-[1.35rem] border-2 border-white/35 p-3 text-foreground shadow-card backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-panel-elevated) 84%, transparent)",
      }}
    >
      {detailsContent ?? (
        <div className="space-y-2">
          {badgeLabel || rewardLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              {badgeLabel ? (
                <span className="rounded-full border border-white/35 bg-white/30 px-2 py-1 text-[0.65rem] font-bold text-foreground/80">
                  {badgeLabel}
                </span>
              ) : null}
              {rewardLabel ? (
                <span className="rounded-full border border-primary/20 bg-primary/14 px-2 py-1 text-[0.65rem] font-bold text-primary">
                  {rewardLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          <p
            className={cn(
              "font-display font-semibold text-foreground",
              compact ? "text-base" : "text-xl",
            )}
          >
            {title ?? t(getHabitatTitleKey(scene))}
          </p>
          <p
            className={cn(
              "text-foreground/80",
              compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed",
            )}
          >
            {description ?? t(getHabitatDescriptionKey(scene))}
          </p>
        </div>
      )}
    </div>
  );
}

type PreviewSurfaceProps = {
  scene: HabitatSceneKey;
  mood: FoxMood;
  companionVariant: FoxVariant;
  accessories: FoxAccessory[];
  size?: "compact" | "full";
  showDetails?: boolean;
  title?: string;
  description?: string;
  badgeLabel?: string;
  rewardLabel?: string;
  detailsContent?: ReactNode;
  mascotSize?: number;
  mascotAnimationMode?: FoxAnimationMode;
  className?: string;
  t: ReturnType<typeof useI18n>["t"];
};

export function HabitatPreviewSurface({
  scene,
  mood,
  companionVariant,
  accessories,
  size = "full",
  showDetails = true,
  title,
  description,
  badgeLabel,
  rewardLabel,
  detailsContent,
  mascotSize,
  mascotAnimationMode = "full",
  className,
  t,
}: Readonly<PreviewSurfaceProps>) {
  const config = HABITAT_SCENE_CONFIG[scene];
  const compact = size === "compact";
  const resolvedMascotSize = mascotSize ?? (compact ? 72 : 92);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border-2 p-4 shadow-clay",
        compact ? "min-h-45" : "min-h-65",
        config.sceneClassName,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute top-3 right-3 h-12 w-12 rounded-full bg-white/45 blur-[2px]" />
        <div className="absolute top-10 left-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
        <div className="absolute right-6 bottom-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
        <div className={config.groundClassName} />
        <div className={config.accentClassName} />
        {config.props.map((prop) => (
          <div
            key={prop.className}
            aria-hidden="true"
            className={prop.className}
            title={t(prop.labelKey)}
          />
        ))}
      </div>

      <div
        className={cn(
          "relative z-10 grid gap-4",
          showDetails && !compact ? "md:grid-cols-[1fr_auto] md:items-end" : "grid-cols-1",
        )}
      >
        {showDetails ? (
          <DetailsCard
            compact={compact}
            badgeLabel={badgeLabel}
            rewardLabel={rewardLabel}
            title={title}
            description={description}
            detailsContent={detailsContent}
            scene={scene}
            t={t}
          />
        ) : null}

        <div className={cn("mx-auto", showDetails ? "md:mx-0 md:justify-self-end" : "")}>
          <FoxMascot
            mood={mood}
            size={resolvedMascotSize}
            accessories={accessories}
            variant={companionVariant}
            animationMode={mascotAnimationMode}
          />
        </div>
      </div>
    </div>
  );
}

type RewardArtPreviewProps = {
  reward: PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number];
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
  showRewardLabel?: boolean;
  t: ReturnType<typeof useI18n>["t"];
};

export function RewardArtPreview({
  reward,
  companionVariant,
  mood,
  accessories,
  showRewardLabel = true,
  t,
}: Readonly<RewardArtPreviewProps>) {
  if ("companionVariant" in reward && isCompanionReward(reward)) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[1.5rem] border-2 border-primary/15 bg-panel-elevated shadow-clay">
        <FoxMascot
          mood={mood}
          size={80}
          accessories={accessories}
          variant={reward.companionVariant}
          animationMode="none"
        />
      </div>
    );
  }

  if (isEnvironmentReward(reward)) {
    return (
      <HabitatPreviewSurface
        scene={getEnvironmentHabitatScene(
          reward as Pick<PlaySnapshot["storeCatalog"][number], "environmentSceneKey" | "rewardKey">,
        )}
        mood={mood}
        companionVariant={companionVariant}
        accessories={accessories}
        size="compact"
        showDetails={false}
        mascotAnimationMode="none"
        rewardLabel={showRewardLabel ? reward.rewardName : undefined}
        t={t}
      />
    );
  }

  const accessorySlot = reward.accessorySlot;
  const previewAccessories = isFoxAccessorySlot(accessorySlot)
    ? [
        ...accessories.filter((item) => item.slot !== accessorySlot),
        { slot: accessorySlot, variant: reward.rewardKey },
      ]
    : accessories;

  return (
    <div className="flex h-32 items-center justify-center rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated shadow-clay">
      <FoxMascot
        mood={mood}
        size={80}
        accessories={previewAccessories}
        variant={companionVariant}
        animationMode="none"
      />
    </div>
  );
}
