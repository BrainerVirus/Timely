import { matchesIssueRouteReference } from "@/domains/issues/lib/issue-reference";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/Input/Input";

import type { AddIssueTimeDialogLabels } from "@/domains/issues/ui/AddIssueTimeDialog/AddIssueTimeDialog";
import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

interface AddIssueTimeIssuePickerProps {
  filter: string;
  filteredIssues: AssignedIssueSnapshot[];
  labels: AddIssueTimeDialogLabels;
  selectedIssue: AssignedIssueSnapshot | null;
  onFilterChange: (filter: string) => void;
  onSelectIssue: (issue: AssignedIssueSnapshot) => void;
}

export function AddIssueTimeIssuePicker({
  filter,
  filteredIssues,
  labels,
  selectedIssue,
  onFilterChange,
  onSelectIssue,
}: Readonly<AddIssueTimeIssuePickerProps>) {
  return (
    <section className="space-y-3 rounded-2xl border-2 border-border-subtle bg-card p-3 shadow-clay">
      <div className="space-y-1">
        <label htmlFor="issue-time-search" className="font-display text-sm font-semibold">
          {labels.issuePickerLabel}
        </label>
        <Input
          id="issue-time-search"
          value={filter}
          placeholder={labels.issuePickerPlaceholder}
          onChange={(event) => onFilterChange(event.target.value)}
        />
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto scroll-smooth overscroll-contain pr-1">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <button
              key={`${issue.provider}:${issue.issueId}`}
              type="button"
              className={cn(
                "w-full rounded-xl border-2 bg-field px-3 py-2 text-left shadow-clay-inset transition-all hover:border-border-strong hover:bg-field-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                selectedIssue && matchesIssueRouteReference(issue, selectedIssue)
                  ? "border-primary/60 bg-primary/10"
                  : "border-border-subtle",
              )}
              onClick={() => onSelectIssue(issue)}
            >
              <span className="block text-sm font-semibold text-foreground">{issue.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{issue.key}</span>
                <span>{formatProviderLabel(issue.provider)}</span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl border-2 border-border-subtle bg-field px-3 py-2 text-sm text-muted-foreground shadow-clay-inset">
            {labels.noResults}
          </p>
        )}
      </div>
    </section>
  );
}

function formatProviderLabel(provider: string) {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "gitlab") return "GitLab";
  if (normalized === "youtrack") return "YouTrack";
  return provider.trim();
}
