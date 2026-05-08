import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddIssueTimeDialog } from "@/domains/issues/ui/AddIssueTimeDialog/AddIssueTimeDialog";

import type { AssignedIssueSnapshot, IssueReference } from "@/shared/types/dashboard";
import type React from "react";

const assignedIssues: AssignedIssueSnapshot[] = [
  {
    provider: "gitlab",
    issueId: "PULSE-42",
    providerIssueRef: "gid://gitlab/Issue/42",
    key: "PULSE-42",
    title: "Redesign dashboard layout",
    state: "opened",
    workflowStatus: "doing",
    labels: [],
  },
  {
    provider: "youtrack",
    issueId: "OPS-7",
    providerIssueRef: "OPS-7",
    key: "OPS-7",
    title: "Polish release notes",
    state: "Open",
    workflowStatus: "todo",
    labels: [],
  },
];

const labels = {
  title: "Add time",
  description: "Pick an assigned issue and register time for the selected day.",
  issuePickerLabel: "Issue",
  issuePickerPlaceholder: "Filter by key, title, or provider...",
  selectedIssue: "Selected issue",
  chooseIssueToContinue: "Choose an issue to continue.",
  noResults: "No results found.",
  spentDate: "Spent date",
  summaryOptional: "Summary (optional)",
  summaryField: "Summary",
  close: "Close",
  loading: "Loading",
  submit: "Log time",
  durationInput: {
    legend: "Spent time",
    segmentLabels: {
      weeks: "Weeks",
      days: "Days",
      hours: "Hours",
      minutes: "Minutes",
    },
    segmentSuffixes: {
      weeks: "w",
      days: "d",
      hours: "h",
      minutes: "m",
    },
    quickActions: {
      add15Minutes: "Add 15 minutes",
      add30Minutes: "Add 30 minutes",
      add1Hour: "Add 1 hour",
      add2Hours: "Add 2 hours",
      add4Hours: "Add 4 hours",
    },
    clear: "clear",
    clearAriaLabel: "Clear duration",
    emptyPreview: "No time selected",
  },
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof AddIssueTimeDialog>> = {},
) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <AddIssueTimeDialog
      open
      assignedIssues={assignedIssues}
      defaultDate="2026-03-05"
      initialIssueReference={null}
      locale="en-US"
      labels={labels}
      submitting={false}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      {...props}
    />,
  );

  return { onOpenChange, onSubmit };
}

describe("AddIssueTimeDialog", () => {
  it("opens without a selected issue and disables submit until an issue and duration are selected", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Add time" })).toBeInTheDocument();
    expect(screen.getByText("Choose an issue to continue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log time" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /PULSE-42/ }));

    expect(screen.getAllByText("Redesign dashboard layout").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Log time" })).toBeDisabled();
  });

  it("preselects the matching card issue", () => {
    renderDialog({
      initialIssueReference: { provider: "gitlab", issueId: "PULSE-42" },
    });

    expect(screen.getByText("Selected issue")).toBeInTheDocument();
    expect(screen.getAllByText("Redesign dashboard layout").length).toBeGreaterThan(0);
  });

  it("submits the selected issue, provider duration, spent date, and summary", async () => {
    const { onSubmit } = renderDialog({
      initialIssueReference: { provider: "youtrack", issueId: "OPS-7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add 1 hour" }));
    fireEvent.change(screen.getByLabelText("Spent date"), { target: { value: "2026-03-06" } });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Pairing on release polish" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        reference: {
          provider: "youtrack",
          issueId: "OPS-7",
          providerIssueRef: "OPS-7",
        } satisfies IssueReference,
        timeSpent: "1h",
        spentAt: "2026-03-06T12:00:00Z",
        summary: "Pairing on release polish",
      });
    });
  });
});
