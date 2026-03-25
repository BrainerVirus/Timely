import { cleanup, render, waitFor } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { MotionProvider, useMotionSettings } from "@/core/services/MotionService/motion";
import { WeekView } from "@/features/worklog/components/WeekView/WeekView";

import type { DayOverview } from "@/shared/types/dashboard";

const eventListeners = new Map<string, Array<(payload: unknown) => void>>();

vi.mock("@/core/services/TauriService/tauri", () => ({
  listenDesktopEvent: vi.fn(async (event: string, cb: (payload: unknown) => void) => {
    const handlers = eventListeners.get(event) ?? [];
    handlers.push(cb);
    eventListeners.set(event, handlers);

    return () => {
      eventListeners.set(
        event,
        (eventListeners.get(event) ?? []).filter((handler) => handler !== cb),
      );
    };
  }),
  listenAppPreferencesChanged: vi.fn(async () => () => {}),
  logFrontendBootTiming: vi.fn(async () => {}),
  loadAppPreferences: vi.fn(async () => ({
    themeMode: "system",
    motionPreference: "system",
    language: "en",
    updateChannel: "stable",
    holidayCountryMode: "auto",
    holidayCountryCode: "CL",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
    notificationsEnabled: true,
    notificationThresholds: {
      minutes45: true,
      minutes30: true,
      minutes15: true,
      minutes5: true,
    },
  })),
}));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

function MotionProbe() {
  const settings = useMotionSettings();

  return (
    <output
      data-motion-level={settings.motionLevel}
      data-decorative={String(settings.allowDecorativeAnimation)}
      data-looping={String(settings.allowLoopingAnimation)}
    />
  );
}

function emitDesktopEvent(event: string, payload: unknown) {
  for (const handler of eventListeners.get(event) ?? []) {
    handler(payload);
  }
}

function makeWeek(datePrefix: string): DayOverview[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: `${datePrefix}-${String(index + 1).padStart(2, "0")}`,
    shortLabel: `D${index + 1}`,
    dateLabel: `${datePrefix}-${String(index + 1).padStart(2, "0")}`,
    loggedHours: index + 1,
    targetHours: 8,
    focusHours: index + 1,
    overflowHours: 0,
    status: index === 0 ? "on_track" : "under_target",
    isToday: index === 0,
    holidayName: undefined,
    topIssues: [],
  }));
}

describe("MotionProvider", () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.motion;
    eventListeners.clear();
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("sets the root motion attribute from the app preference", async () => {
    render(
      <MotionProvider motionPreference="reduced">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("reduced");
    });
  });

  it("keeps full motion when the app preference overrides system reduced motion", async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(
      <MotionProvider motionPreference="full">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("full");
    });
  });

  it("clears the root motion attribute on unmount", async () => {
    const { unmount } = render(
      <MotionProvider motionPreference="reduced">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("reduced");
    });

    unmount();

    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("keeps decorative animation enabled across window hide and restore", async () => {
    render(
      <MotionProvider motionPreference="full">
        <MotionProbe />
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector("output")).toHaveAttribute("data-motion-level", "full");
    });

    emitDesktopEvent("timely-window-hidden", true);

    await waitFor(() => {
      const probe = document.querySelector("output");
      expect(document.documentElement.dataset.motion).toBe("none");
      expect(probe).toHaveAttribute("data-motion-level", "none");
      expect(probe).toHaveAttribute("data-decorative", "true");
      expect(probe).toHaveAttribute("data-looping", "false");
    });

    emitDesktopEvent("timely-window-shown", true);

    await waitFor(() => {
      const probe = document.querySelector("output");
      expect(document.documentElement.dataset.motion).toBe("full");
      expect(probe).toHaveAttribute("data-motion-level", "full");
      expect(probe).toHaveAttribute("data-decorative", "true");
      expect(probe).toHaveAttribute("data-looping", "true");
    });
  });

  it("replays week grid animation on real range changes but not on window restore", async () => {
    const { rerender } = render(
      <I18nProvider>
        <MotionProvider motionPreference="full">
          <WeekView week={makeWeek("2026-03")} startDate="2026-03-01" viewMode="week" />
        </MotionProvider>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-grid-stagger-item="true"]')).toHaveStyle("opacity: 1");
    });

    emitDesktopEvent("timely-window-hidden", true);
    emitDesktopEvent("timely-window-shown", true);

    await waitFor(() => {
      expect(document.querySelector('[data-grid-stagger-item="true"]')).toHaveStyle("opacity: 1");
    });

    rerender(
      <I18nProvider>
        <MotionProvider motionPreference="full">
          <WeekView week={makeWeek("2026-04")} startDate="2026-04-01" viewMode="week" />
        </MotionProvider>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-grid-stagger-item="true"]')).toHaveStyle("opacity: 0");
    });
  });
});
