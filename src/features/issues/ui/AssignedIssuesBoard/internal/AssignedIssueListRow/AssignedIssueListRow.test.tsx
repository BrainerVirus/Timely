import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssueListRow/AssignedIssueListRow";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const issue: AssignedIssueSnapshot = {
  key: "g/p#42",
  title: "Fix the thing",
  state: "opened",
  issueGraphqlId: "gid://gitlab/Issue/42",
  labels: ["workflow::doing", "team::alpha"],
  milestoneTitle: "Sprint A",
  iterationTitle: "Iteration 1",
  iterationStartDate: "2026-01-05",
  iterationDueDate: "2026-01-18",
};

describe("AssignedIssueListRow", () => {
  it("renders metadata and invokes onOpen when clicked", () => {
    const onOpen = vi.fn();

    render(
      <I18nProvider>
        <AssignedIssueListRow issue={issue} workflowLabel="Doing" onOpen={onOpen} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Fix the thing/i })).toBeInTheDocument();
    expect(screen.getByText("g/p#42")).toBeInTheDocument();
    expect(screen.getByText("Iteration 1")).toBeInTheDocument();
    expect(screen.getByText("Sprint A")).toBeInTheDocument();
    expect(screen.getByText("2026-01-05 → 2026-01-18")).toBeInTheDocument();
    expect(screen.getByText("opened")).toBeInTheDocument();
    expect(screen.getByText("Doing")).toBeInTheDocument();
    expect(screen.getByText("workflow::doing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Fix the thing/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
