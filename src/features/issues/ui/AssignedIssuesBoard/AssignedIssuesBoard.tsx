import { m } from "motion/react";
import { AssignedIssuesBoardContent } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesBoardContent/AssignedIssuesBoardContent";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";
import { staggerItem } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";

import type {
  AssignedIssueSnapshot,
  AssignedIssueSuggestion,
  AssignedIssuesIterationOption,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

interface AssignedIssuesBoardProps {
  issues: AssignedIssueSnapshot[];
  loading: boolean;
  error?: string | null;
  catalogState: "ready" | "partial" | "error";
  catalogMessage?: string | null;
  searchInputValue: string;
  appliedSearchValue: string;
  suggestions: AssignedIssueSuggestion[];
  onSearchValueChange: (value: string) => void;
  provider: string;
  providerOptions: Array<{ value: string; label: string }>;
  onProviderChange: (value: string) => void;
  status: AssignedIssuesStatusFilter;
  onStatusChange: (value: AssignedIssuesStatusFilter) => void;
  years: string[];
  year: string;
  onYearChange: (value: string) => void;
  iterationOptions: AssignedIssuesIterationOption[];
  iterationId: string;
  onIterationIdChange: (value: string) => void;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
  syncVersion: number;
  className?: string;
}

export function AssignedIssuesBoard({
  issues,
  loading,
  error,
  catalogState,
  catalogMessage,
  searchInputValue,
  appliedSearchValue,
  suggestions,
  onSearchValueChange,
  provider,
  providerOptions,
  onProviderChange,
  status,
  onStatusChange,
  years,
  year,
  onYearChange,
  iterationOptions,
  iterationId,
  onIterationIdChange,
  page,
  pageSize,
  pageSizeOptions,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onOpenIssue,
  syncVersion,
  className,
}: Readonly<AssignedIssuesBoardProps>) {
  const filtersUnavailable =
    catalogState !== "ready" && iterationOptions.length === 0 && years.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      <m.div variants={staggerItem}>
        <AssignedIssuesFilters
          status={status}
          onStatusChange={onStatusChange}
          provider={provider}
          providerOptions={providerOptions}
          onProviderChange={onProviderChange}
          disableIterationFilters={filtersUnavailable}
          searchValue={searchInputValue}
          appliedSearchValue={appliedSearchValue}
          suggestions={suggestions}
          onSearchValueChange={onSearchValueChange}
          years={years}
          year={year}
          onYearChange={onYearChange}
          iterationOptions={iterationOptions}
          iterationId={iterationId}
          onIterationIdChange={onIterationIdChange}
        />
      </m.div>

      <AssignedIssuesBoardContent
        issues={issues}
        loading={loading}
        error={error}
        catalogState={catalogState}
        catalogMessage={catalogMessage}
        appliedSearchValue={appliedSearchValue}
        provider={provider}
        status={status}
        year={year}
        iterationId={iterationId}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRetry={onRetry}
        onOpenIssue={onOpenIssue}
        syncVersion={syncVersion}
      />
    </div>
  );
}
