import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/shared/components/EmptyState/EmptyState";
import { useMotionSettings } from "@/core/runtime/motion";

vi.mock("@/core/runtime/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "reduced",
    windowVisibility: "visible",
    motionLevel: "reduced",
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
    reducedMotionMode: "always",
  })),
}));

describe("EmptyState", () => {
  it("renders static content when reduced motion is enabled", () => {
    vi.mocked(useMotionSettings).mockReturnValue({
      motionPreference: "reduced",
      windowVisibility: "visible",
      motionLevel: "reduced",
      allowDecorativeAnimation: false,
      allowLoopingAnimation: false,
      reducedMotionMode: "always",
    });

    const { container } = render(
      <EmptyState
        title="Nothing here yet"
        description="Try again later."
        action={<button type="button">Retry</button>}
      />,
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Try again later.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Timely fox mascot/i)).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
