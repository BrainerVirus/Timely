import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import App, { createAppRouter } from "@/core/app/App";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import * as tauriModule from "@/core/services/TauriService/tauri";
import { useAppStore } from "@/core/stores/AppStore/app-store";
import { resetPlaySnapshotCache } from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";
import { resetWorklogSnapshotCache } from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type {
  AppPreferences,
  PlaySnapshot,
  SetupState,
  WorklogSnapshot,
} from "@/shared/types/dashboard";

const testNotificationPrefs = {
  notificationsEnabled: true,
  notificationThresholds: {
    minutes45: true,
    minutes30: true,
    minutes15: true,
    minutes5: true,
  },
} as const;

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.5",
    isPrerelease: true,
    defaultUpdateChannel: "unstable",
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.5",
  },
  isPrereleaseVersion: (version: string) => /-/.test(version),
}));

// Mock driver.js so the tour doesn't try to manipulate DOM
const mockDrive = vi.fn();
const eventListeners = new Map<string, Array<(payload: unknown) => void>>();
vi.mock("driver.js", () => ({
  driver: vi.fn(() => ({
    drive: mockDrive,
    destroy: vi.fn(),
  })),
}));

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>(
    "@/core/services/TauriService/tauri",
  );
  return {
    ...actual,
    listGitLabConnections: vi.fn(async () => []),
    loadBootstrapPayload: vi.fn(async () => mockBootstrap),
    loadAppPreferences: vi.fn(async () => ({
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: "0.1.0-beta.5",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    })),
    getNotificationPermissionState: vi.fn(async () => "granted"),
    requestNotificationPermission: vi.fn(async () => "granted"),
    sendTestNotification: vi.fn(async () => {}),
    saveAppPreferences: vi.fn(async (preferences) => preferences),
    loadHolidayCountries: vi.fn(async () => []),
    loadHolidayYear: vi.fn(async (countryCode: string, year: number) => ({
      countryCode,
      year,
      holidays: [],
    })),
    saveSetupState: vi.fn(async (setupState) => setupState),
    resetAllData: vi.fn(async () => {}),
    loadSetupState: vi.fn(),
    loadWorklogSnapshot: vi.fn(async () => ({
      mode: "day",
      range: {
        startDate: mockBootstrap.today.date,
        endDate: mockBootstrap.today.date,
        label: mockBootstrap.today.date,
      },
      selectedDay: mockBootstrap.today,
      days: mockBootstrap.week,
      month: mockBootstrap.month,
      auditFlags: mockBootstrap.auditFlags,
    })),
    loadPlaySnapshot: vi.fn(async () => ({
      profile: {
        alias: "Pilot",
        level: 1,
        xp: 0,
        streakDays: 0,
        companion: "Aurora fox",
      },
      streak: { currentDays: 0, window: [] },
      quests: [],
      tokens: 0,
      equippedCompanionMood: "calm",
      storeCatalog: [],
      inventory: [],
    })),
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
  };
});

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

function emitDesktopEvent(event: string, payload: unknown) {
  for (const handler of eventListeners.get(event) ?? []) {
    handler(payload);
  }
}

async function preloadPlayRoutes() {
  await Promise.all([
    import("@/features/play/pages/PlayLayout/PlayLayout"),
    import("@/features/play/pages/PlayRoutePages/PlayRoutePages"),
  ]);
}

const COMPLETE_SETUP: SetupState = {
  currentStep: "done",
  isComplete: true,
  completedSteps: ["welcome", "schedule", "provider", "sync", "done"],
};

const INCOMPLETE_SETUP: SetupState = {
  currentStep: "welcome",
  isComplete: false,
  completedSteps: [],
};

const READY_FOR_DONE_SETUP: SetupState = {
  currentStep: "done",
  isComplete: false,
  completedSteps: ["welcome", "schedule", "provider", "sync"],
};

