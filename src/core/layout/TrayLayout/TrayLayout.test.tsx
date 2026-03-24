import { render, screen } from "@testing-library/react";
import { TrayEntry } from "@/core/layout/TrayLayout/TrayLayout";

vi.mock("@/core/services/TauriService/tauri", () => ({
  loadBootstrapPayload: vi.fn(() => new Promise(() => {})),
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/core/services/PreferencesCache/preferences-cache", () => ({
  getAppPreferencesCached: vi.fn(() => Promise.resolve({ themeMode: "system", motionPreference: "system" })),
}));

vi.mock("@/features/tray/components/TrayPanel/TrayPanel", () => ({
  TrayPanel: () => <div data-testid="tray-panel">Tray</div>,
}));

describe("TrayLayout", () => {
  it("renders TrayEntry loading state while bootstrap is pending", () => {
    render(<TrayEntry />);
    expect(screen.getByText(/loading tray status/i)).toBeInTheDocument();
  });
});
