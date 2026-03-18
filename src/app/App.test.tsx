import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App, { router } from "@/app/App";
import { I18nProvider } from "@/lib/i18n";
import { mockBootstrap } from "@/lib/mock-data";
import * as tauriModule from "@/lib/tauri";
import { useAppStore } from "@/stores/app-store";

import type { PlaySnapshot, SetupState, WorklogSnapshot } from "@/types/dashboard";

vi.mock("@/lib/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.1",
    isPrerelease: true,
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.1",
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

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    listGitLabConnections: vi.fn(async () => []),
    loadBootstrapPayload: vi.fn(async () => mockBootstrap),
    loadAppPreferences: vi.fn(async () => ({
      themeMode: "system",
      language: "auto",
      updateChannel: "stable",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
    })),
    saveAppPreferences: vi.fn(async (preferences) => preferences),
    loadHolidayCountries: vi.fn(async () => []),
    loadHolidayYear: vi.fn(async (countryCode: string, year: number) => ({
      countryCode,
      year,
      holidays: [],
    })),
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

function emitDesktopEvent(event: string, payload: unknown) {
  for (const handler of eventListeners.get(event) ?? []) {
    handler(payload);
  }
}

async function renderAppShell() {
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

  await screen.findByRole("button", { name: "Home" });
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
  vi.restoreAllMocks();
});

beforeEach(async () => {
  mockDrive.mockClear();
  eventListeners.clear();
  vi.mocked(tauriModule.loadSetupState).mockReset().mockResolvedValue(COMPLETE_SETUP);
  vi.mocked(tauriModule.listGitLabConnections).mockReset().mockResolvedValue([]);
  vi.mocked(tauriModule.loadBootstrapPayload).mockReset().mockResolvedValue(mockBootstrap);
  vi.mocked(tauriModule.loadAppPreferences).mockReset().mockResolvedValue({
    themeMode: "system",
    language: "auto",
    updateChannel: "stable",
    holidayCountryMode: "manual",
    holidayCountryCode: undefined,
    timeFormat: "hm",
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
  });
  vi.mocked(tauriModule.saveAppPreferences).mockReset().mockImplementation(async (preferences) => preferences);
  vi.mocked(tauriModule.loadHolidayCountries).mockReset().mockResolvedValue([]);
  vi.mocked(tauriModule.loadHolidayYear)
    .mockReset()
    .mockImplementation(async (countryCode, year) => ({ countryCode, year, holidays: [] }));
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
  // Reset router to "/" so each test starts at the home route
  await act(async () => {
    await router.navigate({ to: "/" });
  });
  useAppStore.setState({
    lifecycle: { phase: "loading" },
    connections: [],
    syncState: { status: "idle", log: [] },
    setupState: COMPLETE_SETUP,
    setupAssistMode: "none",
    onboardingCompleted: false,
  });
});

describe("App", () => {
  it("renders the dashboard shell with NavRail and TopBar", async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Worklog" })).toBeInTheDocument();
    expect(screen.getByText("Beta 0.1.0-beta.1")).toBeInTheDocument();
  });

  it("hydrates the top bar from persisted last synced timestamp", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-03-17T12:00:00Z").getTime(),
    );
    vi.mocked(tauriModule.loadBootstrapPayload).mockResolvedValue({
      ...mockBootstrap,
      lastSyncedAt: "2026-03-17T11:58:00Z",
    });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await screen.findByText("Last synced: 2 minutes ago");
  });

  it(
    "shows the Period tab label in worklog",
    async () => {
    await import("@/features/worklog/worklog-page");

      await renderAppShell();

      await act(async () => {
        await router.navigate({ to: "/worklog", search: { mode: "period" } });
      });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/worklog");
        expect(screen.getByRole("tab", { name: "Period" })).toBeInTheDocument();
      });
    },
    10000,
  );

  it(
    "renders the shop route with locked and owned store items",
    async () => {
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

      await renderAppShell();

      await act(async () => {
        await router.navigate({ to: "/play/shop" });
      });

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
    },
    10000,
  );

  it("renders the simplified overview with immersive hero and focused modules", async () => {
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({ to: "/play" });
    });

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
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PAGINATED_PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({ to: "/play/shop" });
    });

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
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({ to: "/play/collection" });
    });

    await waitFor(() => {
      expect(screen.getAllByText("Collection").length).toBeGreaterThan(0);
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Companions")).toBeInTheDocument();
    expect(screen.getByText("Habitat scenes")).toBeInTheDocument();
    expect(screen.getByText("Wearables and trinkets")).toBeInTheDocument();
    expect(screen.getByText("Signal Frame")).toBeInTheDocument();
  });

  it("renders the missions route without achievements", async () => {
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({ to: "/play/missions" });
    });

    await waitFor(() => {
      expect(screen.getAllByText("Missions").length).toBeGreaterThan(0);
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Balanced day")).toBeInTheDocument();
    expect(screen.getByText("Clean week")).toBeInTheDocument();
    expect(screen.queryByText("Streak keeper")).not.toBeInTheDocument();
  });

  it("renders the achievements route without daily and weekly missions", async () => {
    vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(PLAY_ROUTE_SNAPSHOT);

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({ to: "/play/achievements" });
    });

    await waitFor(() => {
      expect(screen.getAllByText("Achievements").length).toBeGreaterThan(0);
    });

    expect(screen.getByLabelText("Play")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Streak keeper")).toBeInTheDocument();
    expect(screen.queryByText("Balanced day")).not.toBeInTheDocument();
    expect(screen.queryByText("Clean week")).not.toBeInTheDocument();
  });

  it("renders nested worklog detail from route search", async () => {
    await import("@/features/worklog/worklog-page");

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await act(async () => {
      router.navigate({
        to: "/worklog",
        search: { mode: "week", detailDate: "2026-03-02" },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Back to week/i })).toBeInTheDocument();
    });
  });

  it("shows zero logged hours on fresh start (no seed data)", async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.queryByText(/38\.7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Captain Crisp/)).not.toBeInTheDocument();
  });

  it("redirects to setup wizard when setup is incomplete", async () => {
    vi.mocked(tauriModule.loadSetupState).mockResolvedValue(INCOMPLETE_SETUP);
    useAppStore.setState({ setupState: INCOMPLETE_SETUP });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome to Timely")).toBeInTheDocument();
    });
  });

  it("shows the dashboard when setup is complete", async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("opens settings instead of the wizard from continue setup", async () => {
    render(
      <I18nProvider>
        <App />
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
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      language: "auto",
      updateChannel: "stable",
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: true,
    });

    render(
      <I18nProvider>
        <App />
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
    render(
      <I18nProvider>
        <App />
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

  it("opens the about dialog when the desktop event is emitted", async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await act(async () => {
      emitDesktopEvent("open-about", true);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "About Timely" })).toBeInTheDocument();
      expect(screen.getByText("v0.1.0-beta.1")).toBeInTheDocument();
    });
  });
});
