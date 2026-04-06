import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export type WorkflowColumnId = "todo" | "doing" | "done" | "closed" | "other";

/** Column order left → right on the status board. */
export const WORKFLOW_COLUMN_ORDER: WorkflowColumnId[] = [
  "todo",
  "doing",
  "done",
  "closed",
  "other",
];

/**
 * Best-effort workflow column from GitLab `state` and `labels`. Matches common English and
 * Spanish label wording; unknown open issues land in `other`.
 */
/** Localized label for the workflow/status filter and issue row chip. */
export function workflowStatusFilterLabel(
  column: WorkflowColumnId,
  t: (key: string) => string,
): string {
  switch (column) {
    case "todo":
      return t("issues.statusTodo");
    case "doing":
      return t("issues.statusDoing");
    case "done":
      return t("issues.statusDone");
    case "closed":
      return t("issues.statusClosed");
    default:
      return t("issues.statusOther");
  }
}

export function getWorkflowColumnId(issue: AssignedIssueSnapshot): WorkflowColumnId {
  const state = issue.state.toLowerCase();
  if (state === "closed") {
    return "closed";
  }

  const labels = issue.labels.map((l) => l.toLowerCase());
  const any = (re: RegExp) => labels.some((l) => re.test(l));

  if (
    any(
      /\b(done|complete|completed|resolved|cerrad|finalizad|listo|terminad)\b/,
    )
  ) {
    return "done";
  }
  if (
    any(
      /\b(doing|in[\s_-]?progress|wip|review|develop|en[\s_-]?curso|progreso|desarrollo)\b/,
    )
  ) {
    return "doing";
  }
  if (
    any(
      /\b(todo|to[\s_-]?do|backlog|ready|planned|triage|pendiente|por[\s_-]?hacer)\b/,
    )
  ) {
    return "todo";
  }

  return "other";
}

export function groupIssuesByWorkflow(
  issues: AssignedIssueSnapshot[],
): Map<WorkflowColumnId, AssignedIssueSnapshot[]> {
  const map = new Map<WorkflowColumnId, AssignedIssueSnapshot[]>();
  for (const id of WORKFLOW_COLUMN_ORDER) {
    map.set(id, []);
  }
  for (const issue of issues) {
    const col = getWorkflowColumnId(issue);
    map.get(col)!.push(issue);
  }
  return map;
}
