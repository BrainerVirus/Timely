import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/shared/components/EmptyState/EmptyState";

describe("EmptyState", () => {
  it("renders static content when reduced motion is enabled", () => {
    const { container } = render(
      <EmptyState
        title="Nothing here yet"
        description="Try again later."
        action={<button type="button">Retry</button>}
        allowDecorativeAnimation={false}
      />,
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Try again later.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Timely fox mascot/i)).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
