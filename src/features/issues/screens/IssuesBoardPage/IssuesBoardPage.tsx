import { useNavigate } from "@tanstack/react-router";
import { getIssueRouteReference } from "@/features/issues/lib/issue-reference";
import { AssignedIssuesBoard } from "@/features/issues/ui/AssignedIssuesBoard/AssignedIssuesBoard";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export function IssuesBoardPage() {
  const navigate = useNavigate();
  const controller = useAssignedIssuesBoardController();

  const onOpenIssue = (issue: AssignedIssueSnapshot) => {
    navigate({
      to: "/issues/hub",
      search: getIssueRouteReference(issue),
    });
  };

  return (
    <div className="min-h-full bg-page-canvas px-1 pt-2 pb-8 sm:px-0">
      <AssignedIssuesBoard
        issues={controller.issues}
        loading={controller.loading}
        error={controller.error}
        searchValue={controller.searchInput}
        suggestions={controller.suggestions}
        onSearchValueChange={controller.setSearchInput}
        status={controller.status}
        onStatusChange={controller.setStatus}
        catalogState={controller.catalogState}
        catalogMessage={controller.catalogMessage}
        years={controller.years}
        year={controller.year}
        onYearChange={controller.setYear}
        iterationOptions={controller.iterationOptions}
        iterationId={controller.iterationId}
        onIterationIdChange={controller.setIterationId}
        page={controller.page}
        pageSize={controller.pageSize}
        pageSizeOptions={controller.pageSizeOptions}
        totalItems={controller.totalItems}
        totalPages={controller.totalPages}
        onPageChange={controller.goToPage}
        onPageSizeChange={controller.setPageSize}
        onRetry={controller.retry}
        onOpenIssue={onOpenIssue}
      />
    </div>
  );
}
