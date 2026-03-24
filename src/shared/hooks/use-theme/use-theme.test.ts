import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, resolveTheme } from "@/shared/hooks/use-theme/use-theme";
import { STARTUP_PREFS_STORAGE_KEY } from "@/core/services/StartupPrefs/startup-prefs";

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const addEventListener = vi.fn(
    (
      event: string,
      listener: EventListenerOrEventListenerObject | null,
      _options?: boolean | AddEventListenerOptions,
    ) => {
      if (event !== "change" || !listener) {
        return;
      }

      if (typeof listener === "function") {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
        return;
      }

      listeners.add((eventObject) => listener.handleEvent(eventObject));
    },
  );
  const removeEventListener = vi.fn(
    (
      event: string,
      listener: EventListenerOrEventListenerObject | null,
      _options?: boolean | EventListenerOptions,
    ) => {
      if (event !== "change" || !listener || typeof listener !== "function") {
        return;
      }

      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    },
  );

  const mediaQuery = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );

  return {
    mediaQuery,
    emit(nextMatches: boolean) {
      mediaQuery.matches = nextMatches;

      const event = { matches: nextMatches, media: mediaQuery.media } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

describe("theme resolution", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves system theme to dark when the OS preference is dark", () => {
    stubMatchMedia(true);

    expect(resolveTheme("system")).toBe("dark");
  });

  it("applies the resolved system theme to the document", () => {
    stubMatchMedia(false);

    applyTheme("system");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("updates the document when the system theme changes", () => {
    const { emit, mediaQuery } = stubMatchMedia(false);

    applyTheme("system");
    emit(true);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("cleans up the system listener when switching to a manual theme", () => {
    const { mediaQuery } = stubMatchMedia(true);

    applyTheme("system");
    applyTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("stores startup theme data for the next launch", () => {
    stubMatchMedia(false);

    applyTheme("dark");

    expect(globalThis.localStorage.getItem(STARTUP_PREFS_STORAGE_KEY)).toContain(
      '"themeMode":"dark"',
    );
  });
});
