import { fireEvent, render, screen } from "@testing-library/react";
import { PlayPreviewPanel } from "@/features/play/ui/PlayPreviewPanel/PlayPreviewPanel";

const clearPreview = vi.fn();

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/features/play/screens/PlayLayout/PlayLayout", () => ({
  usePlayContext: () => ({
    spotlightCompanion: { companionVariant: "aurora" },
    activeEnvironmentReward: undefined,
    activeHabitatScene: "aurora",
    foxMood: "idle",
    previewAccessories: [],
  }),
}));

vi.mock("@/features/play/ui/PlayScene/PlayScene", () => ({
  HabitatPreviewSurface: () => <div>preview-surface</div>,
}));

describe("PlayPreviewPanel", () => {
  it("renders preview metadata and clears preview state", () => {
    render(<PlayPreviewPanel onClearAllPreview={clearPreview} />);

    expect(screen.getByText("play.previewPanelTitle")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "play.clearPreview" }));
    expect(clearPreview).toHaveBeenCalledTimes(1);
  });
});
