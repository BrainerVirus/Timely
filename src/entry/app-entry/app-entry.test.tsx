import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
}));

vi.mock("@/app/root/App/App", () => ({
  default: () => null,
}));

vi.mock("@/app/bootstrap/LoadFonts/load-fonts", () => ({
  loadCriticalStartupFonts: vi.fn(() => Promise.resolve()),
  loadDeferredAppFonts: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
  prewarmTrayWindow: vi.fn(() => Promise.resolve()),
}));

describe("app-entry", () => {
  it("module loads without error", { timeout: 15000 }, async () => {
    await expect(import("@/entry/app-entry/app-entry")).resolves.toBeDefined();
  });
});
