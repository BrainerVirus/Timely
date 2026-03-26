import { describe, expect, it } from "vitest";
import { getReleaseHighlights } from "@/core/services/ReleaseHighlights/release-highlights";

describe("release-highlights", () => {
  describe("getReleaseHighlights", () => {
    it("returns content for known version and locale", () => {
      const result = getReleaseHighlights("0.1.0-beta.7", "en");
      expect(result).not.toBeNull();
      expect(result?.title).toContain("Beta.7");
      expect(result?.badge).toBeDefined();
      expect(Array.isArray(result?.bullets)).toBe(true);
    });

    it("returns es content when available", () => {
      const result = getReleaseHighlights("0.1.0-beta.7", "es");
      expect(result).not.toBeNull();
      expect(result?.title).toBeDefined();
    });

    it("returns null for unknown version", () => {
      const result = getReleaseHighlights("99.99.99", "en");
      expect(result).toBeNull();
    });

    it("falls back to en for unknown locale", () => {
      const result = getReleaseHighlights("0.1.0-beta.7", "fr" as "en");
      expect(result).not.toBeNull();
      expect(result?.title).toBeDefined();
    });

    it("keeps spanish and portuguese highlights free of obvious English leakage", () => {
      const bannedWords = /\b(setup|tray|build|release|updater|upgrade|workflow|shell|app)\b/i;

      for (const locale of ["es", "pt"] as const) {
        const result = getReleaseHighlights("0.1.0-beta.7", locale);
        expect(result).not.toBeNull();

        if (!result) {
          continue;
        }

        expect(result.title).not.toMatch(bannedWords);
        expect(result.badge).not.toMatch(bannedWords);
        expect(result.intro).not.toMatch(bannedWords);

        for (const bullet of result.bullets) {
          expect(bullet).not.toMatch(bannedWords);
        }
      }
    });
  });
});
