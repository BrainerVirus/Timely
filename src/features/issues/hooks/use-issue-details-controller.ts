import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createIssueComment,
  loadIssueDetails,
  logIssueTime,
  updateIssueMetadata,
} from "@/app/desktop/TauriService/tauri";
import { toDateInputValue } from "@/shared/lib/date/date";

import type { IssueComposerMode, IssueDetailsLoadState } from "@/features/issues/types/issue-details";
import type {
  IssueDetailsSnapshot,
  IssueRouteReference,
  UpdateIssueMetadataInput,
} from "@/shared/types/dashboard";

interface UseIssueDetailsControllerOptions {
  issueReference: IssueRouteReference;
  onRefreshBootstrap?: () => Promise<void>;
}

export function useIssueDetailsController({
  issueReference,
  onRefreshBootstrap,
}: Readonly<UseIssueDetailsControllerOptions>) {
  const [loadState, setLoadState] = useState<IssueDetailsLoadState>({ status: "loading" });
  const [composerMode, setComposerMode] = useState<IssueComposerMode>("write");
  const [commentBody, setCommentBody] = useState("");
  const [busyAction, setBusyAction] = useState<"comment" | "time" | "metadata" | null>(null);
  const [timeSpent, setTimeSpent] = useState("1h");
  const [spentDate, setSpentDate] = useState(() => new Date());
  const [summary, setSummary] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const details = loadState.status === "ready" ? loadState.details : null;

  const refreshDetails = useCallback(async () => {
    setLoadState((current) => (current.status === "ready" ? current : { status: "loading" }));

    try {
      const next = await loadIssueDetails(issueReference.provider, issueReference.issueId);
      setLoadState({ status: "ready", details: next });
    } catch (error) {
      setLoadState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load issue details.",
      });
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
  }, [details]);

  const metadataDirty = useMemo(() => {
    if (!details) {
      return false;
    }

    const currentLabels = details.labels.map((label) => label.id).sort();
    const draftLabels = [...selectedLabels].sort();

    return details.state !== selectedState || currentLabels.join("|") !== draftLabels.join("|");
  }, [details, selectedLabels, selectedState]);

  const commitDetails = useCallback((next: IssueDetailsSnapshot) => {
    setLoadState({ status: "ready", details: next });
    setSelectedState(next.state);
    setSelectedLabels(next.labels.map((label) => label.id));
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

    setBusyAction("metadata");
    try {
      const next = await updateIssueMetadata(input);
      commitDetails(next);
      await refreshBootstrap();
    } finally {
      setBusyAction(null);
    }
  }, [commitDetails, details, metadataDirty, refreshBootstrap, selectedLabels, selectedState]);

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabels((current) =>
      current.includes(labelId)
        ? current.filter((value) => value !== labelId)
        : [...current, labelId],
    );
  }, []);

  return {
    loadState,
    details,
    composerMode,
    setComposerMode,
    commentBody,
    setCommentBody,
    submitComment,
    timeSpent,
    setTimeSpent,
    spentDate,
    setSpentDate,
    summary,
    setSummary,
    selectedState,
    setSelectedState,
    selectedLabels,
    toggleLabel,
    saveMetadata,
    busyAction,
    metadataDirty,
    submitTime,
    refreshDetails,
  };
}
