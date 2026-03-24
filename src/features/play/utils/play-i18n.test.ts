import {
  getMoodLabelKey,
  getPrimaryTabLabelKey,
  getSecondaryFilterLabelKey,
  isRewardPreviewSelected,
  resolveUnlockHint,
  sortRecommendedQuests,
  translateRewardName,
  withTranslatedReward,
} from "@/features/play/utils/play-i18n";

describe("play-i18n", () => {
  describe("getMoodLabelKey", () => {
    it("returns key for known mood", () => {
      expect(getMoodLabelKey("happy")).toBe("home.petMoodHappy");
    });
    it("returns calm for unknown mood", () => {
      expect(getMoodLabelKey(undefined as never)).toBe("home.petMoodCalm");
    });
  });

  describe("getPrimaryTabLabelKey", () => {
    it("returns key for each tab", () => {
      expect(getPrimaryTabLabelKey("all")).toBe("play.storeTabAll");
      expect(getPrimaryTabLabelKey("featured")).toBe("play.storeTabFeatured");
      expect(getPrimaryTabLabelKey("companions")).toBe("play.storeTabCompanions");
    });
  });

  describe("getSecondaryFilterLabelKey", () => {
    it("returns key for each filter", () => {
      expect(getSecondaryFilterLabelKey("all")).toBe("play.filterAll");
      expect(getSecondaryFilterLabelKey("owned")).toBe("play.filterOwned");
    });
  });

  describe("sortRecommendedQuests", () => {
    const base = {
      questKey: "q1",
      title: "Q",
      description: "",
      rewardLabel: "",
      progressValue: 0,
      targetValue: 10,
      cadence: "daily" as const,
      category: "focus" as const,
      isActive: false,
      isClaimed: false,
    };
    it("returns negative when first ranks higher than second", () => {
      const claimable = { ...base, progressValue: 10, targetValue: 10 };
      const active = { ...base, questKey: "q2", isActive: true };
      expect(sortRecommendedQuests(claimable, active)).toBeLessThan(0);
    });
  });

  describe("translateRewardName", () => {
    it("returns rewardName when key equals translation", () => {
      const t = (k: string) => k;
      expect(translateRewardName({ rewardKey: "x", rewardName: "Custom" }, t)).toBe("Custom");
    });
    it("returns translation when key differs", () => {
      const t = () => "Translated";
      expect(translateRewardName({ rewardKey: "x", rewardName: "Custom" }, t)).toBe("Translated");
    });
  });

  describe("withTranslatedReward", () => {
    it("adds rewardName from translateRewardName", () => {
      const t = () => "Translated";
      const reward = { rewardKey: "x", rewardName: "Orig", accessorySlot: "hat" };
      expect(withTranslatedReward(reward, t).rewardName).toBe("Translated");
    });
  });

  describe("resolveUnlockHint", () => {
    it("returns t(unlockHintKey) when present", () => {
      const t = (k: string) => k;
      expect(resolveUnlockHint({ unlockHintKey: "play.unlock.quest" }, t)).toBe(
        "play.unlock.quest",
      );
    });
    it("returns unlockHint when no key", () => {
      const t = () => "";
      expect(resolveUnlockHint({ unlockHint: "Do a quest" }, t)).toBe("Do a quest");
    });
  });

  describe("isRewardPreviewSelected", () => {
    it("returns true when key in array", () => {
      expect(isRewardPreviewSelected("a", ["a", "b"])).toBe(true);
    });
    it("returns false when key not in array", () => {
      expect(isRewardPreviewSelected("c", ["a", "b"])).toBe(false);
    });
  });
});
