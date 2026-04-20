import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import { m } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { openExternalUrl } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { findOptimisticIssueDetails } from "@/features/issues/lib/issue-details-optimistic";
import { formatIssueTimestamp } from "@/features/issues/lib/issue-date-format";
import { useIssueCodeThemePreference } from "@/features/issues/hooks/use-issue-code-theme-preference";
import { useIssueDetailsController } from "@/features/issues/hooks/use-issue-details-controller";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";
import { getAssignedIssueStateBadgeClassName } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { IssueDetailsSkeleton } from "@/features/issues/ui/IssueDetailsSkeleton/IssueDetailsSkeleton";
import { staggerItem } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";

import type { BootstrapPayload, IssueRouteReference } from "@/shared/types/dashboard";

interface IssueHubPageProps {
  payload: BootstrapPayload;
  issueReference: IssueRouteReference;
  onBack: () => void;
  onRefreshBootstrap: () => Promise<void>;
  onOpenIssue: (reference: IssueRouteReference) => void;
  currentUsername?: string;
}

export function IssueHubPage({
  payload,
  issueReference,
  onBack,
  onRefreshBootstrap,
  onOpenIssue,
  currentUsername,
}: Readonly<IssueHubPageProps>) {
  const { locale, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const initialSnapshot = useMemo(
    () =>
      findOptimisticIssueDetails(
        payload.assignedIssues,
        issueReference.provider,
        issueReference.issueId,
      ),
    [payload.assignedIssues, issueReference.provider, issueReference.issueId],
  );
  const controller = useIssueDetailsController({
    issueReference,
    initialSnapshot,
    onRefreshBootstrap,
  });
  const issueCodeTheme = useIssueCodeThemePreference();
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

  const detailsUrl = controller.details?.webUrl ?? null;

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
  }, [controller.details?.reference.issueId]);

  return (
    <div className="min-h-full bg-page-canvas pb-10">
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
            <div className="mx-auto flex max-w-[min(100%,108rem)] items-center justify-between gap-4">
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
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-w-[10.5rem] gap-2 rounded-xl px-4"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("issues.hubBackToBoard")}
                </Button>
                {detailsUrl ? (
                  <Button
                    type="button"
                    variant="soft"
                    className="h-9 min-w-[10.5rem] gap-2 rounded-xl px-4"
                    onClick={() => void openExternalUrl(detailsUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("issues.openInGitLab")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <StaggerGroup
        className="mx-auto max-w-[min(100%,108rem)] space-y-6"
        allowDecorativeAnimation={allowDecorativeAnimation}
        windowVisibility={windowVisibility}
      >
        <m.header variants={staggerItem} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4" ref={headerRef}>
            <div className="space-y-2">
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

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="h-10 min-w-[10.5rem] gap-2 rounded-xl px-4"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("issues.hubBackToBoard")}
              </Button>
              {detailsUrl ? (
                <Button
                  type="button"
                  variant="soft"
                  className="h-10 min-w-[10.5rem] gap-2 rounded-xl px-4"
                  onClick={() => void openExternalUrl(detailsUrl)}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("issues.openInGitLab")}
                </Button>
              ) : null}
            </div>
          </div>
        </m.header>

        {controller.loadState.status === "loading" ? (
          <m.div variants={staggerItem}>
            <span className="sr-only">{t("issues.loadingDetails")}</span>
            <IssueDetailsSkeleton />
          </m.div>
        ) : controller.loadState.status === "error" ? (
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
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20.5rem] xl:items-start">
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
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />
            </m.div>
            <m.div variants={staggerItem}>
              <IssueDetailsSidebarSection
                details={controller.loadState.details}
                schedule={payload.schedule}
                timezone={payload.schedule.timezone}
                busy={controller.busyAction !== null}
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
        )}
      </StaggerGroup>
    </div>
  );
}

function statusLabel(
  value: string,
  t: (key: "common.open" | "issues.statusClosed") => string,
) {
  return value === "closed" ? t("issues.statusClosed") : t("common.open");
}
