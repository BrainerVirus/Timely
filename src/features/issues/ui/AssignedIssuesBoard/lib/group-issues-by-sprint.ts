import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export function sprintLabel(issue: AssignedIssueSnapshot, noSprint: string): string {
  return issue.iterationTitle ?? issue.milestoneTitle ?? noSprint;
}

export function groupIssuesBySprint(
  issues: AssignedIssueSnapshot[],
  noSprint: string,
): Map<string, AssignedIssueSnapshot[]> {
  const map = new Map<string, AssignedIssueSnapshot[]>();
  for (const issue of issues) {
    const key = sprintLabel(issue, noSprint);
    const list = map.get(key) ?? [];
    list.push(issue);
    map.set(key, list);
  }
  return map;
}
