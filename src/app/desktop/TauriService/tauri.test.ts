import * as tauriModule from "@/app/desktop/TauriService/tauri";

const invokeMock = vi.hoisted(() => vi.fn());

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

describe("loadIssueDetails IPC", () => {
  beforeEach(() => {
    vi.resetModules();
    invokeMock.mockReset();
    vi.stubGlobal("__TAURI_INTERNALS__", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends load_issue_details args under input", async () => {
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: invokeMock,
    }));
    invokeMock.mockResolvedValue({
      kind: "full",
      snapshot: {
        reference: {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/1",
        },
        key: "g/p#1",
        title: "Issue 1",
        state: "opened",
        labels: [],
        activity: [],
        capabilities: {
          status: { enabled: false, options: [] },
          labels: { enabled: false, options: [] },
          iteration: { enabled: false, options: [] },
          milestone: { enabled: false, options: [] },
          composer: { enabled: true, modes: ["write", "preview"], supportsQuickActions: true },
          timeTracking: { enabled: true, supportsQuickActions: true },
        },
      },
    });

    const module = await import("@/app/desktop/TauriService/tauri");

    await module.loadIssueDetails("gitlab", "g/p#1", {
      ifNoneMatch: '"etag-1"',
    });

    expect(invokeMock).toHaveBeenCalledWith("load_issue_details", {
      input: {
        provider: "gitlab",
        issueId: "g/p#1",
        ifNoneMatch: '"etag-1"',
      },
    });
  });
});
