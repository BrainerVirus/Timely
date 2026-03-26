import { render, screen } from "@testing-library/react";
import { TrayEntry } from "@/core/layout/TrayLayout/TrayLayout";
import { I18nProvider } from "@/core/services/I18nService/i18n";

vi.mock("@/core/services/TauriService/tauri", () => ({
  loadBootstrapPayload: vi.fn(() => new Promise(() => {})),
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
  listenAppPreferencesChanged: vi.fn(async () => () => {}),
}));

vi.mock("@/core/services/PreferencesCache/preferences-cache", () => ({
  getAppPreferencesCached: vi.fn(() =>
    Promise.resolve({ themeMode: "system", motionPreference: "system" }),
  ),
}));

vi.mock("@/features/tray/components/TrayPanel/TrayPanel", () => ({
  TrayPanel: () => <div data-testid="tray-panel">Tray</div>,
}));

describe("TrayLayout", () => {
  it("renders TrayEntry loading state while bootstrap is pending", async () => {
    render(
      <I18nProvider>
        <TrayEntry />
      </I18nProvider>,
    );

    expect(await screen.findByText(/loading tray/i)).toBeInTheDocument();
  });
});
