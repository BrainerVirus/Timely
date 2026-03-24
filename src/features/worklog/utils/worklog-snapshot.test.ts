import { createFallbackPeriodSnapshot } from "@/features/worklog/utils/worklog-snapshot";
import { mockBootstrap } from "@/test/fixtures/mock-data";

describe("worklog-snapshot", () => {
  describe("createFallbackPeriodSnapshot", () => {
    it("creates a valid WorklogSnapshot with range mode", () => {
      const periodRange = {
        from: new Date(2025, 2, 10), // March 10
        to: new Date(2025, 2, 20), // March 20
      };
      const result = createFallbackPeriodSnapshot(periodRange, mockBootstrap);
      expect(result.mode).toBe("range");
      expect(result.range.startDate).toBe("2025-03-10");
      expect(result.range.endDate).toBe("2025-03-20");
      expect(result.range.label).toBe("2025-03-10 - 2025-03-20");
      expect(result.selectedDay).toBe(mockBootstrap.today);
      expect(result.days).toEqual([]);
      expect(result.month).toBe(mockBootstrap.month);
      expect(result.auditFlags).toEqual([]);
    });
  });
});
