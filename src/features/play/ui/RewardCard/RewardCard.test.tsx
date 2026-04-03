import { fireEvent, render, screen } from "@testing-library/react";
import { RewardCard } from "@/features/play/ui/RewardCard/RewardCard";

const preview = vi.fn();

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/features/play/ui/PlayScene/PlayScene", () => ({
  RewardArtPreview: () => <div>reward-art</div>,
  getRarityBadgeClasses: () => "rarity",
  getRewardSlotLabelKey: () => "play.slot.hat",
  getThemeTagClasses: () => "theme",
  getThemeTagLabelKey: () => "play.theme.cozy",
}));

describe("RewardCard", () => {
  it("renders preview actions for owned rewards", () => {
    render(
      <RewardCard
        reward={{
          rewardKey: "hat",
          rewardName: "Hat",
          rewardType: "accessory",
          owned: true,
          equipped: false,
          accessorySlot: "headwear",
          costTokens: 10,
          featured: false,
          storeSection: "accessories",
          themeTag: "craft",
          rarity: "rare",
        }}
        tokens={100}
        onPreview={preview}
        onEquip={vi.fn()}
        companionVariant="aurora"
        mood="idle"
        accessories={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "play.preview" }));
    expect(preview).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Hat")).toBeInTheDocument();
  });
});
