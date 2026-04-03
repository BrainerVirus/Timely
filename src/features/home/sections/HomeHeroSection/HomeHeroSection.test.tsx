import { fireEvent, render, screen } from "@testing-library/react";
import { HomeHeroSection } from "@/features/home/sections/HomeHeroSection/HomeHeroSection";
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

describe("HomeHeroSection", () => {
  it("renders the quick worklog links", () => {
    const onOpenWorklog = vi.fn();

    render(
      <HomeHeroSection
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={vi.fn()}
        onOpenWorklog={onOpenWorklog}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open today log/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review this week/i }));
    fireEvent.click(screen.getByRole("button", { name: /Inspect date range/i }));

    expect(onOpenWorklog).toHaveBeenNthCalledWith(1, "day");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(2, "week");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(3, "period");
  });
});
