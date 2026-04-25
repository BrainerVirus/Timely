import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createIssueComment,
  deleteIssue,
  deleteIssueComment,
  loadIssueActivityPage,
  logIssueTime,
  updateIssueComment,
  updateIssueMetadata,
} from "@/app/desktop/TauriService/tauri";
import {
  loadOrRevalidateIssueDetails,
  setCachedIssueDetails,
} from "@/features/issues/lib/issue-details-session-cache";
import { toDateInputValue } from "@/shared/lib/date/date";

import type {
  IssueComposerMode,
  IssueDetailsLoadState,
} from "@/features/issues/types/issue-details";
import type {
  AssignedIssueSnapshot,
  IssueDetailsSnapshot,
  IssueRouteReference,
  UpdateIssueMetadataInput,
} from "@/shared/types/dashboard";

interface UseIssueDetailsControllerOptions {
  issueReference: IssueRouteReference;
  initialSnapshot?: IssueDetailsSnapshot;
  assignedIssues?: readonly AssignedIssueSnapshot[];
  syncVersion: number;
  onRefreshBootstrap?: () => Promise<void>;
}

export function useIssueDetailsController({
  issueReference,
  initialSnapshot,
  assignedIssues,
  syncVersion,
  onRefreshBootstrap,
}: Readonly<UseIssueDetailsControllerOptions>) {
  const [loadState, setLoadState] = useState<IssueDetailsLoadState>(() =>
    initialSnapshot ? { status: "ready", details: initialSnapshot } : { status: "loading" },
  );
  const [composerMode, setComposerMode] = useState<IssueComposerMode>("write");
  const [commentBody, setCommentBody] = useState("");
  const [busyAction, setBusyAction] = useState<
    | "comment"
    | "time"
    | "metadata"
    | "description"
    | "comment-edit"
    | "comment-delete"
    | "issue-delete"
    | null
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
  const [activityItems, setActivityItems] = useState<IssueDetailsSnapshot["activity"]>(
    () => initialSnapshot?.activity ?? [],
  );
  const [activityHasMore, setActivityHasMore] = useState(
    () => initialSnapshot?.activityHasNextPage ?? false,
  );
  const [activityNextPage, setActivityNextPage] = useState<number | null>(
    () => initialSnapshot?.activityNextPage ?? null,
  );
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const details = loadState.status === "ready" ? loadState.details : null;
  const detailsRef = useRef<IssueDetailsSnapshot | null>(null);
  detailsRef.current = details;
  const issueKey = `${issueReference.provider}:${issueReference.issueId}`;

  useEffect(() => {
    setRefreshError(null);
    if (initialSnapshot) {
      setLoadState({ status: "ready", details: initialSnapshot });
      setActivityItems(initialSnapshot.activity);
      setActivityHasMore(initialSnapshot.activityHasNextPage ?? false);
      setActivityNextPage(initialSnapshot.activityNextPage ?? null);
      return;
    }

    setLoadState({ status: "loading" });
    setActivityItems([]);
    setActivityHasMore(false);
    setActivityNextPage(null);
  }, [initialSnapshot, issueKey]);

  const refreshDetails = useCallback(async () => {
    setLoadState((current) => {
      if (
        current.status === "ready" &&
        current.details.reference.provider === issueReference.provider &&
        current.details.reference.issueId === issueReference.issueId
      ) {
        return current;
      }

      return { status: "loading" };
    });
    setBackgroundFetching(true);
    setRefreshError(null);

    try {
      const { snapshot: next } = await loadOrRevalidateIssueDetails(
        {
          provider: issueReference.provider,
          issueId: issueReference.issueId,
        },
        {
          syncVersion,
          assignedIssues,
          source: "hub",
        },
      );
      setLoadState({ status: "ready", details: next });
      setActivityItems(next.activity);
      setActivityHasMore(next.activityHasNextPage ?? false);
      setActivityNextPage(next.activityNextPage ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load issue details.";
      setLoadState((current) =>
        current.status === "ready"
          ? current
          : {
              status: "error",
              message,
            },
      );
      if (detailsRef.current) {
        setRefreshError(message);
      }
    } finally {
      setBackgroundFetching(false);
    }
  }, [assignedIssues, issueReference.issueId, issueReference.provider, syncVersion]);

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

    const currentLabels = details.labels
      .map((label) => label.id)
      .sort((left, right) => left.localeCompare(right));
    const draftLabels = [...selectedLabels].sort((left, right) => left.localeCompare(right));
    const currentMilestoneId = details.milestone?.id ?? null;
    const currentIterationId = details.iteration?.id ?? null;

    return (
      details.state !== selectedState ||
      currentLabels.join("|") !== draftLabels.join("|") ||
      currentMilestoneId !== selectedMilestoneId ||
      currentIterationId !== selectedIterationId
    );
  }, [details, selectedIterationId, selectedLabels, selectedMilestoneId, selectedState]);

  const commitDetails = useCallback(
    (next: IssueDetailsSnapshot) => {
      setCachedIssueDetails(
        {
          provider: issueReference.provider,
          issueId: issueReference.issueId,
        },
        next,
        syncVersion,
      );
      setLoadState({ status: "ready", details: next });
      setSelectedState(next.state);
      setSelectedLabels(next.labels.map((label) => label.id));
      setSelectedMilestoneId(next.milestone?.id ?? null);
      setSelectedIterationId(next.iteration?.id ?? null);
      setActivityItems(next.activity);
      setActivityHasMore(next.activityHasNextPage ?? false);
      setActivityNextPage(next.activityNextPage ?? null);
    },
    [issueReference.issueId, issueReference.provider, syncVersion],
  );

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

  const saveDescription = useCallback(
    async (body: string) => {
      if (!details) {
        return;
      }

      setBusyAction("description");
      try {
        const next = await updateIssueMetadata({
          reference: details.reference,
          description: body,
        });
        commitDetails(next);
        await refreshBootstrap();
      } finally {
        setBusyAction(null);
      }
    },
    [commitDetails, details, refreshBootstrap],
  );

  const isHydrating = details != null && backgroundFetching;

  const loadMoreActivity = useCallback(async () => {
    if (!details || activityLoadingMore || !activityHasMore || activityNextPage == null) {
      return;
    }

    setActivityLoadingMore(true);
    try {
      const page = await loadIssueActivityPage({
        reference: details.reference,
        page: activityNextPage,
      });
      setActivityItems((current) => [...current, ...page.items]);
      setActivityHasMore(page.hasNextPage);
      setActivityNextPage(page.nextPage ?? null);
    } finally {
      setActivityLoadingMore(false);
    }
  }, [activityHasMore, activityLoadingMore, activityNextPage, details]);

  const removeIssue = useCallback(async () => {
    if (!details) {
      return;
    }
    setBusyAction("issue-delete");
    try {
      await deleteIssue({ reference: details.reference });
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [details, refreshBootstrap]);

  return {
    loadState,
    details,
    refreshError,
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
    saveDescription,
    busyAction,
    removeIssue,
    metadataDirty,
    submitTime,
    refreshDetails,
    activityItems,
    activityHasMore,
    activityLoadingMore,
    loadMoreActivity,
  };
}
