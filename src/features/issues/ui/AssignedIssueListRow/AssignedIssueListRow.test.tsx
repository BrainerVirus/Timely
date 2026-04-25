import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssueListRow/AssignedIssueListRow";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const issue: AssignedIssueSnapshot = {
  provider: "gitlab",
  issueId: "g/p#42",
  providerIssueRef: "gid://gitlab/Issue/42",
  key: "g/p#42",
  title: "Fix the thing",
  state: "opened",
  labels: ["workflow::doing", "team::alpha", "frontend", "category::product"],
  milestoneTitle: "Sprint A",
  iterationTitle: "Iteration 1",
  iterationStartDate: "2026-01-05",
  iterationDueDate: "2026-01-18",
};

describe("AssignedIssueListRow", () => {
  it("renders dense metadata, collapses extra chips, and invokes onOpen when clicked", () => {
    const onOpen = vi.fn();

    render(
      <I18nProvider>
        <AssignedIssueListRow issue={issue} workflowLabel="Doing" onOpen={onOpen} syncVersion={0} />
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
    expect(screen.getByText("team::alpha")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Fix the thing/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("gives repeated badge values stable semantic tone classes", () => {
    const { rerender } = render(
      <I18nProvider>
        <AssignedIssueListRow
          issue={issue}
          workflowLabel="Doing"
          onOpen={vi.fn()}
          syncVersion={0}
        />
      </I18nProvider>,
    );

    const firstWorkflow = screen.getByText("workflow::doing");
    const firstYear = screen.getByText("Doing").previousElementSibling;

    rerender(
      <I18nProvider>
        <AssignedIssueListRow
          issue={{
            ...issue,
            key: "g/p#43",
            issueId: "g/p#43",
            providerIssueRef: "gid://gitlab/Issue/43",
            labels: ["workflow::doing", "frontend", "priority::low"],
          }}
          workflowLabel="Doing"
          onOpen={vi.fn()}
          syncVersion={0}
        />
      </I18nProvider>,
    );

    const repeatedWorkflow = screen.getByText("workflow::doing");
    expect(firstWorkflow.className).toBe(repeatedWorkflow.className);
    expect(firstYear?.className).toContain("text-success");
  });
});
