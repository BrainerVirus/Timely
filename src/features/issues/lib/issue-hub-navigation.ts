import type { IssueRouteReference } from "@/shared/types/dashboard";

export function pushIssueHubHistory(
  history: IssueRouteReference[],
  currentIssue: IssueRouteReference,
  nextIssue: IssueRouteReference,
) {
  if (
    currentIssue.provider === nextIssue.provider &&
    currentIssue.issueId === nextIssue.issueId
  ) {
    return history;
  }

  return [...history, currentIssue];
}

export function popIssueHubHistory(history: IssueRouteReference[]) {
  if (history.length === 0) {
    return {
      previousIssue: null,
      remainingHistory: [],
    };
  }

  return {
    previousIssue: history[history.length - 1] ?? null,
    remainingHistory: history.slice(0, -1),
  };
}
