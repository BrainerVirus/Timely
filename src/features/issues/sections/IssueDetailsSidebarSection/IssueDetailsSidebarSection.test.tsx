import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

const details: IssueDetailsSnapshot = {
  reference: {
    provider: "gitlab",
    issueId: "g/p#1",
    providerIssueRef: "gid://gitlab/Issue/1",
  },
  key: "g/p#1",
  title: "Reports page",
  state: "opened",
  labels: [{ id: "workflow::doing", label: "workflow::doing" }],
  activity: [],
  capabilities: {
    status: {
      enabled: true,
      options: [
        { id: "opened", label: "Open" },
        { id: "closed", label: "Closed" },
      ],
    },
    labels: {
      enabled: true,
      options: [{ id: "workflow::doing", label: "workflow::doing" }],
    },
    iteration: {
      enabled: false,
      reason: "GitLab does not expose iteration changes for this view yet.",
      options: [],
    },
    composer: {
      enabled: true,
      modes: ["write", "preview", "split"],
      supportsQuickActions: true,
    },
    timeTracking: {
      enabled: true,
      supportsQuickActions: true,
    },
  },
};

const schedule = {
  hoursPerDay: 8,
  workdays: "Mon - Fri",
  timezone: "UTC",
  weekStart: "monday",
  weekdaySchedules: [],
};

describe("IssueDetailsSidebarSection", () => {
  it("forwards metadata and time actions", () => {
    const onStateChange = vi.fn();
    const onToggleLabel = vi.fn();
    const onSaveMetadata = vi.fn().mockResolvedValue(undefined);
    const onSubmitTime = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <IssueDetailsSidebarSection
          details={details}
          schedule={schedule}
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

    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    fireEvent.click(screen.getByLabelText("workflow::doing"));
    fireEvent.click(screen.getByRole("button", { name: /save details/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit time/i }));

    expect(onStateChange).toHaveBeenCalledWith("closed");
    expect(onToggleLabel).toHaveBeenCalledWith("workflow::doing");
    expect(onSaveMetadata).toHaveBeenCalledTimes(1);
    expect(onSubmitTime).toHaveBeenCalledTimes(1);
  });
});
