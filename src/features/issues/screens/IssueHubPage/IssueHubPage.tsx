import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { openExternalUrl } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useIssueDetailsController } from "@/features/issues/hooks/use-issue-details-controller";
import { matchesIssueRouteReference } from "@/features/issues/lib/issue-reference";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";
import { IssueDetailsSidebarSection } from "@/features/issues/sections/IssueDetailsSidebarSection/IssueDetailsSidebarSection";
import { Button } from "@/shared/ui/Button/Button";

import type { BootstrapPayload, IssueRouteReference } from "@/shared/types/dashboard";

interface IssueHubPageProps {
  payload: BootstrapPayload;
  issueReference: IssueRouteReference;
  onBack: () => void;
  onRefreshBootstrap: () => Promise<void>;
}

export function IssueHubPage({
  payload,
  issueReference,
  onBack,
  onRefreshBootstrap,
}: Readonly<IssueHubPageProps>) {
  const { t } = useI18n();
  const issue = useMemo(
    () =>
      payload.assignedIssues.find((candidate) =>
        matchesIssueRouteReference(candidate, issueReference),
      ) ?? null,
    [issueReference, payload.assignedIssues],
  );

  if (!issue) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <p className="font-display text-lg font-semibold text-foreground">
          {t("issues.hubNotFound")}
        </p>
        <p className="text-sm text-muted-foreground">{t("issues.hubNotFoundHint")}</p>
        <Button type="button" variant="soft" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("issues.hubBackToBoard")}
        </Button>
      </div>
    );
  }

  const controller = useIssueDetailsController({
    issueReference,
    onRefreshBootstrap,
  });

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

  return (
    <div className="min-h-full space-y-6 bg-page-canvas pb-10">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("issues.hubBackToBoard")}
        </Button>
        {controller.details?.webUrl ? (
          <Button
            type="button"
            variant="soft"
            className="gap-2"
            onClick={() => void openExternalUrl(controller.details!.webUrl!)}
          >
            <ExternalLink className="h-4 w-4" />
            {t("issues.openInGitLab")}
          </Button>
        ) : null}
      </div>

      {controller.loadState.status === "loading" ? (
        <section className="rounded-3xl border-2 border-border-subtle bg-panel/90 p-8 text-center text-sm text-muted-foreground shadow-card">
          {t("issues.loadingDetails")}
        </section>
      ) : controller.loadState.status === "error" ? (
        <section className="space-y-4 rounded-3xl border-2 border-border-subtle bg-panel/90 p-6 shadow-card">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("issues.loadDetailsFailed")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{controller.loadState.message}</p>
          </div>
          <Button type="button" onClick={() => void controller.refreshDetails()}>
            {t("common.retry")}
          </Button>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <IssueDetailsMainSection
            details={controller.loadState.details}
            composerMode={controller.composerMode}
            commentBody={controller.commentBody}
            busy={controller.busyAction !== null}
            onComposerModeChange={controller.setComposerMode}
            onCommentBodyChange={controller.setCommentBody}
            onSubmitComment={handleSubmitNote}
          />
          <IssueDetailsSidebarSection
            details={controller.loadState.details}
            schedule={payload.schedule}
            busy={controller.busyAction !== null}
            selectedState={controller.selectedState}
            selectedLabels={controller.selectedLabels}
            timeSpent={controller.timeSpent}
            spentDate={controller.spentDate}
            summary={controller.summary}
            metadataDirty={controller.metadataDirty}
            onStateChange={controller.setSelectedState}
            onToggleLabel={controller.toggleLabel}
            onSaveMetadata={handleSaveMetadata}
            onTimeSpentChange={controller.setTimeSpent}
            onSpentDateChange={controller.setSpentDate}
            onSummaryChange={controller.setSummary}
            onSubmitTime={handleSubmitTime}
          />
        </div>
      )}
    </div>
  );
}
