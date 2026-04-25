import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssueListRow/AssignedIssueListRow";
import {
  getWorkflowColumnId,
  workflowStatusFilterLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

interface HomeAssignedIssuesSectionProps {
  issues: AssignedIssueSnapshot[];
  syncVersion: number;
  onOpenBoard: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
}

export function HomeAssignedIssuesSection({
  issues,
  syncVersion,
  onOpenBoard,
  onOpenIssue,
}: Readonly<HomeAssignedIssuesSectionProps>) {
  const { t } = useI18n();

  if (issues.length === 0) {
    return null;
  }

  const preview = issues.slice(0, 5);
  const total = issues.length;

  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("home.assignedIssuesTitle")}
          </h2>
          <Badge
            tone="on_track"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-normal normal-case shadow-none",
            )}
            aria-label={t("home.assignedIssuesCountBadge", { count: total })}
          >
            {total}
          </Badge>
        </div>
        <Button type="button" variant="soft" size="sm" onClick={onOpenBoard}>
          {t("home.assignedIssuesOpenBoard")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div role="list" className="space-y-2.5">
        {preview.map((issue) => (
          <AssignedIssueListRow
            key={issue.key}
            issue={issue}
            workflowLabel={workflowStatusFilterLabel(getWorkflowColumnId(issue), t)}
            onOpen={() => onOpenIssue(issue)}
            syncVersion={syncVersion}
          />
        ))}
      </div>
    </section>
  );
}
