import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import { m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { openExternalUrl } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { formatIssueTimestamp } from "@/features/issues/lib/issue-date-format";
import { useIssueCodeThemePreference } from "@/features/issues/hooks/use-issue-code-theme-preference";
import {
  getIssueDetailsSeed,
  schedulePrefetchIssueDetailsOnHover,
} from "@/features/issues/lib/issue-details-session-cache";
import { useIssueDetailsController } from "@/features/issues/hooks/use-issue-details-controller";
import type { IssueComposerMode } from "@/features/issues/types/issue-details";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";
import { getAssignedIssueStateBadgeClassName } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { IssueDetailsSkeleton } from "@/features/issues/ui/IssueDetailsSkeleton/IssueDetailsSkeleton";
import { Skeleton } from "boneyard-js/react";
import { staggerItem } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/Dialog/Dialog";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/Popover/Popover";

import type { BootstrapPayload, IssueRouteReference } from "@/shared/types/dashboard";

function overflowAllowsScroll(value: string): boolean {
  return value === "auto" || value === "scroll" || value === "overlay";
}

/** Walks up from `element` to find the nearest vertical scroll container (e.g. MainLayout outlet scroller). */
function getNearestScrollParent(element: HTMLElement | null): HTMLElement | null {
  let el = element?.parentElement ?? null;

  while (el) {
    const style = getComputedStyle(el);
    if (overflowAllowsScroll(style.overflowY) || overflowAllowsScroll(style.overflow)) {
      return el;
    }

    el = el.parentElement;
  }

  return null;
}

interface IssueHubPageProps {
  payload: BootstrapPayload;
  issueReference: IssueRouteReference;
  syncVersion: number;
  onBack: () => void;
  onRefreshBootstrap: () => Promise<void>;
  onOpenIssue: (reference: IssueRouteReference) => void;
  currentUsername?: string;
}

export function IssueHubPage({
  payload,
  issueReference,
  syncVersion,
  onBack,
  onRefreshBootstrap,
  onOpenIssue,
  currentUsername,
}: Readonly<IssueHubPageProps>) {
  const { locale, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const hubRootRef = useRef<HTMLDivElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stickyMenuOpen, setStickyMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionComposerMode, setDescriptionComposerMode] =
    useState<IssueComposerMode>("write");
  const issueDetailsSeed = getIssueDetailsSeed(issueReference, {
    syncVersion,
    assignedIssues: payload.assignedIssues ?? [],
  });

  const controller = useIssueDetailsController({
    issueReference,
    initialSnapshot: issueDetailsSeed.snapshot,
    assignedIssues: payload.assignedIssues ?? [],
    syncVersion,
    onRefreshBootstrap,
  });
  const issueCodeTheme = useIssueCodeThemePreference();
  const handlePrefetchLinkedIssue = useCallback(
    (reference: IssueRouteReference) => {
      schedulePrefetchIssueDetailsOnHover(reference, {
        syncVersion,
        assignedIssues: payload.assignedIssues ?? [],
      });
    },
    [payload.assignedIssues, syncVersion],
  );

  const detailsTimestamp =
    controller.details?.createdAt != null
      ? formatIssueTimestamp(locale, controller.details.createdAt, payload.schedule.timezone)
      : "";

  const handleSubmitTime = useCallback(async () => {
    try {
      await controller.submitTime();
      toast.success(t("issues.timeLogged"));
    } catch (error) {
      toast.error(t("issues.timeLogFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
    }
  }, [controller, t]);

  const handleSubmitNote = useCallback(async () => {
    try {
      await controller.submitComment();
      toast.success(t("issues.noteAdded"));
    } catch (error) {
      toast.error(t("issues.noteFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
    }
  }, [controller, t]);

  const handleEditComment = useCallback(
    async (noteId: string, body: string) => {
      try {
        await controller.editComment(noteId, body);
        toast.success(t("issues.commentUpdated"));
      } catch (error) {
        toast.error(t("issues.commentUpdateFailed"), {
          description: error instanceof Error ? error.message : t("settings.tryAgain"),
        });
      }
    },
    [controller, t],
  );

  const handleDeleteComment = useCallback(
    async (noteId: string) => {
      try {
        await controller.removeComment(noteId);
        toast.success(t("issues.commentDeleted"));
      } catch (error) {
        toast.error(t("issues.commentDeleteFailed"), {
          description: error instanceof Error ? error.message : t("settings.tryAgain"),
        });
      }
    },
    [controller, t],
  );

  const handleSaveMetadata = useCallback(async () => {
    try {
      await controller.saveMetadata();
      toast.success(t("issues.metadataSaved"));
    } catch (error) {
      toast.error(t("issues.metadataSaveFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
    }
  }, [controller, t]);

  const handleDeleteIssue = useCallback(async () => {
    try {
      await controller.removeIssue();
      setConfirmDeleteOpen(false);
      toast.success(t("issues.issueDeleted"));
      onBack();
    } catch (error) {
      toast.error(t("issues.issueDeleteFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
    }
  }, [controller, onBack, t]);

  const handleSaveDescription = useCallback(
    async (body: string) => {
      try {
        await controller.saveDescription(body);
        setEditingDescription(false);
        toast.success(t("issues.descriptionSaved"));
      } catch (error) {
        toast.error(t("issues.descriptionSaveFailed"), {
          description: error instanceof Error ? error.message : t("settings.tryAgain"),
        });
        throw error;
      }
    },
    [controller, t],
  );

  const startDescriptionEdit = useCallback(() => {
    if (!controller.details) {
      return;
    }
    setEditingDescription(true);
    setDescriptionDraft(controller.details.description ?? "");
    setDescriptionComposerMode("write");
  }, [controller.details]);

  const cancelDescriptionEdit = useCallback(() => {
    setEditingDescription(false);
    setDescriptionDraft("");
  }, []);

  const detailsUrl = controller.details?.webUrl ?? null;
  const canEditIssueDescription =
    controller.loadState.status === "ready" &&
    controller.loadState.details.reference.provider === "gitlab";

  useEffect(() => {
    setStickyVisible(false);
    setStickyMenuOpen(false);
    setMenuOpen(false);

    const scrollParent = getNearestScrollParent(hubRootRef.current);
    if (scrollParent) {
      scrollParent.scrollTop = 0;
    }
  }, [issueReference.issueId, issueReference.provider]);

  useEffect(() => {
    if (!headerRef.current || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry?.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [controller.details?.reference.issueId, controller.loadState.status]);

  useEffect(() => {
    setEditingDescription(false);
    setDescriptionDraft("");
  }, [issueReference.issueId, issueReference.provider]);

  return (
    <div ref={hubRootRef} className="min-h-full bg-page-canvas pb-10">
      <div
        className={cn(
          "-mx-6 hidden xl:block sticky top-0 z-20 h-0",
          stickyVisible ? "pointer-events-auto" : "pointer-events-none",
        )}
        data-testid="issue-sticky-bar"
        data-visible={stickyVisible ? "true" : "false"}
      >
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            stickyVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "border-b-2 border-border-subtle bg-linear-to-b from-app-bar/96 to-page-header/94 px-6 py-2.5 shadow-shell-top-bar backdrop-blur-md transition duration-200",
                stickyVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
              )}
            >
            <div className="mx-auto grid max-w-[min(100%,108rem)] grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {controller.details ? (
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.78rem] font-semibold normal-case tracking-normal shadow-none",
                      getAssignedIssueStateBadgeClassName(controller.details.state),
                    )}
                  >
                    {statusLabel(controller.details.state, t)}
                  </Badge>
                ) : null}
                <p className="truncate font-display text-base font-semibold text-foreground">
                  {controller.details?.title ?? t("issues.hubPageTitle")}
                </p>
              </div>
              <div className="flex items-center justify-self-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 shrink-0 gap-2 rounded-xl px-4"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("issues.hubBack")}
                </Button>
                <IssueActionsMenu
                  open={stickyMenuOpen}
                  onOpenChange={setStickyMenuOpen}
                  canEditIssueDescription={canEditIssueDescription}
                  detailsUrl={detailsUrl}
                  busy={controller.busyAction !== null}
                  onEditDescription={startDescriptionEdit}
                  onOpenDelete={() => setConfirmDeleteOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <StaggerGroup
        className="mx-auto max-w-[min(100%,108rem)] space-y-10"
        allowDecorativeAnimation={allowDecorativeAnimation}
        windowVisibility={windowVisibility}
      >
        {controller.loadState.status === "error" ? (
          <m.section
            variants={staggerItem}
            className="space-y-4 rounded-[1.75rem] border-2 border-border-subtle bg-panel/80 p-6 shadow-clay"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("issues.loadDetailsFailed")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{controller.loadState.message}</p>
            </div>
            <Button type="button" onClick={() => void controller.refreshDetails()}>
              {t("common.retry")}
            </Button>
          </m.section>
        ) : (
          <Skeleton
            name="issue-hub-page"
            loading={controller.loadState.status === "loading"}
            animate="shimmer"
            transition={300}
            fallback={
              <>
                <span className="sr-only">{t("issues.loadingDetails")}</span>
                <IssueDetailsSkeleton />
              </>
            }
          >
            {controller.loadState.status === "ready" ? (
              <>
                <m.header variants={staggerItem} className="space-y-4">
                  {controller.refreshError ? (
                    <div className="rounded-[1.1rem] border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p>{controller.refreshError}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-3 text-xs"
                          onClick={() => void controller.refreshDetails()}
                        >
                          {t("common.retry")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div
                    className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
                    ref={headerRef}
                  >
                    <div className="min-w-0 space-y-2">
                      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                        {controller.details?.title ?? t("issues.hubPageTitle")}
                      </h1>
                      {controller.details ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge
                              className={cn(
                                "rounded-full px-3 py-1 text-[0.78rem] font-semibold normal-case tracking-normal shadow-none",
                                getAssignedIssueStateBadgeClassName(controller.details.state),
                              )}
                            >
                              {statusLabel(controller.details.state, t)}
                            </Badge>
                            <span className="font-mono text-sm">{controller.details.key}</span>
                          </div>
                          {controller.details.author && controller.details.createdAt ? (
                            <p className="text-sm text-muted-foreground">
                              {t("issues.createdByMeta", {
                                author: controller.details.author.name,
                                createdAt: detailsTimestamp,
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-self-start gap-3 pt-1 md:justify-self-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 shrink-0 gap-2 rounded-xl px-4"
                        onClick={onBack}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t("issues.hubBack")}
                      </Button>
                      <IssueActionsMenu
                        open={menuOpen}
                        onOpenChange={setMenuOpen}
                        canEditIssueDescription={canEditIssueDescription}
                        detailsUrl={detailsUrl}
                        busy={controller.busyAction !== null}
                        onEditDescription={startDescriptionEdit}
                        onOpenDelete={() => setConfirmDeleteOpen(true)}
                      />
                    </div>
                  </div>
                </m.header>

                <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20.5rem]">
                  <m.div variants={staggerItem} className="min-w-0">
                    <IssueDetailsMainSection
                      details={controller.loadState.details}
                      timezone={payload.schedule.timezone}
                      codeTheme={issueCodeTheme}
                      composerMode={controller.composerMode}
                      commentBody={controller.commentBody}
                      busy={controller.busyAction !== null}
                      isHydrating={controller.isHydrating}
                      currentUsername={currentUsername}
                      onComposerModeChange={controller.setComposerMode}
                      onCommentBodyChange={controller.setCommentBody}
                      onSubmitComment={handleSubmitNote}
                      onToggleIssueState={controller.toggleIssueState}
                      onOpenIssue={onOpenIssue}
                      onPrefetchLinkedIssue={handlePrefetchLinkedIssue}
                      onEditComment={handleEditComment}
                      onDeleteComment={handleDeleteComment}
                      activityItems={controller.activityItems}
                      activityHasMore={controller.activityHasMore}
                      activityLoadingMore={controller.activityLoadingMore}
                      onLoadMoreActivity={controller.loadMoreActivity}
                      descriptionEditing={editingDescription}
                      descriptionDraft={descriptionDraft}
                      descriptionComposerMode={descriptionComposerMode}
                      onDescriptionDraftChange={setDescriptionDraft}
                      onDescriptionComposerModeChange={setDescriptionComposerMode}
                      onCancelDescriptionEdit={cancelDescriptionEdit}
                      onSaveDescription={
                        controller.loadState.details.reference.provider === "gitlab"
                          ? handleSaveDescription
                          : undefined
                      }
                    />
                  </m.div>
                  <m.div variants={staggerItem} className="min-w-0 xl:min-w-[20.5rem]">
                    <IssueDetailsSidebarSection
                      details={controller.loadState.details}
                      schedule={payload.schedule}
                      timezone={payload.schedule.timezone}
                      busy={controller.busyAction !== null}
                      stickyHeaderVisible={stickyVisible}
                      selectedState={controller.selectedState}
                      selectedLabels={controller.selectedLabels}
                      selectedMilestoneId={controller.selectedMilestoneId}
                      selectedIterationId={controller.selectedIterationId}
                      timeSpent={controller.timeSpent}
                      spentDate={controller.spentDate}
                      summary={controller.summary}
                      metadataDirty={controller.metadataDirty}
                      onStateChange={controller.setSelectedState}
                      onToggleLabel={controller.toggleLabel}
                      onMilestoneChange={controller.setSelectedMilestoneId}
                      onIterationChange={controller.setSelectedIterationId}
                      onSaveMetadata={handleSaveMetadata}
                      onTimeSpentChange={controller.setTimeSpent}
                      onSpentDateChange={controller.setSpentDate}
                      onSummaryChange={controller.setSummary}
                      onSubmitTime={handleSubmitTime}
                    />
                  </m.div>
                </div>
              </>
            ) : null}
          </Skeleton>
        )}
      </StaggerGroup>
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("issues.confirmDeleteIssueTitle")}</DialogTitle>
            <DialogDescription>{t("issues.confirmDeleteIssueDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={controller.busyAction === "issue-delete"}
            >
              {t("issues.cancelDescriptionEdit")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteIssue()}
              disabled={controller.busyAction === "issue-delete"}
            >
              {t("issues.deleteIssue")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IssueActionsMenu({
  open,
  onOpenChange,
  canEditIssueDescription,
  detailsUrl,
  busy,
  onEditDescription,
  onOpenDelete,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEditIssueDescription: boolean;
  detailsUrl: string | null;
  busy: boolean;
  onEditDescription: () => void;
  onOpenDelete: () => void;
}>) {
  const { t } = useI18n();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-10 rounded-xl px-0"
          aria-label={t("issues.issueActions")}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-1">
          {canEditIssueDescription ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-field-hover disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                onEditDescription();
              }}
            >
              {t("issues.editDescription")}
            </button>
          ) : null}
          {detailsUrl ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-field-hover"
              onClick={() => {
                onOpenChange(false);
                void openExternalUrl(detailsUrl);
              }}
            >
              <ExternalLink className="h-4 w-4" />
              {t("issues.openInGitLab")}
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
              onOpenDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("issues.deleteIssue")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function statusLabel(
  value: string,
  t: (key: "common.open" | "issues.statusClosed") => string,
) {
  return value === "closed" ? t("issues.statusClosed") : t("common.open");
}
