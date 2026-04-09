import {
  getAssignedIssueLabelBadgeClassName,
  getAssignedIssueStateBadgeClassName,
  getAssignedIssueWorkflowBadgeClassName,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import {
  getWorkflowColumnId,
  type WorkflowColumnId,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { cn } from "@/shared/lib/utils";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const MAX_VISIBLE_LABELS = 3;

const workflowBorder: Record<WorkflowColumnId, string> = {
  todo: "border-l-primary",
  doing: "border-l-accent",
  done: "border-l-success",
  closed: "border-l-muted-foreground",
  other: "border-l-secondary",
};

interface AssignedIssueListRowProps {
  issue: AssignedIssueSnapshot;
  workflowLabel: string;
  onOpen: () => void;
}

export function AssignedIssueListRow({
  issue,
  workflowLabel,
  onOpen,
}: Readonly<AssignedIssueListRowProps>) {
  const wf = getWorkflowColumnId(issue);
  const visibleLabels = issue.labels.slice(0, MAX_VISIBLE_LABELS);
  const hiddenLabelsCount = Math.max(0, issue.labels.length - visibleLabels.length);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "w-full rounded-[1.6rem] border-2 border-l-4 border-border-subtle bg-panel-elevated px-4 py-3 text-left shadow-card transition-all hover:border-border-strong hover:bg-panel",
          workflowBorder[wf],
        )}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] leading-tight font-semibold text-foreground">
                  {issue.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] break-all text-muted-foreground/90">
                  {issue.key}
                </span>
                {issue.milestoneTitle ? (
                  <span className="truncate text-muted-foreground">{issue.milestoneTitle}</span>
                ) : null}
                {issue.iterationTitle ? (
                  <span className="truncate text-muted-foreground">{issue.iterationTitle}</span>
                ) : null}
                {issue.iterationStartDate && issue.iterationDueDate ? (
                  <span className="text-[11px] text-muted-foreground">
                    {issue.iterationStartDate} → {issue.iterationDueDate}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:max-w-[45%] lg:justify-end">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] uppercase",
                getAssignedIssueStateBadgeClassName(issue.state),
              )}
            >
              {issue.state}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-clay-inset",
                getAssignedIssueWorkflowBadgeClassName(workflowLabel),
              )}
            >
              {workflowLabel}
            </span>
            {visibleLabels.map((label) => (
              <span
                key={label}
                className={cn(
                  "max-w-full truncate rounded-full border px-2.5 py-1 text-[10px] shadow-clay-inset",
                  getAssignedIssueLabelBadgeClassName(label),
                )}
                title={label}
              >
                {label}
              </span>
            ))}
            {hiddenLabelsCount > 0 ? (
              <span className="rounded-full border border-border-subtle bg-tray px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-clay-inset">
                +{hiddenLabelsCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
