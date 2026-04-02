import { describe, expect, it } from "vitest";
import { TIMEZONE_TO_PRIMARY_TERRITORY } from "@/shared/lib/timezone-country-map/timezone-country-map";

describe("timezone-country-map", () => {
  describe("TIMEZONE_TO_PRIMARY_TERRITORY", () => {
    it("maps timezones to country codes", () => {
      expect(TIMEZONE_TO_PRIMARY_TERRITORY["America/Sao_Paulo"]).toBe("BR");
      expect(TIMEZONE_TO_PRIMARY_TERRITORY["Europe/London"]).toBe("GB");
      expect(TIMEZONE_TO_PRIMARY_TERRITORY["America/New_York"]).toBe("US");
    });

    it("has entries for common timezones", () => {
      expect(Object.keys(TIMEZONE_TO_PRIMARY_TERRITORY).length).toBeGreaterThan(100);
    });
  });
});
