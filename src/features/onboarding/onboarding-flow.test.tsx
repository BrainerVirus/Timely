import { clearOnboardingState, isOnboardingComplete } from "@/features/onboarding/onboarding-flow";

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
    };
  }),
}));

beforeEach(() => {
  localStorage.clear();
  mockDrive.mockClear();
  mockDestroy.mockClear();
  lastDriverConfig = {};
});

describe("isOnboardingComplete", () => {
  it("returns false when localStorage is empty", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("returns true when localStorage has the key set to 'true'", () => {
    localStorage.setItem("pulseboard-onboarding-complete", "true");
    expect(isOnboardingComplete()).toBe(true);
  });

  it("returns false for non-'true' values", () => {
    localStorage.setItem("pulseboard-onboarding-complete", "false");
    expect(isOnboardingComplete()).toBe(false);
  });
});

describe("clearOnboardingState", () => {
  it("removes the onboarding key from localStorage", () => {
    localStorage.setItem("pulseboard-onboarding-complete", "true");
    expect(isOnboardingComplete()).toBe(true);

    clearOnboardingState();
    expect(isOnboardingComplete()).toBe(false);
  });
});

describe("OnboardingFlow", () => {
  it("calls driver().drive() when onboarding is not complete", async () => {
    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigateSettings={navigate} />);

    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it("does NOT call driver().drive() when onboarding is already complete", async () => {
    localStorage.setItem("pulseboard-onboarding-complete", "true");

    const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
    const { render } = await import("@testing-library/react");

    const navigate = vi.fn();
    render(<OnboardingFlow onNavigateSettings={navigate} />);

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
        <OnboardingFlow onNavigateSettings={navigate} />
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
    render(<OnboardingFlow onNavigateSettings={navigate} />);

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
    render(<OnboardingFlow onNavigateSettings={navigate} />);

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
});
