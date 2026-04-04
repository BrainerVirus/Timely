import { render, screen } from "@testing-library/react";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { WeeklyProgressSection } from "@/features/home/sections/WeeklyProgressSection/WeeklyProgressSection";
import { tourPayload } from "@/shared/testing/tour-mock-data/tour-mock-data";
import { mockBootstrap } from "@/test/fixtures/mock-data";

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

describe("WeeklyProgressSection", () => {
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

  it("renders weekly progress data and empty state", () => {
    const { rerender } = render(<WeeklyProgressSection weekDays={tourPayload.week} />);
    expect(screen.getByText(/This week's progress/i)).toBeInTheDocument();

    rerender(<WeeklyProgressSection weekDays={mockBootstrap.week} />);
    expect(
      screen.getByText(/Sync your data to see your weekly rhythm appear here/i),
    ).toBeInTheDocument();
  });
});
