import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
}));

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
}));

describe("tray-entrypoint", () => {
  it("module loads without error", { timeout: 15000 }, async () => {
    await expect(import("@/entry/tray-entrypoint/tray-entrypoint")).resolves.toBeDefined();
  });
});
