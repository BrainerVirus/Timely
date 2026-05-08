import { useEffect, useMemo, useState } from "react";
import {
  durationPartsToTotalMinutes,
  formatDurationForProvider,
} from "@/domains/issues/lib/duration";
import { matchesIssueRouteReference } from "@/domains/issues/lib/issue-reference";
import { AddIssueTimeIssuePicker } from "@/domains/issues/ui/AddIssueTimeDialog/internal/AddIssueTimeIssuePicker";
import {
  DurationInput,
  type DurationInputLabels,
} from "@/domains/issues/ui/DurationInput/DurationInput";
import { Button } from "@/shared/ui/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/Dialog/Dialog";
import { Input } from "@/shared/ui/Input/Input";

import type { DurationParts } from "@/domains/issues/types/duration";
import type {
  AssignedIssueSnapshot,
  IssueReference,
  IssueRouteReference,
} from "@/shared/types/dashboard";
import type { FormEvent } from "react";

export interface AddIssueTimeSubmitInput {
  reference: IssueReference;
  timeSpent: string;
  spentAt: string;
  summary?: string;
}

interface AddIssueTimeDialogProps {
  open: boolean;
  assignedIssues: AssignedIssueSnapshot[];
  defaultDate: string;
  initialIssueReference: IssueRouteReference | null;
  locale: string;
  labels: AddIssueTimeDialogLabels;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddIssueTimeSubmitInput) => Promise<void>;
}

export interface AddIssueTimeDialogLabels {
  title: string;
  description: string;
  issuePickerLabel: string;
  issuePickerPlaceholder: string;
  selectedIssue: string;
  chooseIssueToContinue: string;
  noResults: string;
  spentDate: string;
  summaryOptional: string;
  summaryField: string;
  close: string;
  loading: string;
  submit: string;
  durationInput: DurationInputLabels;
}

const zeroDuration: DurationParts = { weeks: 0, days: 0, hours: 0, minutes: 0 };

export function AddIssueTimeDialog({
  open,
  assignedIssues,
  defaultDate,
  initialIssueReference,
  locale,
  labels,
  submitting,
  onOpenChange,
  onSubmit,
}: Readonly<AddIssueTimeDialogProps>) {
  const [filter, setFilter] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<AssignedIssueSnapshot | null>(null);
  const [durationParts, setDurationParts] = useState<DurationParts>(zeroDuration);
  const [spentDate, setSpentDate] = useState(defaultDate);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setFilter("");
    setSelectedIssue(
      initialIssueReference
        ? (assignedIssues.find((issue) => matchesIssueRouteReference(issue, initialIssueReference)) ??
            null)
        : null,
    );
    setDurationParts(zeroDuration);
    setSpentDate(defaultDate);
    setSummary("");
  }, [assignedIssues, defaultDate, initialIssueReference, open]);

  const filteredIssues = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();

    if (!normalizedFilter) {
      return assignedIssues;
    }

    return assignedIssues.filter((issue) => {
      const searchable = `${issue.key} ${issue.title} ${issue.provider}`.toLowerCase();
      return searchable.includes(normalizedFilter);
    });
  }, [assignedIssues, filter]);

  const canSubmit = selectedIssue !== null && durationPartsToTotalMinutes(durationParts) > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedIssue || !canSubmit || submitting) {
      return;
    }

    await onSubmit({
      reference: {
        provider: selectedIssue.provider,
        issueId: selectedIssue.issueId,
        providerIssueRef: selectedIssue.providerIssueRef,
      },
      timeSpent: formatDurationForProvider(durationParts, selectedIssue.provider),
      spentAt: `${spentDate}T12:00:00Z`,
      summary: summary.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto scroll-smooth overscroll-contain sm:max-w-2xl"
        closeButtonAriaLabel={labels.close}
      >
        <DialogHeader>
          <DialogTitle className="font-display">{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <AddIssueTimeIssuePicker
            filter={filter}
            filteredIssues={filteredIssues}
            labels={labels}
            selectedIssue={selectedIssue}
            onFilterChange={setFilter}
            onSelectIssue={setSelectedIssue}
          />

          <section className="rounded-2xl border-2 border-border-subtle bg-card p-3 shadow-clay">
            <h3 className="font-display text-sm font-semibold">{labels.selectedIssue}</h3>
            {selectedIssue ? (
              <div className="mt-2 rounded-xl border-2 border-primary/25 bg-primary/10 px-3 py-2 shadow-clay-inset">
                <p className="text-sm font-semibold text-foreground">{selectedIssue.title}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIssue.key}</p>
              </div>
            ) : (
              <p className="mt-2 rounded-xl border-2 border-border-subtle bg-field px-3 py-2 text-sm text-muted-foreground shadow-clay-inset">
                {labels.chooseIssueToContinue}
              </p>
            )}
          </section>

          <DurationInput
            value={durationParts}
            locale={locale}
            labels={labels.durationInput}
            disabled={submitting}
            onChange={setDurationParts}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">
              <span>{labels.spentDate}</span>
              <Input
                aria-label={labels.spentDate}
                type="date"
                value={spentDate}
                disabled={submitting}
                onChange={(event) => setSpentDate(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-semibold">
              <span>{labels.summaryOptional}</span>
              <Input
                aria-label={labels.summaryField}
                value={summary}
                disabled={submitting}
                onChange={(event) => setSummary(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>
              {labels.close}
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? labels.loading : labels.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
