import { render, screen } from "@testing-library/react";
import { TrayEntry } from "@/app/layouts/TrayLayout/TrayLayout";
import { I18nProvider } from "@/app/providers/I18nService/i18n";

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  loadBootstrapPayload: vi.fn(() => new Promise(() => {})),
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
  listenAppPreferencesChanged: vi.fn(async () => () => {}),
}));

vi.mock("@/app/bootstrap/PreferencesCache/preferences-cache", () => ({
  getAppPreferencesCached: vi.fn(() =>
    Promise.resolve({ themeMode: "system", motionPreference: "system" }),
  ),
}));

vi.mock("@/features/tray/ui/TrayPanel/TrayPanel", () => ({
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
