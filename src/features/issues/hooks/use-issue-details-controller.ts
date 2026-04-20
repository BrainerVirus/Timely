import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createIssueComment,
  deleteIssueComment,
  loadIssueDetails,
  logIssueTime,
  updateIssueComment,
  updateIssueMetadata,
} from "@/app/desktop/TauriService/tauri";
import { toDateInputValue } from "@/shared/lib/date/date";

import type {
  IssueComposerMode,
  IssueDetailsLoadState,
} from "@/features/issues/types/issue-details";
import type {
  IssueDetailsSnapshot,
  IssueRouteReference,
  UpdateIssueMetadataInput,
} from "@/shared/types/dashboard";

interface UseIssueDetailsControllerOptions {
  issueReference: IssueRouteReference;
  initialSnapshot?: IssueDetailsSnapshot;
  onRefreshBootstrap?: () => Promise<void>;
}

export function useIssueDetailsController({
  issueReference,
  initialSnapshot,
  onRefreshBootstrap,
}: Readonly<UseIssueDetailsControllerOptions>) {
  const [loadState, setLoadState] = useState<IssueDetailsLoadState>(() =>
    initialSnapshot ? { status: "ready", details: initialSnapshot } : { status: "loading" },
  );
  const [composerMode, setComposerMode] = useState<IssueComposerMode>("write");
  const [commentBody, setCommentBody] = useState("");
  const [busyAction, setBusyAction] = useState<
    "comment" | "time" | "metadata" | "comment-edit" | "comment-delete" | null
  >(null);
  const [timeSpent, setTimeSpent] = useState("1h");
  const [spentDate, setSpentDate] = useState(() => new Date());
  const [summary, setSummary] = useState("");
  const [selectedState, setSelectedState] = useState(() => initialSnapshot?.state ?? "");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    () => initialSnapshot?.labels.map((label) => label.id) ?? [],
  );
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    () => initialSnapshot?.milestone?.id ?? null,
  );
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(
    () => initialSnapshot?.iteration?.id ?? null,
  );
  const [backgroundFetching, setBackgroundFetching] = useState(false);

  const details = loadState.status === "ready" ? loadState.details : null;

  const refreshDetails = useCallback(async () => {
    setLoadState((current) => (current.status === "ready" ? current : { status: "loading" }));
    setBackgroundFetching(true);

    try {
      const next = await loadIssueDetails(issueReference.provider, issueReference.issueId);
      setLoadState({ status: "ready", details: next });
    } catch (error) {
      setLoadState((current) =>
        current.status === "ready"
          ? current
          : {
              status: "error",
              message: error instanceof Error ? error.message : "Could not load issue details.",
            },
      );
    } finally {
      setBackgroundFetching(false);
    }
  }, [issueReference.issueId, issueReference.provider]);

  useEffect(() => {
    void refreshDetails();
  }, [refreshDetails]);

  useEffect(() => {
    if (!details) {
      return;
    }

    setSelectedState(details.state);
    setSelectedLabels(details.labels.map((label) => label.id));
    setSelectedMilestoneId(details.milestone?.id ?? null);
    setSelectedIterationId(details.iteration?.id ?? null);
  }, [details]);

  const metadataDirty = useMemo(() => {
    if (!details) {
      return false;
    }

    const currentLabels = details.labels.map((label) => label.id).sort();
    const draftLabels = [...selectedLabels].sort();
    const currentMilestoneId = details.milestone?.id ?? null;
    const currentIterationId = details.iteration?.id ?? null;

    return (
      details.state !== selectedState ||
      currentLabels.join("|") !== draftLabels.join("|") ||
      currentMilestoneId !== selectedMilestoneId ||
      currentIterationId !== selectedIterationId
    );
  }, [
    details,
    selectedIterationId,
    selectedLabels,
    selectedMilestoneId,
    selectedState,
  ]);

  const commitDetails = useCallback((next: IssueDetailsSnapshot) => {
    setLoadState({ status: "ready", details: next });
    setSelectedState(next.state);
    setSelectedLabels(next.labels.map((label) => label.id));
    setSelectedMilestoneId(next.milestone?.id ?? null);
    setSelectedIterationId(next.iteration?.id ?? null);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    if (!onRefreshBootstrap) {
      return;
    }

    try {
      await onRefreshBootstrap();
    } catch {
      // The issue page now loads live data directly, so bootstrap refresh is best effort only.
    }
  }, [onRefreshBootstrap]);

  const submitComment = useCallback(async () => {
    if (!details || !commentBody.trim()) {
      return;
    }

    setBusyAction("comment");
    try {
      await createIssueComment({
        reference: details.reference,
        body: commentBody.trim(),
      });
      setCommentBody("");
      await refreshDetails();
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [commentBody, details, refreshBootstrap, refreshDetails]);

  const submitTime = useCallback(async () => {
    if (!details) {
      return;
    }

    setBusyAction("time");
    try {
      await logIssueTime({
        reference: details.reference,
        timeSpent: timeSpent.trim(),
        spentAt: `${toDateInputValue(spentDate)}T12:00:00Z`,
        summary: summary.trim() || undefined,
      });
      setTimeSpent("1h");
      setSummary("");
      await refreshDetails();
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [details, refreshBootstrap, refreshDetails, spentDate, summary, timeSpent]);

  const saveMetadata = useCallback(async () => {
    if (!details || !metadataDirty) {
      return;
    }

    const input: UpdateIssueMetadataInput = {
      reference: details.reference,
      state: selectedState,
      labels: selectedLabels,
    };

    const currentMilestoneId = details.milestone?.id ?? null;
    if (selectedMilestoneId !== currentMilestoneId) {
      input.milestoneId = selectedMilestoneId;
    }

    const currentIterationId = details.iteration?.id ?? null;
    if (selectedIterationId !== currentIterationId) {
      input.iterationId = selectedIterationId;
    }

    setBusyAction("metadata");
    try {
      const next = await updateIssueMetadata(input);
      commitDetails(next);
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [
    commitDetails,
    details,
    metadataDirty,
    refreshBootstrap,
    selectedIterationId,
    selectedLabels,
    selectedMilestoneId,
    selectedState,
  ]);

  const editComment = useCallback(
    async (noteId: string, body: string) => {
      if (!details || !noteId || !body.trim()) {
        return;
      }

      setBusyAction("comment-edit");
      try {
        await updateIssueComment({
          reference: details.reference,
          noteId,
          body: body.trim(),
        });
        await refreshDetails();
        await refreshBootstrap();
      } finally {
        setBusyAction(null);
      }
    },
    [details, refreshBootstrap, refreshDetails],
  );

  const removeComment = useCallback(
    async (noteId: string) => {
      if (!details || !noteId) {
        return;
      }

      setBusyAction("comment-delete");
      try {
        await deleteIssueComment({
          reference: details.reference,
          noteId,
        });
        await refreshDetails();
        await refreshBootstrap();
      } finally {
        setBusyAction(null);
      }
    },
    [details, refreshBootstrap, refreshDetails],
  );

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabels((current) =>
      current.includes(labelId)
        ? current.filter((value) => value !== labelId)
        : [...current, labelId],
    );
  }, []);

  const toggleIssueState = useCallback(async () => {
    if (!details) {
      return;
    }

    const nextState = details.state === "closed" ? "opened" : "closed";
    setBusyAction("metadata");
    try {
      const next = await updateIssueMetadata({
        reference: details.reference,
        state: nextState,
        labels: selectedLabels,
      });
      commitDetails(next);
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [commitDetails, details, refreshBootstrap, selectedLabels]);

  const isHydrating = details != null && backgroundFetching;

  return {
    loadState,
    details,
    isHydrating,
    composerMode,
    setComposerMode,
    commentBody,
    setCommentBody,
    submitComment,
    editComment,
    removeComment,
    timeSpent,
    setTimeSpent,
    spentDate,
    setSpentDate,
    summary,
    setSummary,
    selectedState,
    setSelectedState,
    selectedLabels,
    selectedMilestoneId,
    setSelectedMilestoneId,
    selectedIterationId,
    setSelectedIterationId,
    toggleLabel,
    toggleIssueState,
    saveMetadata,
    busyAction,
    metadataDirty,
    submitTime,
    refreshDetails,
  };
}
