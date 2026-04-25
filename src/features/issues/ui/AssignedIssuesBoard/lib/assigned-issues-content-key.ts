import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export function buildAssignedIssuesContentKey(input: {
  status: string;
  provider: string;
  year: string;
  iterationId: string;
  appliedSearchValue: string;
  page: number;
  totalItems: number;
  issues: AssignedIssueSnapshot[];
  error?: string | null;
  loading: boolean;
}) {
  return [
    input.status,
    input.provider,
    input.year,
    input.iterationId,
    input.appliedSearchValue,
    input.page,
    input.totalItems,
    input.issues.map((issue) => issue.key).join("|"),
    input.error ?? "",
    input.loading ? "loading" : "ready",
  ].join(":");
}
