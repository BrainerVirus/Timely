import type {
  AssignedIssueSnapshot,
  IssueRouteReference,
} from "@/shared/types/dashboard";

export function getIssueRouteReference(issue: AssignedIssueSnapshot): IssueRouteReference {
  return {
    provider: issue.provider,
    issueId: issue.issueId,
  };
}

export function matchesIssueRouteReference(
  issue: AssignedIssueSnapshot,
  reference: IssueRouteReference,
): boolean {
  return issue.provider === reference.provider && issue.issueId === reference.issueId;
}
