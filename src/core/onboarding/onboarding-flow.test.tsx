import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { mockBootstrap } from "@/core/services/MockData/mock-data";
import * as tauriModule from "@/core/services/TauriService/tauri";
import { useAppStore } from "@/core/stores/AppStore/app-store";

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.1",
    isPrerelease: true,
    defaultUpdateChannel: "unstable",
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.1",
  },
}));

// Mock driver.js — capture the config passed to driver() and verify lockdown settings
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
const mockMoveNext = vi.fn();
const mockMovePrevious = vi.fn();
let lastDriverConfig: Record<string, unknown> = {};
const driverInstances: Array<{
  drive: typeof mockDrive;
  destroy: typeof mockDestroy;
  moveNext: typeof mockMoveNext;
  movePrevious: typeof mockMovePrevious;
}> = [];

vi.mock("driver.js", () => ({
  driver: vi.fn((config: Record<string, unknown>) => {
    lastDriverConfig = config;
    const instance = {
      drive: mockDrive,
      destroy: mockDestroy,
      moveNext: mockMoveNext,
      movePrevious: mockMovePrevious,
      getConfig: () => config,
    };
    driverInstances.push(instance);
    return instance;
  }),
}));

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>("@/core/services/TauriService/tauri");
  return {
    ...actual,
    listGitLabConnections: vi.fn(async () => []),
    loadAppPreferences: vi.fn(async () => ({
      themeMode: "system",
      motionPreference: "system",
      language: "auto",
      updateChannel: "stable",
      lastInstalledVersion: undefined,
      lastSeenReleaseHighlightsVersion: undefined,
      holidayCountryMode: "auto",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
    })),
    saveAppPreferences: vi.fn(async (preferences) => preferences),
  };
});

beforeEach(() => {
  mockDrive.mockClear();
  mockDestroy.mockClear();
  mockMoveNext.mockClear();
  mockMovePrevious.mockClear();
  lastDriverConfig = {};
  driverInstances.length = 0;
  buildInfo.onboardingTourEnabled = true;
  // Reset store with a minimal payload so the tour has something to save/restore
  useAppStore.setState({
    lifecycle: { phase: "ready", payload: mockBootstrap },
    connections: [],
    syncState: { status: "idle", log: [] },
    onboardingCompleted: false,
  });
  vi.mocked(tauriModule.loadAppPreferences).mockReset().mockResolvedValue({
    themeMode: "system",
    motionPreference: "system",
    language: "auto",
    updateChannel: "stable",
    lastInstalledVersion: undefined,
    lastSeenReleaseHighlightsVersion: undefined,
    holidayCountryMode: "auto",
    holidayCountryCode: undefined,
    timeFormat: "hm",
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
  });
  vi.mocked(tauriModule.saveAppPreferences)
    .mockReset()
    .mockImplementation(async (preferences) => preferences);
});

describe("OnboardingFlow", () => {
  it("calls driver().drive() when onboarding is not complete", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it("does NOT call driver().drive() when onboarding is already complete", async () => {
    useAppStore.setState({ onboardingCompleted: true });

    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await new Promise((r) => setTimeout(r, 1200));
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("does NOT call driver().drive() when the onboarding feature flag is disabled", async () => {
    buildInfo.onboardingTourEnabled = false;

    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await new Promise((r) => setTimeout(r, 1200));
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("works correctly across React StrictMode double-mount", async () => {
    const React = await import("react");
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(
      <React.StrictMode>
        <OnboardingFlow onNavigate={navigate} />
      </React.StrictMode>,
    );

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    expect(mockDrive).toHaveBeenCalledTimes(1);
  });

  it("configures driver with escape-proof lockdown settings", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Verify lockdown: no close, no keyboard, no interaction, overlay click blocked
    expect(lastDriverConfig.allowClose).toBe(false);
    expect(lastDriverConfig.allowKeyboardControl).toBe(false);
    expect(lastDriverConfig.disableActiveInteraction).toBe(true);
    expect(typeof lastDriverConfig.overlayClickBehavior).toBe("function");

    // showButtons should only have next/previous, no close
    expect(lastDriverConfig.showButtons).toEqual(["next", "previous"]);
  });

  it("overlay click handler is a no-op (does not navigate)", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Calling the overlay click handler should do nothing
    const handler = lastDriverConfig.overlayClickBehavior as () => void;
    handler();

    // Navigate should NOT have been called
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not replace the live lifecycle payload with mock tour data", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const originalLifecycle = {
      phase: "ready" as const,
      payload: mockBootstrap,
    };
    useAppStore.setState({ lifecycle: originalLifecycle });

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(() => {
      const state = useAppStore.getState();
      expect(state.lifecycle).toEqual(originalLifecycle);
    });
  });

  it("has 7 steps covering all pages", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    const steps = lastDriverConfig.steps as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(7);
  });

  it("persists onboarding completion to app preferences when the final step continues", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    const onNextClick = lastDriverConfig.onNextClick as (
      element?: Element,
      step?: unknown,
      context?: { state: { activeIndex: number } },
    ) => void;
    onNextClick(undefined, undefined, { state: { activeIndex: 6 } });

    await vi.waitFor(() => {
      expect(tauriModule.saveAppPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ onboardingCompleted: true }),
      );
    });
    expect(mockDestroy).toHaveBeenCalled();
    expect(useAppStore.getState().onboardingCompleted).toBe(true);
  });

  it("restarts the tour cleanly when moving across pages", async () => {
    const { OnboardingFlow } = await import("@/core/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const connectionSection = document.createElement("div");
    connectionSection.setAttribute("data-onboarding", "connection-section");
    document.body.appendChild(connectionSection);

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );

    const firstDriverConfig = lastDriverConfig;
    const onNextClick = firstDriverConfig.onNextClick as (
      element?: Element,
      step?: unknown,
      context?: { state: { activeIndex: number } },
    ) => void;

    onNextClick(undefined, undefined, { state: { activeIndex: 4 } });

    expect(navigate).toHaveBeenCalledWith("/settings");
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockMoveNext).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(mockDrive).toHaveBeenCalledTimes(2);
    });

    expect(mockDrive).toHaveBeenNthCalledWith(2, 5);
  });
});
