import type {
  AssignedIssuesIterationCodeOption,
  AssignedIssuesIterationOption,
} from "@/shared/types/dashboard";

export const FILTER_ALL = "all";

export function filterIterationsByYear(
  iterations: AssignedIssuesIterationOption[],
  year: string,
): AssignedIssuesIterationOption[] {
  if (year === FILTER_ALL) {
    return iterations;
  }

  return iterations.filter((iteration) => iteration.year === year);
}

export function filterIterationsByCode(
  iterations: AssignedIssuesIterationOption[],
  code: string,
): AssignedIssuesIterationOption[] {
  if (code === FILTER_ALL) {
    return iterations;
  }

  return iterations.filter((iteration) => iteration.code === code);
}

export function findAutoSelectedIterationId(
  iterations: AssignedIssuesIterationOption[],
): string | undefined {
  const currentIterations = iterations.filter((iteration) => iteration.isCurrent);

  if (currentIterations.length !== 1) {
    return undefined;
  }

  return currentIterations[0]?.id;
}

export function findAutoSelectedIterationIdForCode(
  iterations: AssignedIssuesIterationOption[],
  code: string,
): string | undefined {
  return findAutoSelectedIterationId(filterIterationsByCode(iterations, code));
}

export function findIterationDisplayLabel(
  iterations: AssignedIssuesIterationOption[],
  iterationId: string,
): string | undefined {
  return iterations.find((iteration) => iteration.id === iterationId)?.rangeLabel;
}

export function findCodeDisplayLabel(
  codes: AssignedIssuesIterationCodeOption[],
  codeId: string,
): string | undefined {
  return codes.find((code) => code.id === codeId)?.label;
}
