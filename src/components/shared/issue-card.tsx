import { m } from "motion/react";
import { getIssueToneBorderClass } from "@/components/shared/issue-tone";
import { cardItemVariants } from "@/lib/animations";
import { cn, formatHours } from "@/lib/utils";

import type { IssueBreakdown } from "@/types/dashboard";

export function IssueCard({ issue }: { issue: IssueBreakdown }) {
  return (
    <m.div
      variants={cardItemVariants}
      className={cn(
        "rounded-xl border border-l-2 border-border bg-muted p-3",
        getIssueToneBorderClass(issue.tone),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{issue.key}</p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{issue.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground">
          {formatHours(issue.hours)}
        </span>
      </div>
    </m.div>
  );
}
