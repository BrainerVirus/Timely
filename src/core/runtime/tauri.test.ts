import * as tauriModule from "@/core/runtime/tauri";

describe("optional desktop helpers", () => {
  it("throws for sync progress outside Tauri", async () => {
    await expect(tauriModule.listenSyncProgress(() => {})).rejects.toThrow(
      /Tauri runtime required for sync progress events/i,
    );
  });

  it("throws for desktop event listeners outside Tauri", async () => {
    await expect(tauriModule.listenDesktopEvent("open-settings", () => {})).rejects.toThrow(
      /Tauri runtime required for desktop event: open-settings/i,
    );
  });

  it("throws for OAuth callback listeners outside Tauri", async () => {
    await expect(
      tauriModule.listenForGitLabOAuthCallback(
        () => {},
        () => {},
      ),
    ).rejects.toThrow(/Tauri runtime required for GitLab OAuth callback events/i);
  });

  it("keeps non-critical window helpers best effort outside Tauri", async () => {
    await expect(tauriModule.openSettingsWindow()).resolves.toBeUndefined();
    await expect(tauriModule.openAboutWindow()).resolves.toBeUndefined();
    await expect(tauriModule.quitApp()).resolves.toBeUndefined();
    await expect(tauriModule.updateTrayIcon(3, 8)).resolves.toBeUndefined();
  });
});
