import type {
  AssignedIssueSnapshot,
  IssueDetailsCapabilities,
  IssueDetailsSnapshot,
  IssueIterationDetails,
  IssueMetadataOption,
} from "@/shared/types/dashboard";

const DISABLED_CAPABILITIES: IssueDetailsCapabilities = {
  status: { enabled: false, options: [] },
  labels: { enabled: false, options: [] },
  iteration: { enabled: false, options: [] },
  milestone: { enabled: false, options: [] },
  composer: { enabled: false, modes: ["write"], supportsQuickActions: false },
  timeTracking: { enabled: false, supportsQuickActions: false },
};

function toIterationDetails(summary: AssignedIssueSnapshot): IssueIterationDetails | undefined {
  const label = summary.iterationTitle?.trim();
  if (!label) {
    return undefined;
  }
  const id =
    summary.iterationGitlabId ?? summary.iterationCadenceId ?? summary.iterationGroupId ?? label;

  return {
    id,
    label,
    startDate: summary.iterationStartDate,
    dueDate: summary.iterationDueDate,
  };
}

function toLabelOptions(summary: AssignedIssueSnapshot): IssueMetadataOption[] {
  return summary.labels.map((label) => ({ id: label, label }));
}

/**
 * Build a minimal `IssueDetailsSnapshot` stub from an assigned-issue summary so
 * the hub page can render basic metadata immediately while full details load.
 *
 * Fields that are not present in the summary (description, activity, linked
 * items, author, capabilities) remain undefined/empty so the UI can render
 * per-field skeletons until the real snapshot arrives.
 */
export function buildOptimisticIssueDetails(summary: AssignedIssueSnapshot): IssueDetailsSnapshot {
  return {
    reference: {
      provider: summary.provider,
      issueId: summary.issueId,
      providerIssueRef: summary.providerIssueRef,
    },
    key: summary.key,
    title: summary.title,
    state: summary.state,
    status: summary.statusLabel
      ? { id: summary.statusLabel, label: summary.statusLabel }
      : undefined,
    updatedAt: summary.updatedAt,
    webUrl: summary.webUrl,
    startDate: summary.startDate,
    dueDate: summary.dueDate,
    labels: toLabelOptions(summary),
    milestoneTitle: summary.milestoneTitle,
    iteration: toIterationDetails(summary),
    activity: [],
    capabilities: DISABLED_CAPABILITIES,
  };
}

export function findOptimisticIssueDetails(
  assignedIssues: readonly AssignedIssueSnapshot[],
  provider: string,
  issueId: string,
): IssueDetailsSnapshot | undefined {
  const match = assignedIssues.find(
    (issue) => issue.provider === provider && issue.issueId === issueId,
  );
  return match ? buildOptimisticIssueDetails(match) : undefined;
}
