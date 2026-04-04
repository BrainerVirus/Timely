import type { CompanionMood } from "@/shared/types/dashboard";
import type { FoxMood } from "@/shared/ui/FoxMascot/FoxMascot";

const companionMoodToFoxMood: Record<CompanionMood, FoxMood> = {
  calm: "idle",
  curious: "idle",
  focused: "working",
  happy: "celebrating",
  excited: "celebrating",
  cozy: "idle",
  playful: "celebrating",
  tired: "working",
  drained: "working",
};

export function normalizeCompanionMood(value: string | undefined): CompanionMood {
  switch (value?.toLowerCase()) {
    case "curious":
    case "focused":
    case "happy":
    case "excited":
    case "cozy":
    case "playful":
    case "tired":
    case "drained":
    case "calm":
      return value.toLowerCase() as CompanionMood;
    default:
      return "calm";
  }
}

export function getFoxMoodForCompanionMood(mood: CompanionMood): FoxMood {
  return companionMoodToFoxMood[mood];
}
