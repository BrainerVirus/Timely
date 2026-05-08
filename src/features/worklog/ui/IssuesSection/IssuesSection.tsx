import { AuditFlagsSummary } from "@/features/worklog/ui/IssuesSection/internal/AuditFlagsSummary/AuditFlagsSummary";
import { IssuesContent } from "@/features/worklog/ui/IssuesSection/internal/IssuesContent/IssuesContent";

import type { AuditFlag, IssueBreakdown, IssueRouteReference } from "@/shared/types/dashboard";

interface IssuesSectionProps {
  title: string;
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
  dataKey: string;
  syncVersion?: number;
  onOpenIssue?: (reference: IssueRouteReference) => void;
  onAddIssueTime?: (reference: IssueRouteReference) => void;
}

export function IssuesSection({
  title,
  issues,
  auditFlags,
  dataKey,
  syncVersion,
  onOpenIssue,
  onAddIssueTime,
}: Readonly<IssuesSectionProps>) {
  const issueSetKey = issues.map((issue) => issue.key).join("|");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        <AuditFlagsSummary auditFlags={auditFlags} />
      </div>

      <IssuesContent
        key={issueSetKey}
        issues={issues}
        dataKey={dataKey}
        syncVersion={syncVersion}
        onOpenIssue={onOpenIssue}
        onAddIssueTime={onAddIssueTime}
      />
    </div>
  );
}
