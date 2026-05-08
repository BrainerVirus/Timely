import {
  clampDateToRange,
  differenceInDays,
  groupPeriodDaysByCalendarWeek,
  getCurrentMonthRange,
  isCurrentMonthRange,
  isSameDay,
  isSameWeek,
  parseDateInputValue,
  shiftDate,
  shiftRange,
  toDateInputValue,
} from "@/features/worklog/lib/worklog-date-utils";

describe("worklog-date-utils", () => {
  describe("toDateInputValue", () => {
    it("formats date as YYYY-MM-DD", () => {
      expect(toDateInputValue(new Date(2025, 0, 15))).toBe("2025-01-15");
      expect(toDateInputValue(new Date(2025, 11, 1))).toBe("2025-12-01");
    });
  });

  describe("parseDateInputValue", () => {
    it("parses YYYY-MM-DD string to Date", () => {
      expect(parseDateInputValue("2025-01-15")).toEqual(new Date(2025, 0, 15));
      expect(parseDateInputValue("2025-12-01")).toEqual(new Date(2025, 11, 1));
    });
  });

  describe("shiftDate", () => {
    it("shifts date by given days", () => {
      const base = new Date(2025, 0, 15);
      expect(shiftDate(base, 5)).toEqual(new Date(2025, 0, 20));
      expect(shiftDate(base, -3)).toEqual(new Date(2025, 0, 12));
    });
  });

  describe("differenceInDays", () => {
    it("returns days between two dates", () => {
      const a = new Date(2025, 0, 10);
      const b = new Date(2025, 0, 15);
      expect(differenceInDays(a, b)).toBe(5);
      expect(differenceInDays(b, a)).toBe(-5);
    });
  });

  describe("getCurrentMonthRange", () => {
    it("returns first and last day of current month", () => {
      const range = getCurrentMonthRange();
      expect(range.from.getDate()).toBe(1);
      expect(range.to.getMonth()).toBe(range.from.getMonth());
    });
  });

  describe("clampDateToRange", () => {
    it("clamps date to range bounds", () => {
      const range = {
        from: new Date(2025, 0, 10),
        to: new Date(2025, 0, 20),
      };
      expect(clampDateToRange(new Date(2025, 0, 5), range)).toEqual(range.from);
      expect(clampDateToRange(new Date(2025, 0, 25), range)).toEqual(range.to);
      expect(clampDateToRange(new Date(2025, 0, 15), range)).toEqual(new Date(2025, 0, 15));
    });
  });

  describe("isSameDay", () => {
    it("compares dates by day", () => {
      expect(isSameDay(new Date(2025, 0, 15), new Date(2025, 0, 15))).toBe(true);
      expect(isSameDay(new Date(2025, 0, 15), new Date(2025, 0, 16))).toBe(false);
    });
  });

  describe("shiftRange", () => {
    it("shifts range by given days", () => {
      const range = {
        from: new Date(2025, 0, 10),
        to: new Date(2025, 0, 20),
      };
      const shifted = shiftRange(range, 5);
      expect(shifted.from).toEqual(new Date(2025, 0, 15));
      expect(shifted.to).toEqual(new Date(2025, 0, 25));
    });
  });

  describe("isCurrentMonthRange", () => {
    it("returns true for current month range", () => {
      const range = getCurrentMonthRange();
      expect(isCurrentMonthRange(range)).toBe(true);
    });

    it("returns false for past month", () => {
      const range = {
        from: new Date(2024, 11, 1),
        to: new Date(2024, 11, 31),
      };
      expect(isCurrentMonthRange(range)).toBe(false);
    });
  });

  describe("isSameWeek", () => {
    it("returns true for dates in same week (Sunday start)", () => {
      const a = new Date(2025, 0, 13); // Mon
      const b = new Date(2025, 0, 15); // Wed
      expect(isSameWeek(a, b, "sunday", "UTC")).toBe(true);
    });
  });

  describe("groupPeriodDaysByCalendarWeek", () => {
    const makeDay = (date: string) => ({
      date,
      shortLabel: date,
      dateLabel: date,
      isToday: false,
      loggedHours: 0,
      targetHours: 8,
      focusHours: 0,
      overflowHours: 0,
      status: "empty" as const,
      topIssues: [],
    });

    it("orders Monday-first rows with leading disabled placeholders", () => {
      const rows = groupPeriodDaysByCalendarWeek(
        ["2025-03-05", "2025-03-06", "2025-03-07"].map(makeDay),
        "2025-03-05",
        "2025-03-07",
        "monday",
        "UTC",
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].map((cell) => cell.kind)).toEqual([
        "placeholder",
        "placeholder",
        "day",
        "day",
        "day",
        "placeholder",
        "placeholder",
      ]);
      expect(rows[0].filter((cell) => cell.kind === "day").map((cell) => cell.date)).toEqual([
        "2025-03-05",
        "2025-03-06",
        "2025-03-07",
      ]);
    });

    it("orders Sunday-first rows", () => {
      const rows = groupPeriodDaysByCalendarWeek(
        ["2025-03-02", "2025-03-03"].map(makeDay),
        "2025-03-02",
        "2025-03-03",
        "sunday",
        "UTC",
      );

      expect(rows[0].map((cell) => cell.kind)).toEqual([
        "day",
        "day",
        "placeholder",
        "placeholder",
        "placeholder",
        "placeholder",
        "placeholder",
      ]);
      expect(rows[0].filter((cell) => cell.kind === "day").map((cell) => cell.date)).toEqual([
        "2025-03-02",
        "2025-03-03",
      ]);
    });

    it("keeps custom ranges aligned across incomplete weeks and month boundaries", () => {
      const rows = groupPeriodDaysByCalendarWeek(
        ["2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02"].map(makeDay),
        "2025-01-30",
        "2025-02-02",
        "monday",
        "UTC",
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].map((cell) => cell.kind)).toEqual([
        "placeholder",
        "placeholder",
        "placeholder",
        "day",
        "day",
        "day",
        "day",
      ]);
      expect(rows[0].filter((cell) => cell.kind === "day").map((cell) => cell.date)).toEqual([
        "2025-01-30",
        "2025-01-31",
        "2025-02-01",
        "2025-02-02",
      ]);
    });
  });
});
