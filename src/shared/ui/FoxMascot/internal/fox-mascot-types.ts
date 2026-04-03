export type FoxMood =
  | "idle"
  | "working"
  | "celebrating"
  | "curious"
  | "cozy"
  | "tired"
  | "drained";

export type FoxAccessorySlot = "headwear" | "eyewear" | "neckwear" | "charm";

export interface FoxAccessory {
  slot: FoxAccessorySlot;
  variant: string;
}

export type FoxVariant = "aurora" | "arctic" | "kitsune";
export type FoxAnimationMode = "auto" | "full" | "minimal" | "none";

export interface MotionSettingsLike {
  allowDecorativeAnimation: boolean;
  allowLoopingAnimation: boolean;
  motionLevel: "full" | "reduced" | "none";
}
