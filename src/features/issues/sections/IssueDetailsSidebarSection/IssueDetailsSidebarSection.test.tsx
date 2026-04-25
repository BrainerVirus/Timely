import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";
import {
  getAssignedIssueLabelBadgeClassName,
  getAssignedIssueWorkflowBadgeClassName,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";

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
      enabled: true,
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
    milestone: {
      enabled: false,
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
  status: {
    id: "status::todo",
    label: "To do",
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
  it("shows readonly values by default, uses assigned-issue badge colors, and commits label edits on outside interaction", async () => {
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
    expect(screen.getByText("To do")).toHaveClass(
      ...getAssignedIssueWorkflowBadgeClassName("To do").split(" "),
    );
    expect(screen.getByText("workflow::doing")).toHaveClass(
      ...getAssignedIssueLabelBadgeClassName("workflow::doing").split(" "),
    );
    expect(screen.getAllByText("Sprint 21").length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue("Sprint 21")).not.toBeInTheDocument();
    expect(screen.queryByText(/2026-04-14/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("1h")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log time/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save details/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^1$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Sprint 21")[1]).not.toHaveClass("font-medium", "text-foreground");

    fireEvent.click(screen.getAllByRole("button", { name: /^edit/i })[0]!);
    fireEvent.click(screen.getByText("backend"));
    fireEvent.mouseDown(document.body);
    fireEvent.click(screen.getByRole("button", { name: /log time/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit time/i }));

    await waitFor(() => {
      expect(onToggleLabel).toHaveBeenCalledWith("backend");
      expect(onSaveMetadata).toHaveBeenCalledTimes(1);
    });
    expect(onStateChange).not.toHaveBeenCalled();
    expect(onSubmitTime).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a long-form date range under the iteration label when a label is shown", () => {
    const detailsWithIterationLabel = {
      ...details,
      iteration: {
        id: "gid://gitlab/Iteration/99",
        label: "WEB · Apr 6 - 19, 2026",
        startDate: "2026-04-06",
        dueDate: "2026-04-19",
      },
    } as unknown as IssueDetailsSnapshot;

    render(
      <I18nProvider>
        <IssueDetailsSidebarSection
          details={detailsWithIterationLabel}
          schedule={schedule}
          timezone="America/Santiago"
          busy={false}
          selectedState="opened"
          selectedLabels={["workflow::doing"]}
          timeSpent="1h"
          spentDate={new Date("2026-04-07T12:00:00Z")}
          summary=""
          metadataDirty={false}
          onStateChange={vi.fn()}
          onToggleLabel={vi.fn()}
          onSaveMetadata={vi.fn().mockResolvedValue(undefined)}
          onTimeSpentChange={vi.fn()}
          onSpentDateChange={vi.fn()}
          onSummaryChange={vi.fn()}
          onSubmitTime={vi.fn().mockResolvedValue(undefined)}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("WEB · Apr 6 - 19, 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Apr 6, 2026/)).not.toBeInTheDocument();
  });

  it("shows cadence workflow badge and date-only row text in iteration combobox (no duplicate cadence prefix)", async () => {
    const iterationPayload = {
      ...details,
      capabilities: {
        ...details.capabilities,
        iteration: {
          enabled: true,
          reason: null,
          options: [
            {
              id: "gid://gitlab/Iteration/10",
              label: "WEB · Apr 20 - May 3, 2026",
              badge: "WEB",
            },
            {
              id: "gid://gitlab/Iteration/20",
              label: "OPS · Apr 27 - May 10, 2026",
              badge: "OPS",
            },
          ],
        },
      },
    } as unknown as IssueDetailsSnapshot;

    render(
      <I18nProvider>
        <IssueDetailsSidebarSection
          details={iterationPayload}
          schedule={schedule}
          timezone="America/Santiago"
          busy={false}
          selectedState="opened"
          selectedLabels={["workflow::doing"]}
          timeSpent="1h"
          spentDate={new Date("2026-04-07T12:00:00Z")}
          summary=""
          metadataDirty={false}
          onStateChange={vi.fn()}
          onToggleLabel={vi.fn()}
          onSaveMetadata={vi.fn().mockResolvedValue(undefined)}
          onTimeSpentChange={vi.fn()}
          onSpentDateChange={vi.fn()}
          onSummaryChange={vi.fn()}
          onSubmitTime={vi.fn().mockResolvedValue(undefined)}
          onIterationChange={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /^edit/i })[1]!);

    await waitFor(() => {
      expect(screen.getByText("Apr 20 - May 3, 2026")).toBeInTheDocument();
    });
    expect(screen.getByText("Apr 27 - May 10, 2026")).toBeInTheDocument();
    expect(screen.getByText("OPS")).toHaveClass(
      ...getAssignedIssueWorkflowBadgeClassName("OPS").split(" "),
    );
  });
});
