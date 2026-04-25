import { render, screen } from "@testing-library/react";
import { IssueDetailsSkeleton } from "@/features/issues/ui/IssueDetailsSkeleton/IssueDetailsSkeleton";

describe("IssueDetailsSkeleton", () => {
  it("exposes issue hub skeleton test id and status role", () => {
    render(<IssueDetailsSkeleton />);
    expect(screen.getByTestId("issue-hub-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders a single sidebar panel matching the details inspector layout", () => {
    const { container } = render(<IssueDetailsSkeleton />);
    expect(container.querySelectorAll("aside")).toHaveLength(1);
  });
});
