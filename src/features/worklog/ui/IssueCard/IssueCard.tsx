import { useRef } from "react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { schedulePrefetchIssueDetailsOnHover } from "@/domains/issues/lib/issue-details-session-cache";
import { getIssueRouteReference } from "@/domains/issues/lib/issue-reference";
import { cn } from "@/shared/lib/utils";

import type { IssueBreakdown, IssueRouteReference } from "@/shared/types/dashboard";
import type { KeyboardEvent } from "react";

const issueToneBorder = {
  emerald: "border-l-success",
  amber: "border-l-warning",
  cyan: "border-l-primary",
  rose: "border-l-destructive",
  violet: "border-l-secondary",
} as const;

interface IssueCardProps {
  issue: IssueBreakdown;
  syncVersion?: number;
  onOpenIssue?: (reference: IssueRouteReference) => void;
  onAddTime?: (reference: IssueRouteReference) => void;
}

export function IssueCard({
  issue,
  syncVersion = 0,
  onOpenIssue,
  onAddTime,
}: Readonly<IssueCardProps>) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const reference = getIssueRouteReference(issue);
  const canOpen = Boolean(onOpenIssue);
  const providerLabel = formatProviderLabel(issue.provider);
  const statusLabel = issue.statusLabel || issue.workflowStatus || issue.state;
  const cancelPrefetchRef = useRef<(() => void) | null>(null);

  const openIssue = () => {
    onOpenIssue?.(reference);
  };

  const handleMainKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!canOpen || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    openIssue();
  };

  return (
    <div
      onMouseEnter={() => {
        if (!canOpen) {
          return;
        }
        cancelPrefetchRef.current?.();
        cancelPrefetchRef.current = schedulePrefetchIssueDetailsOnHover(reference, { syncVersion });
      }}
      onMouseLeave={() => {
        cancelPrefetchRef.current?.();
        cancelPrefetchRef.current = null;
      }}
      onFocus={() => {
        if (!canOpen) {
          return;
        }
        cancelPrefetchRef.current = schedulePrefetchIssueDetailsOnHover(reference, { syncVersion });
      }}
      className={cn(
        "rounded-xl border-2 border-l-4 border-border-subtle bg-panel-elevated p-3 shadow-card transition-all hover:bg-panel focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        canOpen && "cursor-pointer hover:border-border-strong",
        issueToneBorder[issue.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          disabled={!canOpen}
          onClick={canOpen ? openIssue : undefined}
          onKeyDown={handleMainKeyDown}
          className="min-w-0 flex-1 cursor-inherit rounded-lg text-left disabled:cursor-default disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <p className="text-sm leading-snug font-medium text-foreground">{issue.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="truncate font-mono text-xs text-muted-foreground">{issue.key}</span>
            {statusLabel ? (
              <span className="rounded-full border border-border-subtle bg-field px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-clay-inset">
                {statusLabel}
              </span>
            ) : null}
            {providerLabel ? (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-clay-inset">
                {providerLabel}
              </span>
            ) : null}
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-lg border-2 border-border-subtle bg-field px-2 py-0.5 text-sm font-semibold text-foreground tabular-nums shadow-clay-inset">
            {fh(issue.hours)}
          </span>
          {onAddTime ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddTime(reference);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
              className="rounded-lg border-2 border-border-subtle bg-field px-2 py-1 text-xs font-semibold text-foreground shadow-clay transition-all hover:border-border-strong hover:bg-field-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("issues.logTimeSection")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (!normalized || normalized === "gitlab") {
    return normalized === "gitlab" ? "GitLab" : "";
  }
  if (normalized === "youtrack") {
    return "YouTrack";
  }
  return provider.trim();
}
