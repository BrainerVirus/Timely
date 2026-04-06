import { getWorkflowColumnId, type WorkflowColumnId } from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

export const FILTER_ALL = "__all__";

/** Short codes (e.g. CCP, WEB) from labels, iteration title, and path segments. */
export function collectIterationTokens(issue: AssignedIssueSnapshot): string[] {
  const out = new Set<string>();

  for (const label of issue.labels) {
    if (/^[A-Z]{2,5}$/.test(label)) {
      out.add(label);
    }
    const scoped = label.match(/^[\w.-]+::([A-Za-z]{2,5})$/);
    if (scoped) {
      out.add(scoped[1].toUpperCase());
    }
  }

  const it = issue.iterationTitle;
  if (it) {
    const bracket = it.match(/\[([A-Za-z]{2,5})\]/);
    if (bracket) {
      out.add(bracket[1].toUpperCase());
    }
    const head = it.match(/^([A-Z]{2,5})\b/);
    if (head) {
      out.add(head[1]);
    }
  }

  for (const part of issue.key.split("/")) {
    const base = part.split("#")[0] ?? part;
    const u = base.toUpperCase();
    if (/^[A-Z]{2,5}$/.test(u)) {
      out.add(u);
    }
  }

  return [...out].sort((a, b) => a.localeCompare(b));
}

export function uniqueIterationTokens(issues: AssignedIssueSnapshot[]): string[] {
  const s = new Set<string>();
  for (const issue of issues) {
    for (const token of collectIterationTokens(issue)) {
      s.add(token);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export interface FortnightWindow {
  id: string;
  start: Date;
  end: Date;
}

function startOfMondayLocal(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-aligned 14-day windows (fortnights) around `reference`. */
export function buildFortnightWindows(
  reference: Date = new Date(),
  pastBlocks = 26,
  futureBlocks = 8,
): FortnightWindow[] {
  const monday = startOfMondayLocal(reference);
  const out: FortnightWindow[] = [];
  for (let i = -pastBlocks; i <= futureBlocks; i++) {
    const start = addDays(monday, i * 14);
    const end = addDays(start, 13);
    end.setHours(23, 59, 59, 999);
    const id = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    out.push({ id, start, end });
  }
  return out;
}

/** Newest fortnight first (by window start). */
export function sortFortnightsNewestFirst(windows: FortnightWindow[]): FortnightWindow[] {
  return [...windows].sort((a, b) => b.start.getTime() - a.start.getTime());
}

function fortNightStartCalendarYear(w: FortnightWindow): number {
  return w.start.getFullYear();
}

/** Descending years present in `windows` (by each window's Monday start, local calendar). */
export function uniqueFortnightStartYears(windows: FortnightWindow[]): number[] {
  const s = new Set<number>();
  for (const w of windows) {
    s.add(fortNightStartCalendarYear(w));
  }
  return [...s].sort((a, b) => b - a);
}

/** When `yearKey` is FILTER_ALL, returns `windows` unchanged (caller should pre-sort). */
export function filterFortnightsByStartYear(
  windows: FortnightWindow[],
  yearKey: string,
): FortnightWindow[] {
  if (yearKey === FILTER_ALL) {
    return windows;
  }
  const y = Number.parseInt(yearKey, 10);
  if (!Number.isFinite(y)) {
    return windows;
  }
  return windows.filter((w) => fortNightStartCalendarYear(w) === y);
}

function utcDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYmd(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return null;
  }
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** True when GitLab iteration [start,due] overlaps the fortnight (inclusive, date-only). */
export function iterationOverlapsFortnight(issue: AssignedIssueSnapshot, window: FortnightWindow): boolean {
  const a = issue.iterationStartDate ? parseYmd(issue.iterationStartDate) : null;
  const b = issue.iterationDueDate ? parseYmd(issue.iterationDueDate) : null;
  if (a === null || b === null) {
    return false;
  }
  const w0 = utcDay(window.start);
  const w1 = utcDay(window.end);
  return a <= w1 && b >= w0;
}

export function filterAssignedIssues(
  issues: AssignedIssueSnapshot[],
  options: {
    iterationToken: string;
    fortnightId: string;
    fortnightWindows: FortnightWindow[];
    statusKey: string;
  },
): AssignedIssueSnapshot[] {
  const { iterationToken, fortnightId, fortnightWindows, statusKey } = options;
  const window = fortnightWindows.find((w) => w.id === fortnightId);

  return issues.filter((issue) => {
    if (iterationToken !== FILTER_ALL) {
      const tokens = collectIterationTokens(issue);
      if (!tokens.includes(iterationToken)) {
        return false;
      }
    }
    if (fortnightId !== FILTER_ALL) {
      if (!window || !iterationOverlapsFortnight(issue, window)) {
        return false;
      }
    }
    if (statusKey !== FILTER_ALL) {
      if (getWorkflowColumnId(issue) !== (statusKey as WorkflowColumnId)) {
        return false;
      }
    }
    return true;
  });
}
