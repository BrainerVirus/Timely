import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBootElapsedMs, setBootStartMark } from "@/core/services/BootTiming/boot-timing";

describe("boot-timing", () => {
  const originalPerformance = globalThis.performance;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "performance", {
      value: {
        now: vi.fn(() => 1000),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, "performance", {
      value: originalPerformance,
      writable: true,
    });
  });

  it("setBootStartMark stores mark on window when available", () => {
    setBootStartMark(500);
    expect((globalThis as unknown as { __timelyBootStartMs?: number }).__timelyBootStartMs).toBe(
      500,
    );
  });

  it("getBootElapsedMs returns elapsed time when mark exists", () => {
    setBootStartMark(500);
    (globalThis.performance as { now: () => number }).now = () => 1500;
    expect(getBootElapsedMs()).toBe(1000);
  });

  it("getBootElapsedMs returns performance.now when no mark", () => {
    delete (globalThis as unknown as { __timelyBootStartMs?: number }).__timelyBootStartMs;
    expect(getBootElapsedMs()).toBe(1000);
  });
});
