import { render, screen } from "@testing-library/react";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { StreakSection } from "@/features/home/sections/StreakSection/StreakSection";
import { mockBootstrap } from "@/test/fixtures/mock-data";
import { tourPayload } from "@/shared/testing/tour-mock-data/tour-mock-data";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "system",
    windowVisibility: "visible",
    motionLevel: "full",
    prefersReducedMotion: false,
    allowDecorativeAnimation: true,
    allowLoopingAnimation: true,
    reducedMotionMode: "user",
  })),
}));

describe("StreakSection", () => {
  beforeEach(() => {
    vi.mocked(useMotionSettings).mockReturnValue({
      motionPreference: "system",
      windowVisibility: "visible",
      motionLevel: "full",
      prefersReducedMotion: false,
      allowDecorativeAnimation: true,
      allowLoopingAnimation: true,
      reducedMotionMode: "user",
    });
  });

  it("renders streak data and empty state", () => {
    const { rerender } = render(<StreakSection streak={tourPayload.streak} />);
    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();

    rerender(<StreakSection streak={mockBootstrap.streak} />);
    expect(screen.getByText(/Sync your data to see your current streak appear here/i)).toBeInTheDocument();
  });
});
