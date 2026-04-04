import type {
  FoxAnimationMode,
  FoxMood,
  FoxVariant,
  MotionSettingsLike,
} from "@/shared/ui/FoxMascot/internal/fox-mascot-types";
import type { Transition } from "motion/react";

export function getAnimationForMood(mood: FoxMood) {
  switch (mood) {
    case "celebrating":
      return { y: [0, -8, 0], rotate: [0, -3, 3, 0] };
    case "working":
      return { y: [0, -2, 0] };
    case "curious":
      return { y: [0, -4, 0], rotate: [0, -2, 2, 0] };
    case "cozy":
      return { y: [0, -1, 0], scale: [1, 0.99, 1] };
    case "tired":
      return { y: [0, -1, 0], rotate: [0, -1, 0] };
    case "drained":
      return { y: [0, 1, 0] };
    default:
      return { y: [0, -3, 0] };
  }
}

export function getAnimationTransitionForMood(mood: FoxMood): Transition {
  switch (mood) {
    case "celebrating":
      return { duration: 0.6, repeat: Infinity, ease: "easeInOut" };
    case "drained":
      return { duration: 2.8, repeat: Infinity, ease: "easeInOut" };
    case "cozy":
      return { duration: 3.2, repeat: Infinity, ease: "easeInOut" };
    default:
      return { duration: 2, repeat: Infinity, ease: "easeInOut" };
  }
}

export function getTailRotateAnimation(mood: FoxMood) {
  switch (mood) {
    case "celebrating":
      return { rotate: [0, 15, -15, 0] };
    case "working":
      return { rotate: [0, 3, -3, 0] };
    case "curious":
      return { rotate: [0, 10, -6, 0] };
    case "cozy":
      return { rotate: [0, 4, -2, 0] };
    case "tired":
      return { rotate: [0, 2, -2, 0] };
    case "drained":
      return { rotate: [0, 1, -1, 0] };
    default:
      return { rotate: [0, 8, -8, 0] };
  }
}

export function getTailTransition(mood: FoxMood): Transition {
  switch (mood) {
    case "celebrating":
      return { duration: 0.4, repeat: Infinity, ease: "easeInOut" };
    case "working":
      return { duration: 3, repeat: Infinity, ease: "easeInOut" };
    case "drained":
      return { duration: 4.2, repeat: Infinity, ease: "easeInOut" };
    case "cozy":
      return { duration: 2.8, repeat: Infinity, ease: "easeInOut" };
    default:
      return { duration: 1.5, repeat: Infinity, ease: "easeInOut" };
  }
}

export function getFoxPalette(variant: FoxVariant) {
  if (variant === "kitsune") {
    return {
      fur: "oklch(0.94 0.02 80)",
      outline: "oklch(0.22 0.02 260)",
      innerEar: "oklch(0.18 0.01 260)",
    };
  }

  if (variant === "arctic") {
    return {
      fur: "oklch(0.95 0.02 240)",
      outline: "oklch(0.56 0.05 240)",
      innerEar: "oklch(0.86 0.03 250)",
    };
  }

  return {
    fur: "oklch(0.72 0.18 50)",
    outline: "oklch(0.55 0.12 50)",
    innerEar: "oklch(0.85 0.10 50)",
  };
}

export function resolveAnimationMode(
  animationMode: FoxAnimationMode,
  motionSettings: MotionSettingsLike,
): FoxAnimationMode {
  if (animationMode !== "auto") {
    return animationMode;
  }

  if (!motionSettings.allowDecorativeAnimation) {
    return "none";
  }

  return motionSettings.allowLoopingAnimation ? "full" : "minimal";
}
