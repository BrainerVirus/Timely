import { useFormatHours } from "@/core/hooks/use-format-hours/use-format-hours";
import { cn } from "@/shared/utils/utils";

import type { IssueBreakdown } from "@/shared/types/dashboard";

const issueToneBorder = {
  emerald: "border-l-success",
  amber: "border-l-warning",
  cyan: "border-l-primary",
  rose: "border-l-destructive",
  violet: "border-l-secondary",
} as const;

interface IssueCardProps {
  issue: IssueBreakdown;
}

export function IssueCard({ issue }: Readonly<IssueCardProps>) {
  const fh = useFormatHours();

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-l-4 border-border-subtle bg-panel-elevated p-3 shadow-card transition-all hover:bg-panel",
        issueToneBorder[issue.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium text-foreground">{issue.title}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{issue.key}</p>
        </div>
        <span className="shrink-0 rounded-lg border-2 border-border-subtle bg-field px-2 py-0.5 text-sm font-semibold text-foreground tabular-nums shadow-clay-inset">
          {fh(issue.hours)}
        </span>
      </div>
    </div>
  );
}
