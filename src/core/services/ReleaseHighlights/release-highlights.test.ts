import { describe, expect, it } from "vitest";
import { getReleaseHighlights } from "@/core/services/ReleaseHighlights/release-highlights";

describe("release-highlights", () => {
  describe("getReleaseHighlights", () => {
    it("returns content for known version and locale", () => {
      const result = getReleaseHighlights("0.1.0-beta.3", "en");
      expect(result).not.toBeNull();
      expect(result?.title).toContain("Timely");
      expect(result?.badge).toBeDefined();
      expect(Array.isArray(result?.bullets)).toBe(true);
    });

    it("returns es content when available", () => {
      const result = getReleaseHighlights("0.1.0-beta.3", "es");
      expect(result).not.toBeNull();
      expect(result?.title).toBeDefined();
    });

    it("returns null for unknown version", () => {
      const result = getReleaseHighlights("99.99.99", "en");
      expect(result).toBeNull();
    });

    it("falls back to en for unknown locale", () => {
      const result = getReleaseHighlights("0.1.0-beta.3", "fr" as "en");
      expect(result).not.toBeNull();
      expect(result?.title).toBeDefined();
    });
  });
});
