import { useNavigate } from "@tanstack/react-router";
import { m } from "motion/react";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { getIssueRouteReference } from "@/features/issues/lib/issue-reference";
import { AssignedIssuesBoard } from "@/features/issues/ui/AssignedIssuesBoard/AssignedIssuesBoard";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";
import { staggerItem } from "@/shared/lib/animations/animations";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

interface IssuesBoardPageProps {
  syncVersion: number;
}

export function IssuesBoardPage({ syncVersion }: Readonly<IssuesBoardPageProps>) {
  const navigate = useNavigate();
  const controller = useAssignedIssuesBoardController();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();

  const onOpenIssue = (issue: AssignedIssueSnapshot) => {
    navigate({
      to: "/issues/hub",
      search: getIssueRouteReference(issue),
    });
  };

  return (
    <StaggerGroup
      className="min-h-full space-y-6 bg-page-canvas px-1 pt-2 pb-8 sm:px-0"
      aria-busy={controller.loading}
      allowDecorativeAnimation={allowDecorativeAnimation}
      windowVisibility={windowVisibility}
    >
      <m.div variants={staggerItem}>
        <AssignedIssuesBoard
          issues={controller.issues}
          loading={controller.loading}
          error={controller.error}
          searchInputValue={controller.searchInput}
          appliedSearchValue={controller.appliedSearchValue}
          suggestions={controller.suggestions}
          onSearchValueChange={controller.setSearchInput}
          provider={controller.provider}
          providerOptions={controller.providerOptions}
          onProviderChange={controller.setProvider}
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
          syncVersion={syncVersion}
        />
      </m.div>
    </StaggerGroup>
  );
}
