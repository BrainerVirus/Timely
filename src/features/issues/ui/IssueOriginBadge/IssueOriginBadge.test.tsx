import { render, screen } from "@testing-library/react";
import { IssueOriginBadge } from "@/features/issues/ui/IssueOriginBadge/IssueOriginBadge";

describe("IssueOriginBadge", () => {
  it("renders canonical provider labels", () => {
    const { rerender } = render(<IssueOriginBadge provider="gitlab" />);
    expect(screen.getByText("GitLab")).toBeInTheDocument();

    rerender(<IssueOriginBadge provider="youtrack" />);
    expect(screen.getByText("YouTrack")).toBeInTheDocument();
  });
});
