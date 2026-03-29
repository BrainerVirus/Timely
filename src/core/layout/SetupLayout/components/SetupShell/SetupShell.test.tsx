import { render, screen } from "@testing-library/react";
import { SetupShell } from "@/core/layout/SetupLayout/components/SetupShell/SetupShell";

describe("SetupShell", () => {
  it("renders children", () => {
    render(
      <SetupShell step={0} totalSteps={5}>
        <span>Setup content</span>
      </SetupShell>,
    );
    expect(screen.getByText("Setup content")).toBeInTheDocument();
  });

  it("renders step dots for total steps", () => {
    const { container } = render(
      <SetupShell step={1} totalSteps={3}>
        <span>Content</span>
      </SetupShell>,
    );
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it("uses the wide container width when requested", () => {
    const { container } = render(
      <SetupShell step={1} totalSteps={5} width="wide">
        <span>Wide content</span>
      </SetupShell>,
    );

    expect(container.querySelector(".max-w-3xl")).toBeInTheDocument();
  });
});