const PLAY_ROUTE_SNAPSHOT: PlaySnapshot = {
  profile: {
    alias: "Pilot",
    level: 4,
    xp: 320,
    streakDays: 5,
    companion: "Aurora fox",
  },
  streak: {
    currentDays: 5,
    window: [
      { date: "2026-03-09", state: "counted", isToday: false },
      { date: "2026-03-10", state: "counted", isToday: false },
      { date: "2026-03-11", state: "counted", isToday: false },
      { date: "2026-03-12", state: "counted", isToday: false },
      { date: "2026-03-13", state: "counted", isToday: false },
      { date: "2026-03-14", state: "counted", isToday: true },
      { date: "2026-03-15", state: "idle", isToday: false },
    ],
  },
  tokens: 110,
  equippedCompanionMood: "focused",
  storeCatalog: [
    {
      rewardKey: "starlit-camp",
      rewardName: "Starlit Camp",
      rewardType: "habitat-scene",
      accessorySlot: "environment",
      environmentSceneKey: "starlit-camp",
      themeTag: "focus",
      costTokens: 140,
      owned: true,
      equipped: true,
      unlocked: true,
      featured: true,
      rarity: "epic",
      storeSection: "featured",
    },
    {
      rewardKey: "rainy-retreat",
      rewardName: "Rainy Retreat",
      rewardType: "habitat-scene",
      accessorySlot: "environment",
      environmentSceneKey: "rainy-retreat",
      themeTag: "recovery",
      costTokens: 95,
      owned: false,
      equipped: false,
      unlocked: false,
      unlockHint: "Take a true day off or log a light recovery day to unlock this den scene.",
      featured: true,
      rarity: "rare",
      storeSection: "featured",
    },
    {
      rewardKey: "aurora-evolution",
      rewardName: "Aurora Evolution",
      rewardType: "companion",
      accessorySlot: "companion",
      companionVariant: "arctic",
      costTokens: 120,
      owned: true,
      equipped: true,
      unlocked: true,
      featured: true,
      rarity: "epic",
      storeSection: "companions",
    },
    {
      rewardKey: "kitsune-lumen",
      rewardName: "Kitsune Lumen",
      rewardType: "companion",
      accessorySlot: "companion",
      companionVariant: "kitsune",
      costTokens: 160,
      owned: false,
      equipped: false,
      unlocked: true,
      featured: true,
      rarity: "epic",
      storeSection: "companions",
    },
    {
      rewardKey: "frame-signal",
      rewardName: "Signal Frame",
      rewardType: "avatar-frame",
      accessorySlot: "eyewear",
      costTokens: 80,
      owned: true,
      equipped: true,
      unlocked: true,
      featured: true,
      rarity: "rare",
      storeSection: "featured",
    },
    {
      rewardKey: "aurora-scarf",
      rewardName: "Aurora Scarf",
      rewardType: "neckwear",
      accessorySlot: "neckwear",
      costTokens: 65,
      owned: true,
      equipped: false,
      unlocked: true,
      featured: true,
      rarity: "rare",
      storeSection: "featured",
    },
  ],
  inventory: [
    {
      rewardKey: "starlit-camp",
      rewardName: "Starlit Camp",
      rewardType: "habitat-scene",
      accessorySlot: "environment",
      environmentSceneKey: "starlit-camp",
      themeTag: "focus",
      costTokens: 140,
      owned: true,
      equipped: true,
    },
    {
      rewardKey: "frame-signal",
      rewardName: "Signal Frame",
      rewardType: "avatar-frame",
      accessorySlot: "eyewear",
      costTokens: 80,
      owned: true,
      equipped: true,
    },
    {
      rewardKey: "aurora-scarf",
      rewardName: "Aurora Scarf",
      rewardType: "neckwear",
      accessorySlot: "neckwear",
      costTokens: 65,
      owned: true,
      equipped: false,
    },
  ],
  quests: [
    {
      questKey: "balanced_day",
      title: "Balanced day",
      description: "Meet your target without overflow.",
      rewardLabel: "50 tokens",
      targetValue: 1,
      progressValue: 1,
      cadence: "daily",
      category: "consistency",
      isActive: true,
      isClaimed: false,
    },
    {
      questKey: "clean_week",
      title: "Clean week",
      description: "Finish the week with no under-target workdays.",
      rewardLabel: "75 tokens",
      targetValue: 5,
      progressValue: 4,
      cadence: "weekly",
      category: "consistency",
      isActive: false,
      isClaimed: false,
    },
    {
      questKey: "streak_keeper",
      title: "Streak keeper",
      description: "Protect a seven-day streak without breaking the chain.",
      rewardLabel: "120 tokens",
      targetValue: 7,
      progressValue: 5,
      cadence: "achievement",
      category: "milestone",
      isActive: false,
      isClaimed: false,
    },
  ],
};

