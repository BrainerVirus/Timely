import { fireEvent, render, screen } from "@testing-library/react";
import { AddIssueTimeIssuePicker } from "@/domains/issues/ui/AddIssueTimeDialog/internal/AddIssueTimeIssuePicker";

const labels = {
  title: "Add time",
  description: "Log time without leaving Worklog.",
  issuePickerLabel: "Issue",
  issuePickerPlaceholder: "Search issues",
  selectedIssue: "Selected issue",
  chooseIssueToContinue: "Choose an issue to continue.",
  noResults: "No results",
  spentDate: "Spent date",
  summaryOptional: "Summary optional",
  summaryField: "Summary",
  close: "Close",
  loading: "Loading",
  submit: "Log time",
  durationInput: {
    legend: "Spent time",
    segmentLabels: { weeks: "Weeks", days: "Days", hours: "Hours", minutes: "Minutes" },
    segmentSuffixes: { weeks: "w", days: "d", hours: "h", minutes: "m" },
    quickActions: {
      add15Minutes: "+15m",
      add30Minutes: "+30m",
      add1Hour: "+1h",
      add2Hours: "+2h",
      add4Hours: "+4h",
    },
    clear: "Clear",
    clearAriaLabel: "Clear duration",
    emptyPreview: "No time selected",
  },
};

const issue = {
  provider: "gitlab",
  issueId: "group/project#1",
  providerIssueRef: "1",
  key: "PROJ-1",
  title: "Fix issue",
  state: "opened",
  workflowStatus: "other" as const,
  webUrl: "https://example.com/1",
  labels: [],
};

describe("AddIssueTimeIssuePicker", () => {
  it("filters and selects issues", () => {
    const onFilterChange = vi.fn();
    const onSelectIssue = vi.fn();

    render(
      <AddIssueTimeIssuePicker
        filter=""
        filteredIssues={[issue]}
        labels={labels}
        selectedIssue={null}
        onFilterChange={onFilterChange}
        onSelectIssue={onSelectIssue}
      />,
    );

    fireEvent.change(screen.getByLabelText("Issue"), { target: { value: "PROJ" } });
    fireEvent.click(screen.getByRole("button", { name: /Fix issue/i }));

    expect(onFilterChange).toHaveBeenCalledWith("PROJ");
    expect(onSelectIssue).toHaveBeenCalledWith(issue);
  });
});
