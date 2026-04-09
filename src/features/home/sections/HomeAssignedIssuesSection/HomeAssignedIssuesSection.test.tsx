import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { HomeAssignedIssuesSection } from "@/features/home/sections/HomeAssignedIssuesSection/HomeAssignedIssuesSection";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const one: AssignedIssueSnapshot[] = [
  {
    provider: "gitlab",
    issueId: "a#1",
    providerIssueRef: "gid://gitlab/Issue/1",
    key: "a#1",
    title: "Task",
    state: "opened",
    labels: [],
  },
];

describe("HomeAssignedIssuesSection", () => {
  it("renders nothing when there are no issues", () => {
    const { container } = render(
      <I18nProvider>
        <HomeAssignedIssuesSection issues={[]} onOpenBoard={vi.fn()} onOpenIssue={vi.fn()} />
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
          onOpenBoard={onOpenBoard}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Open board/i }));
    expect(onOpenBoard).toHaveBeenCalledTimes(1);
  });
});
