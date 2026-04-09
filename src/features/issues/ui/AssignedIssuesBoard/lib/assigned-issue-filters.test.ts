import { describe, expect, it } from "vitest";
import {
  FILTER_ALL,
  filterIterationsByCode,
  filterIterationsByYear,
  findAutoSelectedIterationIdForCode,
  findCodeDisplayLabel,
  findIterationDisplayLabel,
  findAutoSelectedIterationId,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

describe("filterIterationsByYear", () => {
  const iterations = [
    {
      id: "iter-2026",
      code: "WEB",
      rangeLabel: "Apr 6 - 19, 2026",
      fullLabel: "WEB · Apr 6 - 19, 2026",
      year: "2026",
      startDate: "2026-04-06",
      dueDate: "2026-04-19",
      isCurrent: true,
      issueCount: 4,
    },
    {
      id: "iter-2025",
      code: "WEB",
      rangeLabel: "Mar 10 - 23, 2025",
      fullLabel: "WEB · Mar 10 - 23, 2025",
      year: "2025",
      startDate: "2025-03-10",
      dueDate: "2025-03-23",
      isCurrent: false,
      issueCount: 2,
    },
  ];

  it("returns all iterations when year is FILTER_ALL", () => {
    expect(filterIterationsByYear(iterations, FILTER_ALL)).toEqual(iterations);
  });

  it("keeps only iterations for the selected year", () => {
    expect(filterIterationsByYear(iterations, "2025")).toEqual([iterations[1]]);
  });
});

describe("filterIterationsByCode", () => {
  const iterations = [
    {
      id: "web-current",
      code: "WEB",
      rangeLabel: "Apr 6 - 19, 2026",
      fullLabel: "WEB · Apr 6 - 19, 2026",
      year: "2026",
      startDate: "2026-04-06",
      dueDate: "2026-04-19",
      isCurrent: true,
      issueCount: 4,
    },
    {
      id: "ccp-current",
      code: "CCP",
      rangeLabel: "Apr 6 - 19, 2026",
      fullLabel: "CCP · Apr 6 - 19, 2026",
      year: "2026",
      startDate: "2026-04-06",
      dueDate: "2026-04-19",
      isCurrent: true,
      issueCount: 2,
    },
  ];

  it("keeps only iterations for the selected code", () => {
    expect(filterIterationsByCode(iterations, "WEB")).toEqual([iterations[0]]);
  });

  it("returns all iterations when code is FILTER_ALL", () => {
    expect(filterIterationsByCode(iterations, FILTER_ALL)).toEqual(iterations);
  });
});

describe("findAutoSelectedIterationId", () => {
  it("returns the current iteration when exactly one option is current", () => {
    expect(
      findAutoSelectedIterationId([
        {
          id: "iter-current",
          code: "WEB",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "WEB · Apr 6 - 19, 2026",
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
          code: "A",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "A · Apr 6 - 19, 2026",
          year: "2026",
          isCurrent: true,
          issueCount: 1,
        },
        {
          id: "iter-2",
          code: "B",
          rangeLabel: "Apr 20 - May 3, 2026",
          fullLabel: "B · Apr 20 - May 3, 2026",
          year: "2026",
          isCurrent: true,
          issueCount: 1,
        },
      ]),
    ).toBeUndefined();
  });
});

describe("findAutoSelectedIterationIdForCode", () => {
  it("auto-selects only within the chosen code", () => {
    expect(
      findAutoSelectedIterationIdForCode(
        [
          {
            id: "web-current",
            code: "WEB",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "WEB · Apr 6 - 19, 2026",
            year: "2026",
            isCurrent: true,
            issueCount: 2,
          },
          {
            id: "ccp-current",
            code: "CCP",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "CCP · Apr 6 - 19, 2026",
            year: "2026",
            isCurrent: true,
            issueCount: 2,
          },
        ],
        "WEB",
      ),
    ).toBe("web-current");
  });
});

describe("display label helpers", () => {
  it("resolves stored code and week labels for the combobox trigger", () => {
    expect(
      findCodeDisplayLabel(
        [{ id: "WEB", label: "WEB", issueCount: 4, hasCurrentIteration: true }],
        "WEB",
      ),
    ).toBe("WEB");
    expect(
      findIterationDisplayLabel(
        [
          {
            id: "web-current",
            code: "WEB",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "WEB · Apr 6 - 19, 2026",
            year: "2026",
            isCurrent: true,
            issueCount: 4,
          },
        ],
        "web-current",
      ),
    ).toBe("Apr 6 - 19, 2026");
  });
});
