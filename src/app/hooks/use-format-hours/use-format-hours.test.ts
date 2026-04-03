import { renderHook } from "@testing-library/react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { useAppStore } from "@/app/state/AppStore/app-store";

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(),
}));

describe("useFormatHours", () => {
  it("returns a formatter that formats hours", () => {
    vi.mocked(useAppStore).mockReturnValue("hm" as never);
    const { result } = renderHook(() => useFormatHours(), {
      wrapper: I18nProvider,
    });
    const formatter = result.current;
    expect(formatter(2.5)).toBeTruthy();
    expect(typeof formatter(2.5)).toBe("string");
  });

  it("returns a stable callback reference across renders when deps unchanged", () => {
    vi.mocked(useAppStore).mockReturnValue("hm" as never);
    const { result, rerender } = renderHook(() => useFormatHours(), {
      wrapper: I18nProvider,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