const PAGINATED_PLAY_ROUTE_SNAPSHOT: PlaySnapshot = {
  ...PLAY_ROUTE_SNAPSHOT,
  storeCatalog: [
    ...PLAY_ROUTE_SNAPSHOT.storeCatalog,
    {
      rewardKey: "sunlit-studio",
      rewardName: "Sunlit Studio",
      rewardType: "habitat-scene",
      accessorySlot: "environment",
      environmentSceneKey: "sunlit-studio",
      themeTag: "focus",
      costTokens: 135,
      owned: false,
      equipped: false,
      unlocked: true,
      featured: false,
      rarity: "rare",
      storeSection: "featured",
    },
    {
      rewardKey: "comet-cap",
      rewardName: "Comet Cap",
      rewardType: "headwear",
      accessorySlot: "headwear",
      costTokens: 55,
      owned: false,
      equipped: false,
      unlocked: true,
      featured: false,
      rarity: "rare",
      storeSection: "accessories",
    },
  ],
};

const DEFAULT_WORKLOG_SNAPSHOT: WorklogSnapshot = {
  mode: "day",
  range: {
    startDate: mockBootstrap.today.date,
    endDate: mockBootstrap.today.date,
    label: mockBootstrap.today.date,
  },
  selectedDay: mockBootstrap.today,
  days: mockBootstrap.week,
  month: mockBootstrap.month,
  auditFlags: mockBootstrap.auditFlags,
};

const NESTED_WEEK_WORKLOG_SNAPSHOT: WorklogSnapshot = {
  mode: "week",
  range: {
    startDate: "2026-03-02",
    endDate: "2026-03-08",
    label: "Week of Mar 2",
  },
  selectedDay: mockBootstrap.today,
  days: mockBootstrap.week,
  month: mockBootstrap.month,
  auditFlags: mockBootstrap.auditFlags,
};

afterEach(() => {
  cleanup();
  globalThis.localStorage.clear();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  mockDrive.mockClear();
  eventListeners.clear();
  resetPlaySnapshotCache();
  resetWorklogSnapshotCache();
  globalThis.localStorage.clear();
  vi.mocked(tauriModule.loadSetupState).mockReset().mockResolvedValue(COMPLETE_SETUP);
  vi.mocked(tauriModule.listGitLabConnections).mockReset().mockResolvedValue([]);
  vi.mocked(tauriModule.loadBootstrapPayload).mockReset().mockResolvedValue(mockBootstrap);
  vi.mocked(tauriModule.loadAppPreferences)
    .mockReset()
    .mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: "0.1.0-beta.5",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });
  vi.mocked(tauriModule.saveAppPreferences)
    .mockReset()
    .mockImplementation(async (preferences) => preferences);
  vi.mocked(tauriModule.loadHolidayCountries).mockReset().mockResolvedValue([]);
  vi.mocked(tauriModule.loadHolidayYear)
    .mockReset()
    .mockImplementation(async (countryCode, year) => ({ countryCode, year, holidays: [] }));
  vi.mocked(tauriModule.saveSetupState)
    .mockReset()
    .mockImplementation(async (setupState) => setupState);
  vi.mocked(tauriModule.loadWorklogSnapshot)
    .mockReset()
    .mockImplementation(async (input) => {
      if (input.mode === "week") {
        return NESTED_WEEK_WORKLOG_SNAPSHOT;
      }

      return {
        ...DEFAULT_WORKLOG_SNAPSHOT,
        mode: input.mode,
      };
    });
  vi.mocked(tauriModule.loadPlaySnapshot)
    .mockReset()
    .mockResolvedValue({
      profile: {
        alias: "Pilot",
        level: 1,
        xp: 0,
        streakDays: 0,
        companion: "Aurora fox",
      },
      streak: { currentDays: 0, window: [] },
      quests: [],
      tokens: 0,
      equippedCompanionMood: "calm",
      storeCatalog: [],
      inventory: [],
    });
  useAppStore.setState({
    lifecycle: { phase: "ready", payload: mockBootstrap },
    connections: [],
    syncState: { status: "idle", log: [] },
    setupState: COMPLETE_SETUP,
    setupAssistMode: "none",
    onboardingCompleted: false,
  });
});

