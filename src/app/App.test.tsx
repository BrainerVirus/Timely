import { act, render, screen, waitFor } from "@testing-library/react";
import App from "@/app/App";
import { useAppStore } from "@/stores/app-store";

// Mock driver.js so the tour doesn't try to manipulate DOM
const mockDrive = vi.fn();
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
    resetAllData: vi.fn(async () => {}),
  };
});

beforeEach(() => {
  localStorage.clear();
  mockDrive.mockClear();
  // Reset Zustand store to initial state between tests
  useAppStore.setState({
    lifecycle: { phase: "loading" },
    connections: [],
    syncState: { status: "idle", log: [] },
  });
});

describe("App", () => {
  it("renders the dashboard shell with empty payload", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });
  });

  it("shows zero logged hours on fresh start (no seed data)", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });

    // The mock payload has 0 hours — should not show fake data like 38.7h
    expect(screen.queryByText(/38\.7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Captain Crisp/)).not.toBeInTheDocument();
  });

  it("shows demoMode badge on fresh start", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Demo")).toBeInTheDocument();
    });
  });

  it("does NOT auto-redirect to settings when onboarding should show", async () => {
    // Fresh start: connections=[], demoMode=true, onboarding not complete
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });

    // Today nav item should be active (not redirected to Settings)
    const todayButton = screen.getByRole("button", { name: "Today" });
    expect(todayButton).toBeInTheDocument();

    // Settings page content should NOT be visible (we're on Today)
    expect(screen.queryByText("Sync GitLab Data")).not.toBeInTheDocument();
  });

  it("launches the onboarding tour on fresh start", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });

    // The OnboardingFlow component has an 800ms delay
    await vi.waitFor(
      () => {
        expect(mockDrive).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it("does NOT launch onboarding when already completed", async () => {
    localStorage.setItem("pulseboard-onboarding:v2", "true");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });

    // Wait past the timeout to ensure it doesn't fire
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });
    expect(mockDrive).not.toHaveBeenCalled();
  });
});
