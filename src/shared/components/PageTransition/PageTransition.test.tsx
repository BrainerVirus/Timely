import { render, screen } from "@testing-library/react";
import { StaggerGroup } from "@/shared/components/PageTransition/PageTransition";

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: false, windowVisibility: "visible" })),
}));

describe("PageTransition", () => {
  it("StaggerGroup renders children", () => {
    render(<StaggerGroup>Group content</StaggerGroup>);
    expect(screen.getByText("Group content")).toBeInTheDocument();
  });
});
