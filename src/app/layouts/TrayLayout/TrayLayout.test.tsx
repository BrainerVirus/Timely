import { render, screen, waitFor } from "@testing-library/react";
import { TrayEntry } from "@/app/layouts/TrayLayout/TrayLayout";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { BootstrapPayload } from "@/shared/types/dashboard";

let capturedActivation: ((callback: (payload: BootstrapPayload) => void) => () => void) | undefined;
let emitTrayActivation: (() => void) | undefined;

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

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: vi.fn(async (_event: string, callback: () => void) => {
      emitTrayActivation = callback;
      return vi.fn();
    }),
  }),
}));

vi.mock("@/features/tray/ui/TrayPanel/TrayPanel", () => ({
  TrayPanel: ({
    payload,
    onActivated,
  }: {
    payload: BootstrapPayload;
    onActivated: (callback: (payload: BootstrapPayload) => void) => () => void;
  }) => {
    capturedActivation = onActivated;
    return <div data-testid="tray-panel">{payload.today.date}</div>;
  },
}));

describe("TrayLayout", () => {
  beforeEach(() => {
    capturedActivation = undefined;
    emitTrayActivation = undefined;
    vi.mocked(tauriModule.loadBootstrapPayload).mockReset();
  });

  it("reloads a fresh bootstrap payload before notifying tray activation", async () => {
    const initialPayload = {
      ...mockBootstrap,
      today: { ...mockBootstrap.today, date: "2026-03-07" },
    };
    const freshPayload = {
      ...mockBootstrap,
      today: { ...mockBootstrap.today, date: "2026-03-08" },
    };
    const callback = vi.fn();

    vi.mocked(tauriModule.loadBootstrapPayload)
      .mockResolvedValueOnce(initialPayload)
      .mockResolvedValueOnce(freshPayload);

    render(
      <I18nProvider>
        <TrayEntry />
      </I18nProvider>,
    );

    expect(await screen.findByText("2026-03-07")).toBeInTheDocument();

    const unsubscribe = capturedActivation?.(callback);
    await waitFor(() => {
      expect(emitTrayActivation).toBeDefined();
    });
    emitTrayActivation?.();

    await screen.findByText("2026-03-08");

    expect(tauriModule.loadBootstrapPayload).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(freshPayload);

    unsubscribe?.();
  });

  it("renders TrayEntry loading state while bootstrap is pending", async () => {
    vi.mocked(tauriModule.loadBootstrapPayload).mockReturnValue(new Promise(() => {}));

    render(
      <I18nProvider>
        <TrayEntry />
      </I18nProvider>,
    );

    expect(await screen.findByText(/loading tray/i)).toBeInTheDocument();
  });
});
