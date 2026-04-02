import { render, screen } from "@testing-library/react";
import {
  getEnvironmentHabitatScene,
  getHabitatTitleKey,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
  HabitatPreviewSurface,
  isCompanionReward,
  isEnvironmentReward,
  isFoxAccessorySlot,
  RewardArtPreview,
} from "@/features/play/ui/PlayScene/PlayScene";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => (key: string) => key),
}));

vi.mock("@/shared/ui/FoxMascot/FoxMascot", () => ({
  FoxMascot: ({ mood }: { mood: string }) => <div data-testid="fox-mascot">{mood}</div>,
}));

describe("PlayScene", () => {
  describe("isCompanionReward", () => {
    it("returns true for companion reward with companionVariant", () => {
      expect(
        isCompanionReward({ rewardType: "companion", companionVariant: "aurora" } as never),
      ).toBe(true);
    });

    it("returns false for non-companion reward", () => {
      expect(
        isCompanionReward({ rewardType: "accessory", accessorySlot: "headwear" } as never),
      ).toBe(false);
    });
  });

  describe("isEnvironmentReward", () => {
    it("returns true for environment accessory slot", () => {
      expect(isEnvironmentReward({ accessorySlot: "environment" })).toBe(true);
    });

    it("returns false for non-environment slot", () => {
      expect(isEnvironmentReward({ accessorySlot: "headwear" })).toBe(false);
    });
  });

  describe("isFoxAccessorySlot", () => {
    it("returns true for headwear, eyewear, neckwear, charm", () => {
      expect(isFoxAccessorySlot("headwear")).toBe(true);
      expect(isFoxAccessorySlot("eyewear")).toBe(true);
      expect(isFoxAccessorySlot("neckwear")).toBe(true);
      expect(isFoxAccessorySlot("charm")).toBe(true);
    });

    it("returns false for environment and companion", () => {
      expect(isFoxAccessorySlot("environment")).toBe(false);
      expect(isFoxAccessorySlot("companion")).toBe(false);
    });
  });

  describe("getEnvironmentHabitatScene", () => {
    it("returns environmentSceneKey when present", () => {
      expect(
        getEnvironmentHabitatScene({
          environmentSceneKey: "starlit-camp",
          rewardKey: "aurora",
        }),
      ).toBe("starlit-camp");
    });

    it("falls back to rewardKey when no environmentSceneKey", () => {
      expect(
        getEnvironmentHabitatScene({ environmentSceneKey: undefined, rewardKey: "aurora" }),
      ).toBe("aurora");
    });
  });

  describe("getRewardSlotLabelKey", () => {
    it("returns correct key for each slot", () => {
      expect(getRewardSlotLabelKey("headwear")).toBe("play.slot.headwear");
      expect(getRewardSlotLabelKey("environment")).toBe("play.slot.environment");
      expect(getRewardSlotLabelKey("companion")).toBe("play.slot.companion");
    });
  });

  describe("getThemeTagLabelKey", () => {
    it("returns correct key for each theme", () => {
      expect(getThemeTagLabelKey("craft")).toBe("play.themeTag.craft");
      expect(getThemeTagLabelKey("recovery")).toBe("play.themeTag.recovery");
      expect(getThemeTagLabelKey("focus")).toBe("play.themeTag.focus");
    });
  });

  describe("getThemeTagClasses", () => {
    it("returns classes for each theme", () => {
      expect(getThemeTagClasses("craft")).toContain("orange");
      expect(getThemeTagClasses("recovery")).toContain("sky");
      expect(getThemeTagClasses("focus")).toContain("indigo");
    });
  });

  describe("getRarityBadgeClasses", () => {
    it("returns epic classes for epic rarity", () => {
      expect(getRarityBadgeClasses("epic")).toContain("secondary");
    });

    it("returns rare classes for rare rarity", () => {
      expect(getRarityBadgeClasses("rare")).toContain("primary");
    });
  });

  describe("getHabitatTitleKey", () => {
    it("returns title key for known scene", () => {
      expect(getHabitatTitleKey("aurora")).toBe("play.habitat.aurora.title");
      expect(getHabitatTitleKey("starlit-camp")).toBe("play.habitat.starlitCamp.title");
    });
  });

  describe("HabitatPreviewSurface", () => {
    it("renders with scene and mascot", () => {
      render(
        <HabitatPreviewSurface
          scene="aurora"
          mood="idle"
          companionVariant="aurora"
          accessories={[]}
          t={(k) => k}
        />,
      );
      expect(screen.getByTestId("fox-mascot")).toBeInTheDocument();
    });
  });

  describe("RewardArtPreview", () => {
    it("renders for companion reward", () => {
      render(
        <RewardArtPreview
          reward={
            {
              rewardType: "companion",
              companionVariant: "aurora",
              rewardKey: "aurora",
            } as never
          }
          companionVariant="aurora"
          mood="idle"
          accessories={[]}
          t={(k) => k}
        />,
      );
      expect(screen.getByTestId("fox-mascot")).toBeInTheDocument();
    });
  });
});
