import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import App, { router } from "@/app/App";
import { useAppStore } from "@/stores/app-store";
import * as tauriModule from "@/lib/tauri";

import type { SetupState } from "@/types/dashboard";

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
    loadSetupState: vi.fn(),
  };
});

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

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  mockDrive.mockClear();
  vi.mocked(tauriModule.loadSetupState).mockReset().mockResolvedValue(COMPLETE_SETUP);
  vi.mocked(tauriModule.listGitLabConnections).mockReset().mockResolvedValue([]);
  // Reset router to "/" so each test starts at the home route
  router.navigate({ to: "/" });
  useAppStore.setState({
    lifecycle: { phase: "loading" },
    connections: [],
    syncState: { status: "idle", log: [] },
    setupState: COMPLETE_SETUP,
  });
});

describe("App", () => {
  it("renders the dashboard shell with NavRail and TopBar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Worklog" })).toBeInTheDocument();
  });

  it("shows zero logged hours on fresh start (no seed data)", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(screen.queryByText(/38\.7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Captain Crisp/)).not.toBeInTheDocument();
  });

  it("redirects to setup wizard when setup is incomplete", async () => {
    vi.mocked(tauriModule.loadSetupState).mockResolvedValue(INCOMPLETE_SETUP);
    useAppStore.setState({ setupState: INCOMPLETE_SETUP });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Welcome to Pulseboard")).toBeInTheDocument();
    });
  });

  it("shows the dashboard when setup is complete", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    expect(mockDrive).not.toHaveBeenCalled();
  });

  it("does NOT launch onboarding when already completed", async () => {
    localStorage.setItem("pulseboard-onboarding:v2", "true");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });
    expect(mockDrive).not.toHaveBeenCalled();
  });
});
