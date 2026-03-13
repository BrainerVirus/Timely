import { getIssueToneBorderClass } from "@/components/shared/issue-tone";
import { useFormatHours } from "@/hooks/use-format-hours";
import { cn } from "@/lib/utils";

import type { IssueBreakdown } from "@/types/dashboard";

export function IssueCard({ issue }: { issue: IssueBreakdown }) {
  const fh = useFormatHours();
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-l-[3px] border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        getIssueToneBorderClass(issue.tone),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{issue.key}</p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{issue.title}</h3>
        </div>
        <span className="shrink-0 rounded-lg border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-2.5 py-0.5 text-xs font-bold text-foreground shadow-[var(--shadow-clay)]">
          {fh(issue.hours)}
        </span>
      </div>
    </div>
  );
}
