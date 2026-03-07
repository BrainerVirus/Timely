import { cardItemVariants } from "@/lib/animations";
import { cn, formatHours } from "@/lib/utils";
import type { IssueBreakdown } from "@/types/dashboard";
import { motion } from "motion/react";

const toneBorder: Record<string, string> = {
  emerald: "border-l-accent/50",
  amber: "border-l-secondary/50",
  cyan: "border-l-primary/50",
  rose: "border-l-destructive/50",
  violet: "border-l-primary/50",
};

export function IssueCard({ issue }: { issue: IssueBreakdown }) {
  return (
    <motion.div
      variants={cardItemVariants}
      className={cn(
        "rounded-xl border border-border border-l-2 bg-muted p-3",
        toneBorder[issue.tone] ?? "border-l-primary/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide uppercase text-muted-foreground">
            {issue.key}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
            {issue.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground">
          {formatHours(issue.hours)}
        </span>
      </div>
    </motion.div>
  );
}
