import { clearOnboardingState, isOnboardingComplete } from "@/features/onboarding/onboarding-flow";
import { buildInfo } from "@/lib/build-info";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/lib/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.1",
    isPrerelease: true,
    playEnabled: true,
    onboardingTourEnabled: true,
    prereleaseLabel: "0.1.0-beta.1",
  },
}));

// Mock driver.js — capture the config passed to driver() and verify lockdown settings
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
let lastDriverConfig: Record<string, unknown> = {};

vi.mock("driver.js", () => ({
  driver: vi.fn((config: Record<string, unknown>) => {
    lastDriverConfig = config;
    return {
      drive: mockDrive,
      destroy: mockDestroy,
      getConfig: () => config,
    };
  }),
}));

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    listGitLabConnections: vi.fn(async () => []),
  };
});

beforeEach(() => {
  localStorage.clear();
  mockDrive.mockClear();
  mockDestroy.mockClear();
  lastDriverConfig = {};
  buildInfo.onboardingTourEnabled = true;
  // Reset store with a minimal payload so the tour has something to save/restore
  useAppStore.setState({
    lifecycle: { phase: "loading" },
    connections: [],
    syncState: { status: "idle", log: [] },
  });
});

describe("isOnboardingComplete", () => {
  it("returns false when localStorage is empty", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("returns true when localStorage has the key set to 'true'", () => {
    localStorage.setItem("timely-onboarding:core-no-play:v1", "true");
    expect(isOnboardingComplete()).toBe(true);
  });

  it("returns false for non-'true' values", () => {
    localStorage.setItem("timely-onboarding:core-no-play:v1", "false");
    expect(isOnboardingComplete()).toBe(false);
  });

  it("does not treat legacy keys as completion for the new no-play tour", () => {
    localStorage.setItem("timely-onboarding-complete", "true");
    localStorage.setItem("timely-onboarding:v2", "true");
    expect(isOnboardingComplete()).toBe(false);
  });
});

describe("clearOnboardingState", () => {
  it("removes current and legacy onboarding keys from localStorage", () => {
    localStorage.setItem("timely-onboarding:core-no-play:v1", "true");
    localStorage.setItem("timely-onboarding:v2", "true");
    localStorage.setItem("timely-onboarding-complete", "true");
    expect(isOnboardingComplete()).toBe(true);

    clearOnboardingState();
    expect(isOnboardingComplete()).toBe(false);
    expect(localStorage.getItem("timely-onboarding:v2")).toBeNull();
    expect(localStorage.getItem("timely-onboarding-complete")).toBeNull();
  });
});

describe("OnboardingFlow", () => {
  it("calls driver().drive() when onboarding is not complete", async () => {
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
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
    localStorage.setItem("timely-onboarding:core-no-play:v1", "true");

    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await new Promise((r) => setTimeout(r, 1200));
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("does NOT call driver().drive() when the onboarding feature flag is disabled", async () => {
    buildInfo.onboardingTourEnabled = false;

    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    await new Promise((r) => setTimeout(r, 1200));
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("works correctly across React StrictMode double-mount", async () => {
    const React = await import("react");
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
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
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
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
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
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

  it("injects tour mock data into the Zustand store", async () => {
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
    const { tourPayload } = await import("@/features/onboarding/tour-mock-data");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigate={navigate} />);

    // The tour injects mock data immediately on mount
    await vi.waitFor(() => {
      const state = useAppStore.getState();
      expect(state.lifecycle).toEqual({ phase: "ready", payload: tourPayload });
    });
  });

  it("has 7 steps covering all pages", async () => {
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
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
});
