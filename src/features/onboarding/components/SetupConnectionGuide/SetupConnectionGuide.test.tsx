import { render } from "@testing-library/react";
import { SetupConnectionGuide } from "@/features/onboarding/components/SetupConnectionGuide/SetupConnectionGuide";
import { I18nProvider } from "@/core/services/I18nService/i18n";

const mockDrive = vi.fn();
let lastDriverConfig: Record<string, unknown> = {};

vi.mock("driver.js", () => ({
  driver: vi.fn((config: Record<string, unknown>) => {
    lastDriverConfig = config;
    return {
      drive: mockDrive,
      moveNext: vi.fn(),
      movePrevious: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

describe("SetupConnectionGuide", () => {
  beforeEach(() => {
    mockDrive.mockClear();
    lastDriverConfig = {};
    document.body.innerHTML = `
      <div data-onboarding="connection-section"></div>
      <button data-onboarding="gitlab-pat-tab"></button>
      <button data-onboarding="gitlab-oauth-tab"></button>
      <button data-onboarding="gitlab-pat-link"></button>
      <button data-onboarding="gitlab-oauth-link"></button>
      <button data-onboarding="sync-button"></button>
    `;
  });

  it("starts the connection guide when active", async () => {
    render(
      <I18nProvider>
        <SetupConnectionGuide active={true} onFinish={() => {}} />
      </I18nProvider>,
    );

    await vi.waitFor(() => {
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    expect(lastDriverConfig.allowClose).toBe(false);
    expect(lastDriverConfig.showProgress).toBe(true);
    expect(lastDriverConfig.showButtons).toEqual(["next", "previous", "close"]);
    expect((lastDriverConfig.steps as unknown[]).length).toBe(6);
  });
});
