import type { AssignedIssuesIterationOption } from "@/shared/types/dashboard";

export const FILTER_ALL = "all";

export function filterIterationsByYear(
  iterationOptions: AssignedIssuesIterationOption[],
  year: string,
): AssignedIssuesIterationOption[] {
  if (year === FILTER_ALL) {
    return iterationOptions;
  }

  return iterationOptions.filter((iteration) => !iteration.year || iteration.year === year);
}

export function findAutoSelectedIterationId(
  iterationOptions: AssignedIssuesIterationOption[],
): string | undefined {
  const currentIterations = iterationOptions.filter((iteration) => iteration.isCurrent);

  if (currentIterations.length !== 1) {
    return undefined;
  }

  return currentIterations[0]?.id;
}

export function findIterationDisplayLabel(
  iterationOptions: AssignedIssuesIterationOption[],
  iterationId: string,
): string | undefined {
  return iterationOptions.find((iteration) => iteration.id === iterationId)?.label;
}
