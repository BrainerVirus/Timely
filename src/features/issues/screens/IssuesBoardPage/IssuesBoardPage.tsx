import { useNavigate } from "@tanstack/react-router";
import { AssignedIssuesBoard } from "@/features/issues/ui/AssignedIssuesBoard/AssignedIssuesBoard";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export function IssuesBoardPage() {
  const navigate = useNavigate();
  const controller = useAssignedIssuesBoardController();

  const onOpenIssue = (issue: AssignedIssueSnapshot) => {
    navigate({
      to: "/issues/hub",
      search: { gid: issue.issueGraphqlId },
    });
  };

  return (
    <div className="min-h-full bg-page-canvas px-1 pb-8 pt-2 sm:px-0">
      <AssignedIssuesBoard
        issues={controller.issues}
        loading={controller.loading}
        error={controller.error}
        searchValue={controller.searchInput}
        suggestions={controller.suggestions}
        onSearchValueChange={controller.setSearchInput}
        sortedFortnightWindows={controller.sortedFortnightWindows}
        iterationToken={controller.iterationToken}
        onIterationTokenChange={controller.setIterationToken}
        fortnightId={controller.fortnightId}
        onFortnightIdChange={controller.setFortnightId}
        statusKey={controller.status}
        onStatusKeyChange={controller.setStatus}
        canGoPrevious={controller.canGoPrevious}
        canGoNext={controller.canGoNext}
        pageLabel={controller.pageLabel}
        onPreviousPage={controller.goToPreviousPage}
        onNextPage={controller.goToNextPage}
        onRetry={controller.retry}
        onOpenIssue={onOpenIssue}
      />
    </div>
  );
}