describe("App", () => {
  it("renders the dashboard shell with NavRail and TopBar", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Worklog" })).toBeInTheDocument();
    expect(screen.getByText("Beta 0.1.0-beta.5")).toBeInTheDocument();
  });

  it("hydrates the top bar from persisted last synced timestamp", async () => {
    const router = createAppRouter();

    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-17T12:00:00Z").getTime());
    vi.mocked(tauriModule.loadBootstrapPayload).mockResolvedValue({
      ...mockBootstrap,
      lastSyncedAt: "2026-03-17T11:58:00Z",
    });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await screen.findByText("Last synced: 2 minutes ago");
  });

  it("shows the Period tab label in worklog", async () => {
    await import("@/features/worklog/pages/WorklogPage/WorklogPage");

    const router = createAppRouter(["/worklog?mode=period"]);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/worklog");
      expect(screen.getByRole("tab", { name: "Period" })).toBeInTheDocument();
    });
  }, 10000);

  it("renders the shop route with locked and owned store items", async () => {
    await preloadPlayRoutes();
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    const router = createAppRouter(["/play/shop"]);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/play/shop");
      expect(screen.getByText("Rainy Retreat")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Play" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Preview" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Current preview")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Featured" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Companions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Accessories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Owned" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Locked" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  }, 10000);

  it("shows a controlled play error state when the play snapshot fails to load", async () => {
    await preloadPlayRoutes();
    vi.mocked(tauriModule.loadPlaySnapshot).mockRejectedValue(new Error("play offline"));

    const router = createAppRouter(["/play"]);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/play");
      expect(screen.getByText("play offline")).toBeInTheDocument();
    });

    expect(screen.getByText("play offline")).toBeInTheDocument();
    expect(screen.queryByText("Featured rewards")).not.toBeInTheDocument();
  });

  it("renders the simplified overview with immersive hero and focused modules", async () => {
    await preloadPlayRoutes();
    const router = createAppRouter(["/play"]);

    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Featured rewards")).toBeInTheDocument();
    });

    expect(screen.getByText("Current den")).toBeInTheDocument();
    expect(screen.getByText("Current setup")).toBeInTheDocument();
    expect(screen.getByText("Recommended missions")).toBeInTheDocument();
    expect(screen.queryByText("Companion spotlight")).not.toBeInTheDocument();
    expect(screen.queryByText("Habitat scene")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Shop$/ }).length).toBeGreaterThan(1);
  });

  it("supports layered previews and pagination in the shop route", async () => {
    await preloadPlayRoutes();
    const router = createAppRouter(["/play/shop"]);

    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PAGINATED_PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Clear all preview" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Preview" })[0]);
    expect(await screen.findByRole("button", { name: "Clear all preview" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Previewing" })).toHaveLength(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Preview" })[4]);
    expect(screen.getAllByRole("button", { name: "Previewing" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Previewing" })[0]);
    expect(screen.getAllByRole("button", { name: "Previewing" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear all preview" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Clear all preview" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });
    expect(screen.getByText("Sunlit Studio")).toBeInTheDocument();
    expect(screen.getByText("Comet Cap")).toBeInTheDocument();
  });

  it("renders the collection route with owned sections", async () => {
    await preloadPlayRoutes();
    const router = createAppRouter(["/play/collection"]);
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Signal Frame")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Companions")).toBeInTheDocument();
    expect(screen.getByText("Habitat scenes")).toBeInTheDocument();
    expect(screen.getByText("Wearables and trinkets")).toBeInTheDocument();
    expect(screen.getByText("Signal Frame")).toBeInTheDocument();
  });

  it("renders the missions route without achievements", async () => {
    await preloadPlayRoutes();
    const router = createAppRouter(["/play/missions"]);
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Balanced day")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Balanced day")).toBeInTheDocument();
    expect(screen.getByText("Clean week")).toBeInTheDocument();
    expect(screen.queryByText("Streak keeper")).not.toBeInTheDocument();
  });

  it("renders the achievements route without daily and weekly missions", async () => {
    await preloadPlayRoutes();
    const router = createAppRouter(["/play/achievements"]);
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Streak keeper")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Streak keeper")).toBeInTheDocument();
    expect(screen.queryByText("Balanced day")).not.toBeInTheDocument();
    expect(screen.queryByText("Clean week")).not.toBeInTheDocument();
  });

  it("renders nested worklog detail from route search", async () => {
    await import("@/features/worklog/pages/WorklogPage/WorklogPage");

    const router = createAppRouter(["/worklog?mode=week&detailDate=2026-03-02"]);

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Back to week/i })).toBeInTheDocument();
    });
  });

  it("shows zero logged hours on fresh start (no seed data)", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.queryByText(/38\.7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Captain Crisp/)).not.toBeInTheDocument();
  });

  it("redirects to setup wizard when setup is incomplete", async () => {
    const router = createAppRouter();

    vi.mocked(tauriModule.loadSetupState).mockResolvedValue(INCOMPLETE_SETUP);
    useAppStore.setState({ setupState: INCOMPLETE_SETUP });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome to Timely")).toBeInTheDocument();
    });
  });

  it("always restarts incomplete setup from the welcome step", async () => {
    const router = createAppRouter(["/setup/done"]);

    vi.mocked(tauriModule.loadSetupState).mockResolvedValue(READY_FOR_DONE_SETUP);
    useAppStore.setState({ setupState: READY_FOR_DONE_SETUP });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome to Timely")).toBeInTheDocument();
    });

    expect(tauriModule.saveSetupState).toHaveBeenCalledWith({
      currentStep: "welcome",
      isComplete: false,
      completedSteps: [],
    });
  });

  it("shows the dashboard when setup is complete", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("renders immediately from cached state while bootstrap is still loading", async () => {
    let resolveBootstrap: ((value: typeof mockBootstrap) => void) | null = null;
    vi.mocked(tauriModule.loadBootstrapPayload).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBootstrap = resolve;
        }),
    );

    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(resolveBootstrap).toBeTypeOf("function");
    await act(async () => {
      resolveBootstrap!(mockBootstrap);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });
  });

  it("opens settings instead of the wizard from continue setup", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue setup/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });

    expect(screen.queryByText("Welcome to Timely")).not.toBeInTheDocument();
  });

  it("does NOT launch onboarding when already completed", async () => {
    const router = createAppRouter();

    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: "0.1.0-beta.5",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: true,
      ...testNotificationPrefs,
    });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("opens settings when the desktop event is emitted", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await act(async () => {
      emitDesktopEvent("open-settings", true);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });
  });

  it("renders when reduced motion is requested", async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });
  });

  it("disables page stagger motion when reduced motion is enabled", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValueOnce({
      themeMode: "system",
      motionPreference: "reduced",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: "0.1.0-beta.5",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    const heading = screen.getByRole("heading", { name: "Home" }).closest("div");
    expect(heading).not.toHaveStyle("transform: translateY(12px)");
  });

  it("applies the persisted theme before rendering the app shell", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValueOnce({
      themeMode: "light",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: "0.1.0-beta.5",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  it("opens the about dialog when the desktop event is emitted", async () => {
    const router = createAppRouter();

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Welcome to the first Timely desktop beta"),
      ).not.toBeInTheDocument();
    });

    await act(async () => {
      emitDesktopEvent("open-about", true);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "About Timely" })).toBeInTheDocument();
      expect(screen.getByText("v0.1.0-beta.5")).toBeInTheDocument();
    });
  });

  it("does not show release highlights on a clean setup reset", async () => {
    const router = createAppRouter();
    let preferences: AppPreferences = {
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "unstable",
      lastInstalledVersion: undefined,
      lastSeenReleaseHighlightsVersion: undefined,
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    };

    vi.mocked(tauriModule.loadAppPreferences)
      .mockReset()
      .mockImplementation(async () => preferences);
    vi.mocked(tauriModule.saveAppPreferences)
      .mockReset()
      .mockImplementation(async (nextPreferences) => {
        preferences = nextPreferences;
        return nextPreferences;
      });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ lastInstalledVersion: "0.1.0-beta.5" }),
      );
    });

    expect(screen.queryByText("Timely beta.5 — your fox stops faking an accent")).not.toBeInTheDocument();

    await act(async () => {
      useAppStore.setState({ onboardingCompleted: true });
    });

    await waitFor(() => {
      expect(screen.queryByText("Timely beta.5 — your fox stops faking an accent")).not.toBeInTheDocument();
    });
  });

  it("waits for onboarding to finish before showing release highlights for an upgrade", async () => {
    const router = createAppRouter();
    let preferences: AppPreferences = {
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "unstable",
      lastInstalledVersion: "0.1.0-beta.1",
      lastSeenReleaseHighlightsVersion: "0.1.0-beta.1",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    };

    vi.mocked(tauriModule.loadAppPreferences)
      .mockReset()
      .mockImplementation(async () => preferences);
    vi.mocked(tauriModule.saveAppPreferences)
      .mockReset()
      .mockImplementation(async (nextPreferences) => {
        preferences = nextPreferences;
        return nextPreferences;
      });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.queryByText("Timely beta.5 — your fox stops faking an accent")).not.toBeInTheDocument();

    await act(async () => {
      useAppStore.setState({ onboardingCompleted: true });
    });

    expect(await screen.findByText("Timely beta.5 — your fox stops faking an accent")).toBeInTheDocument();
  });

  it("shows release highlights once for an upgraded version", async () => {
    const router = createAppRouter();

    vi.mocked(tauriModule.loadAppPreferences)
      .mockReset()
      .mockResolvedValue({
        themeMode: "system",
        motionPreference: "system",
        language: "auto",
        updateChannel: "unstable",
        lastInstalledVersion: "0.0.9",
        lastSeenReleaseHighlightsVersion: "0.0.9",
        holidayCountryMode: "manual",
        holidayCountryCode: undefined,
        timeFormat: "hm",
        autoSyncEnabled: true,
        autoSyncIntervalMinutes: 30,
        trayEnabled: true,
        closeToTray: true,
        onboardingCompleted: true,
        ...testNotificationPrefs,
      });

    render(
      <I18nProvider>
        <App routerInstance={router} />
      </I18nProvider>,
    );

    expect(await screen.findByText("Timely beta.5 — your fox stops faking an accent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    await waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          lastInstalledVersion: "0.1.0-beta.5",
          lastSeenReleaseHighlightsVersion: "0.1.0-beta.5",
        }),
      );
    });
  });
});
