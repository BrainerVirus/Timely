import {
  getWorkflowColumnId,
  type WorkflowColumnId,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { cn } from "@/shared/lib/utils";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

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

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "w-full rounded-xl border-2 border-l-4 border-border-subtle bg-panel-elevated p-3 text-left shadow-card transition-all hover:bg-panel",
          workflowBorder[wf],
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm leading-snug font-medium text-foreground">{issue.title}</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{issue.key}</p>
            {issue.iterationTitle ? (
              <p className="text-xs text-muted-foreground">{issue.iterationTitle}</p>
            ) : null}
            {issue.milestoneTitle ? (
              <p className="text-xs text-muted-foreground/90">{issue.milestoneTitle}</p>
            ) : null}
            {issue.iterationStartDate && issue.iterationDueDate ? (
              <p className="text-[11px] text-muted-foreground">
                {issue.iterationStartDate} → {issue.iterationDueDate}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1 pt-1">
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  issue.state.toLowerCase() === "closed"
                    ? "border-border-subtle bg-muted/40 text-muted-foreground"
                    : "border-success/35 bg-success/10 text-success",
                )}
              >
                {issue.state}
              </span>
              <span className="rounded-md border border-border-subtle bg-tray px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {workflowLabel}
              </span>
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="max-w-full truncate rounded-md border border-border-subtle bg-field px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={label}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}
