import { render } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { StreakDisplay } from "@/features/play/ui/StreakDisplay/StreakDisplay";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
  })),
}));

describe("StreakDisplay", () => {
  it("renders with streak days", () => {
    const { container } = render(
      <I18nProvider>
        <StreakDisplay streakDays={5} />
      </I18nProvider>,
    );
    expect(container.textContent).toContain("5");
  });

  it("renders in compact mode", () => {
    const { container } = render(
      <I18nProvider>
        <StreakDisplay streakDays={3} compact />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
