import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  HABITAT_SCENE_CONFIG,
  getEnvironmentHabitatScene,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
  type HabitatSceneKey,
} from "@/features/play/lib/play-scene-helpers/play-scene-helpers";
import { PlaySceneDetailsCard } from "@/features/play/ui/PlayScene/internal/PlaySceneDetailsCard";
import { cn } from "@/shared/lib/utils";
import {
  FoxMascot,
  type FoxAccessory,
  type FoxAnimationMode,
  type FoxMood,
  type FoxVariant,
} from "@/shared/ui/FoxMascot/FoxMascot";

import type { PlaySnapshot } from "@/shared/types/dashboard";
import type { ReactNode } from "react";

export {
  getEnvironmentHabitatScene,
  getHabitatTitleKey,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
} from "@/features/play/lib/play-scene-helpers/play-scene-helpers";

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
  const motionSettings = useMotionSettings();
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
          <PlaySceneDetailsCard
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
            motionSettings={motionSettings}
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
