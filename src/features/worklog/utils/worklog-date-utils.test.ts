import {
  clampDateToRange,
  differenceInDays,
  getCurrentMonthRange,
  isCurrentMonthRange,
  isSameDay,
  isSameWeek,
  parseDateInputValue,
  shiftDate,
  shiftRange,
  toDateInputValue,
} from "@/features/worklog/utils/worklog-date-utils";

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
});
