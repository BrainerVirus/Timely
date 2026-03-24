import { formatSignedHours, shiftDate, toDateInputValue } from "@/shared/utils/date";

describe("date", () => {
  describe("toDateInputValue", () => {
    it("formats date as YYYY-MM-DD", () => {
      expect(toDateInputValue(new Date(2025, 0, 15))).toBe("2025-01-15");
      expect(toDateInputValue(new Date(2025, 11, 1))).toBe("2025-12-01");
    });

    it("pads month and day with zeros", () => {
      expect(toDateInputValue(new Date(2025, 0, 1))).toBe("2025-01-01");
      expect(toDateInputValue(new Date(2025, 8, 9))).toBe("2025-09-09");
    });
  });

  describe("shiftDate", () => {
    it("shifts date forward by days", () => {
      const d = new Date(2025, 2, 15); // March 15
      const next = shiftDate(d, 5);
      expect(next.getDate()).toBe(20);
    });

    it("shifts date backward by days", () => {
      const d = new Date(2025, 2, 15);
      const prev = shiftDate(d, -5);
      expect(prev.getDate()).toBe(10);
    });

    it("does not mutate the original date", () => {
      const d = new Date(2025, 2, 15);
      shiftDate(d, 5);
      expect(d.getDate()).toBe(15);
    });
  });

  describe("formatSignedHours", () => {
    const formatHours = (v: number) => (v === 0 ? "0h" : `${v}h`);

    it("prefixes positive values with +", () => {
      expect(formatSignedHours(formatHours, 2.5)).toBe("+2.5h");
    });

    it("prefixes negative values with - and uses abs value", () => {
      expect(formatSignedHours(formatHours, -1.5)).toBe("-1.5h");
    });

    it("returns formatted zero for zero", () => {
      expect(formatSignedHours(formatHours, 0)).toBe("0h");
    });
  });
});
