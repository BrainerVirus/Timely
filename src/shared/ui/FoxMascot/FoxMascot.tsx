import { m } from "motion/react";
import {
  getAnimationForMood,
  getAnimationTransitionForMood,
  getFoxPalette,
  resolveAnimationMode,
} from "@/shared/ui/FoxMascot/internal/fox-mascot-helpers";
import {
  type FoxAccessory,
  type FoxAnimationMode,
  type FoxMood,
  type FoxVariant,
  type MotionSettingsLike,
} from "@/shared/ui/FoxMascot/internal/fox-mascot-types";
import { FoxAccessories } from "@/shared/ui/FoxMascot/internal/FoxAccessories/FoxAccessories";
import { FoxFace } from "@/shared/ui/FoxMascot/internal/FoxFace/FoxFace";
import { FoxTail } from "@/shared/ui/FoxMascot/internal/FoxTail/FoxTail";

const EMPTY_ACCESSORIES: FoxAccessory[] = [];

const DEFAULT_MOTION: MotionSettingsLike = {
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  motionLevel: "full",
};

interface FoxMascotProps {
  mood?: FoxMood;
  size?: number;
  className?: string;
  ariaLabel?: string;
  accessories?: FoxAccessory[];
  variant?: FoxVariant;
  animationMode?: FoxAnimationMode;
  motionSettings?: MotionSettingsLike;
}

export type {
  FoxAccessory,
  FoxAccessorySlot,
  FoxAnimationMode,
  FoxMood,
  FoxVariant,
  MotionSettingsLike,
} from "@/shared/ui/FoxMascot/internal/fox-mascot-types";

export function FoxMascot({
  mood = "idle",
  size = 120,
  className,
  ariaLabel,
  accessories = EMPTY_ACCESSORIES,
  variant = "aurora",
  animationMode = "auto",
  motionSettings = DEFAULT_MOTION,
}: Readonly<FoxMascotProps>) {
  const resolvedAnimationMode = resolveAnimationMode(animationMode, motionSettings);
  const shouldAnimateContainer = resolvedAnimationMode === "full";
  const shouldAnimateTail =
    resolvedAnimationMode !== "none" && motionSettings.motionLevel !== "none";
  const palette = getFoxPalette(variant);
  const headwear = accessories.find((accessory) => accessory.slot === "headwear")?.variant;
  const eyewear = accessories.find((accessory) => accessory.slot === "eyewear")?.variant;
  const neckwear = accessories.find((accessory) => accessory.slot === "neckwear")?.variant;
  const charm = accessories.find((accessory) => accessory.slot === "charm")?.variant;

  return (
    <m.div
      className={className}
      style={{ width: size, height: size }}
      animate={shouldAnimateContainer ? getAnimationForMood(mood) : undefined}
      transition={shouldAnimateContainer ? getAnimationTransitionForMood(mood) : undefined}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
      >
        <path
          d="M30 52 L22 20 L44 40 Z"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M31 46 L27 26 L40 40 Z" fill={palette.innerEar} />

        <path
          d="M90 52 L98 20 L76 40 Z"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M89 46 L93 26 L80 40 Z" fill={palette.innerEar} />

        <circle
          cx="60"
          cy="64"
          r="32"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
        />
        <ellipse cx="60" cy="72" rx="20" ry="18" fill="oklch(0.97 0.01 90)" />

        <FoxFace mood={mood} />
        <FoxTail mood={mood} fur={palette.fur} animated={shouldAnimateTail} />
        <FoxAccessories headwear={headwear} eyewear={eyewear} neckwear={neckwear} charm={charm} />
      </svg>
    </m.div>
  );
}
