import { render, screen } from "@testing-library/react";
import { PlayStatusState } from "@/features/play/ui/PlayStatusState/PlayStatusState";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: true,
    windowVisibility: "visible",
  })),
}));

describe("PlayStatusState", () => {
  it("renders the provided title and description", () => {
    render(<PlayStatusState title="Loading play" description="Please wait" />);

    expect(screen.getByText("Loading play")).toBeInTheDocument();
    expect(screen.getByText("Please wait")).toBeInTheDocument();
  });
});
