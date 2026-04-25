import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { HomeAssignedIssuesSection } from "@/features/home/sections/HomeAssignedIssuesSection/HomeAssignedIssuesSection";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

function baseIssue(i: number): AssignedIssueSnapshot {
  return {
    provider: "gitlab",
    issueId: `g/p#${i}`,
    providerIssueRef: `gid://gitlab/Issue/${i}`,
    key: `g/p#${i}`,
    title: `Task ${i}`,
    state: "opened",
    labels: [],
  };
}

const one: AssignedIssueSnapshot[] = [baseIssue(1)];

describe("HomeAssignedIssuesSection", () => {
  it("renders nothing when there are no issues", () => {
    const { container } = render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={[]}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onOpenBoard when clicking the board button", () => {
    const onOpenBoard = vi.fn();
    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={one}
          syncVersion={0}
          onOpenBoard={onOpenBoard}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Open board/i }));
    expect(onOpenBoard).toHaveBeenCalledTimes(1);
  });

  it("shows total count badge, omits hint and more footer, and opens issues from row", () => {
    const onOpenIssue = vi.fn();
    const issues = Array.from({ length: 6 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={1}
          onOpenBoard={vi.fn()}
          onOpenIssue={onOpenIssue}
        />
      </I18nProvider>,
    );

    expect(screen.getByLabelText(/6 assigned issues/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Open GitLab issues assigned to you/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/more assigned/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Task 1/i }));
    expect(onOpenIssue).toHaveBeenCalledWith(issues[0]);
  });
});
