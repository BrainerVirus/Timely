import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadCriticalStartupFonts,
  loadDeferredAppFonts,
} from "@/core/services/LoadFonts/load-fonts";

vi.mock("@fontsource/fredoka/600.css", () => ({}));
vi.mock("@fontsource/fredoka/700.css", () => ({}));
vi.mock("@fontsource/nunito/400.css", () => ({}));
vi.mock("@fontsource/nunito/500.css", () => ({}));
vi.mock("@fontsource/nunito/600.css", () => ({}));
vi.mock("@fontsource/nunito/700.css", () => ({}));
vi.mock("@fontsource/fredoka/400.css", () => ({}));
vi.mock("@fontsource/fredoka/500.css", () => ({}));
vi.mock("@fontsource/jetbrains-mono/400.css", () => ({}));
vi.mock("@fontsource/jetbrains-mono/500.css", () => ({}));

describe("load-fonts", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      fonts: {
        load: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it("loadCriticalStartupFonts returns a promise", () => {
    const result = loadCriticalStartupFonts();
    expect(result).toBeInstanceOf(Promise);
  });

  it("loadDeferredAppFonts returns a promise", () => {
    const result = loadDeferredAppFonts();
    expect(result).toBeInstanceOf(Promise);
  });
});
