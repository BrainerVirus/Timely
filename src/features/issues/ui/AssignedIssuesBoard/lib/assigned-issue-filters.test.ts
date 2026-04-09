import { describe, expect, it } from "vitest";
import {
  FILTER_ALL,
  filterIterationsByYear,
  findAutoSelectedIterationId,
  findIterationDisplayLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

describe("filterIterationsByYear", () => {
  const iterationOptions = [
    {
      id: "iter-2026",
      label: "WEB · Apr 6 - 19, 2026",
      badge: "WEB",
      searchText: "web apr 6 2026-04-06 current",
      year: "2026",
      startDate: "2026-04-06",
      dueDate: "2026-04-19",
      isCurrent: true,
      issueCount: 4,
    },
    {
      id: "iter-2025",
      label: "WEB · Mar 10 - 23, 2025",
      badge: "WEB",
      searchText: "web mar 10 2025-03-10",
      year: "2025",
      startDate: "2025-03-10",
      dueDate: "2025-03-23",
      isCurrent: false,
      issueCount: 2,
    },
    {
      id: "none",
      label: "No iteration",
      badge: undefined,
      searchText: "no iteration",
      year: undefined,
      startDate: undefined,
      dueDate: undefined,
      isCurrent: false,
      issueCount: 1,
    },
  ];

  it("returns all iteration options when year is FILTER_ALL", () => {
    expect(filterIterationsByYear(iterationOptions, FILTER_ALL)).toEqual(iterationOptions);
  });

  it("keeps dated options for the selected year and preserves no-iteration option", () => {
    expect(filterIterationsByYear(iterationOptions, "2025")).toEqual([
      iterationOptions[1],
      iterationOptions[2],
    ]);
  });
});

describe("findAutoSelectedIterationId", () => {
  it("returns the current iteration when exactly one dated option is current", () => {
    expect(
      findAutoSelectedIterationId([
        {
          id: "iter-current",
          label: "WEB · Apr 6 - 19, 2026",
          badge: "WEB",
          searchText: "web current apr 6 2026-04-06",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 4,
        },
      ]),
    ).toBe("iter-current");
  });

  it("returns undefined when none or many options are current", () => {
    expect(findAutoSelectedIterationId([])).toBeUndefined();
    expect(
      findAutoSelectedIterationId([
        {
          id: "iter-1",
          label: "A · Apr 6 - 19, 2026",
          badge: "A",
          searchText: "a current apr 6",
          year: "2026",
          isCurrent: true,
          issueCount: 1,
        },
        {
          id: "iter-2",
          label: "B · Apr 20 - May 3, 2026",
          badge: "B",
          searchText: "b current apr 20",
          year: "2026",
          isCurrent: true,
          issueCount: 1,
        },
      ]),
    ).toBeUndefined();
  });
});

describe("findIterationDisplayLabel", () => {
  it("resolves stored iteration label for the combobox trigger", () => {
    expect(
      findIterationDisplayLabel(
        [
          {
            id: "web-current",
            label: "WEB · Apr 6 - 19, 2026",
            badge: "WEB",
            searchText: "web current apr 6",
            year: "2026",
            isCurrent: true,
            issueCount: 4,
          },
        ],
        "web-current",
      ),
    ).toBe("WEB · Apr 6 - 19, 2026");
  });
});
