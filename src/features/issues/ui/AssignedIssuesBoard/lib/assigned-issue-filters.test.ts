import { describe, expect, it } from "vitest";
import {
  buildFortnightWindows,
  collectIterationTokens,
  FILTER_ALL,
  filterAssignedIssues,
  filterFortnightsByStartYear,
  iterationOverlapsFortnight,
  sortFortnightsNewestFirst,
  uniqueFortnightStartYears,
  type FortnightWindow,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

function issue(partial: Partial<AssignedIssueSnapshot> & Pick<AssignedIssueSnapshot, "key">): AssignedIssueSnapshot {
  return {
    title: "T",
    state: "opened",
    issueGraphqlId: "gid://gitlab/Issue/1",
    labels: [],
    ...partial,
  };
}

describe("collectIterationTokens", () => {
  it("reads WEB-style segment from key path", () => {
    expect(collectIterationTokens(issue({ key: "org/productos/ri/web#1" }))).toContain("WEB");
  });

  it("reads ALL CAPS labels", () => {
    expect(collectIterationTokens(issue({ key: "a#1", labels: ["CCP", "x"] }))).toContain("CCP");
  });
});

describe("iterationOverlapsFortnight", () => {
  it("detects overlap on inclusive dates", () => {
    const w: FortnightWindow = {
      id: "test",
      start: new Date(2026, 3, 6),
      end: new Date(2026, 3, 19, 23, 59, 59, 999),
    };
    const i = issue({
      key: "a#1",
      iterationStartDate: "2026-04-10",
      iterationDueDate: "2026-04-15",
    });
    expect(iterationOverlapsFortnight(i, w)).toBe(true);
  });
});

describe("sortFortnightsNewestFirst", () => {
  it("orders by start date descending", () => {
    const a: FortnightWindow = {
      id: "a",
      start: new Date(2026, 0, 5),
      end: new Date(2026, 0, 18, 23, 59, 59, 999),
    };
    const b: FortnightWindow = {
      id: "b",
      start: new Date(2026, 1, 2),
      end: new Date(2026, 1, 15, 23, 59, 59, 999),
    };
    expect(sortFortnightsNewestFirst([a, b]).map((w) => w.id)).toEqual(["b", "a"]);
  });
});

describe("uniqueFortnightStartYears", () => {
  it("returns distinct years descending", () => {
    const windows: FortnightWindow[] = [
      { id: "1", start: new Date(2025, 11, 1), end: new Date(2025, 11, 14) },
      { id: "2", start: new Date(2026, 0, 5), end: new Date(2026, 0, 18) },
      { id: "3", start: new Date(2026, 1, 2), end: new Date(2026, 1, 15) },
    ];
    expect(uniqueFortnightStartYears(windows)).toEqual([2026, 2025]);
  });
});

describe("filterFortnightsByStartYear", () => {
  it("keeps only windows whose start falls in the selected year", () => {
    const windows: FortnightWindow[] = [
      { id: "1", start: new Date(2025, 11, 29), end: new Date(2026, 0, 11) },
      { id: "2", start: new Date(2026, 0, 5), end: new Date(2026, 0, 18) },
    ];
    const out = filterFortnightsByStartYear(windows, "2026");
    expect(out.map((w) => w.id)).toEqual(["2"]);
  });

  it("returns all windows when year is FILTER_ALL", () => {
    const windows: FortnightWindow[] = [
      { id: "1", start: new Date(2025, 0, 1), end: new Date(2025, 0, 14) },
      { id: "2", start: new Date(2026, 0, 5), end: new Date(2026, 0, 18) },
    ];
    expect(filterFortnightsByStartYear(windows, FILTER_ALL)).toEqual(windows);
  });
});

describe("filterAssignedIssues", () => {
  it("filters by iteration token", () => {
    const issues = [
      issue({ key: "a/web#1", labels: [] }),
      issue({ key: "a/api#2", labels: [] }),
    ];
    const windows = buildFortnightWindows();
    const out = filterAssignedIssues(issues, {
      iterationToken: "WEB",
      fortnightId: FILTER_ALL,
      fortnightWindows: windows,
      statusKey: FILTER_ALL,
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.key).toBe("a/web#1");
  });
});
