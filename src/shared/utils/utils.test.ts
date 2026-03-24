import { formatHours } from "@/shared/utils/utils";

describe("formatHours", () => {
  describe("hm format (default)", () => {
    it("formats whole hours without minutes", () => {
      expect(formatHours(8)).toBe("8h");
      expect(formatHours(0)).toBe("0h");
    });

    it("formats hours with minutes", () => {
      expect(formatHours(8.5)).toBe("8h30min");
      expect(formatHours(6.75)).toBe("6h45min");
      expect(formatHours(1.25)).toBe("1h15min");
    });

    it("rounds to nearest minute", () => {
      expect(formatHours(2.333)).toBe("2h20min");
      expect(formatHours(2.167)).toBe("2h10min");
    });

    it("uses hm format by default", () => {
      expect(formatHours(8.5)).toBe("8h30min");
    });
  });

  describe("decimal format", () => {
    it("formats with one decimal and h suffix", () => {
      expect(formatHours(6.75, "decimal")).toBe("6.8h");
      expect(formatHours(8.5, "decimal")).toBe("8.5h");
      expect(formatHours(0, "decimal")).toBe("0.0h");
    });
  });
});
