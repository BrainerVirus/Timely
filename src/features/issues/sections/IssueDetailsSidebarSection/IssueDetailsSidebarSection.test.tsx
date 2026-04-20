import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

const details = {
  reference: {
    provider: "gitlab",
    issueId: "g/p#1",
    providerIssueRef: "gid://gitlab/Issue/1",
  },
  key: "g/p#1",
  title: "Reports page",
  state: "opened",
  labels: [{ id: "workflow::doing", label: "workflow::doing" }],
  milestoneTitle: "Sprint 21",
  activity: [],
  capabilities: {
    status: {
      enabled: false,
      options: [{ id: "status::todo", label: "To do" }],
    },
    labels: {
      enabled: true,
      options: [
        { id: "workflow::doing", label: "workflow::doing" },
        { id: "backend", label: "backend" },
      ],
    },
    iteration: {
      enabled: false,
      reason: "Iteration editing is not available for this provider here yet.",
      options: [],
    },
    composer: {
      enabled: true,
      modes: ["write", "preview"],
      supportsQuickActions: true,
    },
    timeTracking: {
      enabled: true,
      supportsQuickActions: true,
    },
  },
  iteration: {
    id: "iteration-21",
    label: "Sprint 21",
    startDate: "2026-04-14",
    dueDate: "2026-04-28",
  },
} as unknown as IssueDetailsSnapshot;

const schedule = {
  hoursPerDay: 8,
  workdays: "Mon - Fri",
  timezone: "UTC",
  weekStart: "monday",
  weekdaySchedules: [],
};

describe("IssueDetailsSidebarSection", () => {
  it("shows readonly values by default and commits label edits on outside interaction", async () => {
    const onStateChange = vi.fn();
    const onToggleLabel = vi.fn();
    const onSaveMetadata = vi.fn().mockResolvedValue(undefined);
    const onSubmitTime = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <IssueDetailsSidebarSection
          details={details}
          schedule={schedule}
          timezone="America/Santiago"
          busy={false}
          selectedState="opened"
          selectedLabels={["workflow::doing"]}
          timeSpent="1h"
          spentDate={new Date("2026-04-07T12:00:00Z")}
          summary=""
          metadataDirty
          onStateChange={onStateChange}
          onToggleLabel={onToggleLabel}
          onSaveMetadata={onSaveMetadata}
          onTimeSpentChange={vi.fn()}
          onSpentDateChange={vi.fn()}
          onSummaryChange={vi.fn()}
          onSubmitTime={onSubmitTime}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("combobox", { name: "Status" })).not.toBeInTheDocument();
    expect(screen.getByText("workflow::doing")).toBeInTheDocument();
    expect(screen.getAllByText("Sprint 21").length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue("Sprint 21")).not.toBeInTheDocument();
    expect(screen.queryByText(/2026-04-14/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("1h")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save details/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit labels/i }));
    fireEvent.click(screen.getByText("backend"));
    fireEvent.mouseDown(document.body);
    fireEvent.click(screen.getByRole("button", { name: /submit time/i }));

    await waitFor(() => {
      expect(onToggleLabel).toHaveBeenCalledWith("backend");
      expect(onSaveMetadata).toHaveBeenCalledTimes(1);
    });
    expect(onStateChange).not.toHaveBeenCalled();
    expect(onSubmitTime).toHaveBeenCalledTimes(1);
  });
});
