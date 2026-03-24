import { render, screen } from "@testing-library/react";
import { WorklogStatusState } from "@/features/worklog/components/WorklogStatusState/WorklogStatusState";

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "reduced",
    windowVisibility: "visible",
    motionLevel: "reduced",
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
    reducedMotionMode: "always",
  })),
}));

describe("WorklogStatusState", () => {
  it("renders title and description", () => {
    render(
      <WorklogStatusState title="Loading" description="Please wait" />,
    );
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Please wait")).toBeInTheDocument();
  });

  it("renders centered layout when centered prop is true", () => {
    const { container } = render(
      <WorklogStatusState title="Error" description="Failed" centered />,
    );
    const wrapper = container.querySelector(".min-h-\\[60vh\\]");
    expect(wrapper).toBeInTheDocument();
  });
});
