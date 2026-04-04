import { render } from "@testing-library/react";
import {
  SetupScheduleShellWidthSetterProvider,
  useSetupScheduleShellWidthSetter,
} from "@/app/layouts/SetupLayout/lib/setup-schedule-shell-width-context";

function HookWithoutProvider() {
  useSetupScheduleShellWidthSetter();
  return null;
}

describe("setup-schedule-shell-width-context", () => {
  it("throws when the setter hook is used outside the provider", () => {
    expect(() => render(<HookWithoutProvider />)).toThrow(/SetupScheduleShellWidthSetterProvider/);
  });

  it("returns the setter from context inside the provider", () => {
    const setWidth = vi.fn();

    function Consumer() {
      const set = useSetupScheduleShellWidthSetter();
      expect(set).toBe(setWidth);
      return null;
    }

    render(
      <SetupScheduleShellWidthSetterProvider value={setWidth}>
        <Consumer />
      </SetupScheduleShellWidthSetterProvider>,
    );
  });
});
