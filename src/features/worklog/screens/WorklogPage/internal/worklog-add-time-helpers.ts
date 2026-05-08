import type { AddIssueTimeDialogLabels } from "@/domains/issues/ui/AddIssueTimeDialog/AddIssueTimeDialog";
import type {
  AssignedIssueSnapshot,
  IssueBreakdown,
} from "@/shared/types/dashboard";

type Translate = (key: never, params?: Record<string, string | number>) => string;

function translate(t: Translate, key: string, params?: Record<string, string | number>) {
  return t(key as never, params);
}

export function createAddTimeDialogLabels(t: Translate): AddIssueTimeDialogLabels {
  return {
    title: translate(t, "issues.addTimeTitle"),
    description: translate(t, "issues.addTimeDescription"),
    issuePickerLabel: translate(t, "issues.issuePickerLabel"),
    issuePickerPlaceholder: translate(t, "issues.issuePickerPlaceholder"),
    selectedIssue: translate(t, "issues.selectedIssue"),
    chooseIssueToContinue: translate(t, "issues.chooseIssueToContinue"),
    noResults: translate(t, "common.noResults"),
    spentDate: translate(t, "issues.spentDatePicker"),
    summaryOptional: translate(t, "issues.summaryOptional"),
    summaryField: translate(t, "issues.summaryField"),
    close: translate(t, "common.close"),
    loading: translate(t, "common.loading"),
    submit: translate(t, "issues.logTimeAction"),
    durationInput: {
      legend: translate(t, "issues.durationInputLegend"),
      segmentLabels: {
        weeks: translate(t, "issues.durationWeeks"),
        days: translate(t, "issues.durationDays"),
        hours: translate(t, "issues.durationHours"),
        minutes: translate(t, "issues.durationMinutes"),
      },
      segmentSuffixes: {
        weeks: translate(t, "issues.durationWeeksShort"),
        days: translate(t, "issues.durationDaysShort"),
        hours: translate(t, "issues.durationHoursShort"),
        minutes: translate(t, "issues.durationMinutesShort"),
      },
      quickActions: {
        add15Minutes: translate(t, "issues.durationAddMinutes", { count: 15 }),
        add30Minutes: translate(t, "issues.durationAddMinutes", { count: 30 }),
        add1Hour: translate(t, "issues.durationAddHours", { count: 1 }),
        add2Hours: translate(t, "issues.durationAddHours", { count: 2 }),
        add4Hours: translate(t, "issues.durationAddHours", { count: 4 }),
      },
      clear: translate(t, "issues.durationClear"),
      clearAriaLabel: translate(t, "issues.durationClearAria"),
      emptyPreview: translate(t, "issues.durationNoTimeSelected"),
    },
  };
}

export function collectIssueOptions(
  assignedIssues: AssignedIssueSnapshot[],
  days: Array<{ topIssues: IssueBreakdown[] }>,
): AssignedIssueSnapshot[] {
  const options = new Map<string, AssignedIssueSnapshot>();

  assignedIssues.forEach((issue) => {
    options.set(`${issue.provider}:${issue.issueId}`, issue);
  });
  days.forEach((day) => {
    day.topIssues.forEach((issue) => {
      const key = `${issue.provider}:${issue.issueId}`;
      if (!options.has(key)) {
        options.set(key, {
          provider: issue.provider,
          issueId: issue.issueId,
          providerIssueRef: issue.providerIssueRef,
          key: issue.key,
          title: issue.title,
          state: issue.state,
          statusLabel: issue.statusLabel,
          workflowStatus: "other",
          webUrl: issue.webUrl,
          labels: [],
        });
      }
    });
  });

  return Array.from(options.values());
}

export function providerProductName(provider: string) {
  return provider === "youtrack" ? "YouTrack" : "GitLab";
}
