import { renderHook } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { useNotify } from "@/shared/hooks/use-notify/use-notify";

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

describe("useNotify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notify API with success, error, info, syncStart, syncComplete, syncFailed", () => {
    const { result } = renderHook(() => useNotify(), { wrapper: I18nProvider });
    expect(result.current).toHaveProperty("success");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("info");
    expect(result.current).toHaveProperty("syncStart");
    expect(result.current).toHaveProperty("syncComplete");
    expect(result.current).toHaveProperty("syncFailed");
  });

  it("success calls toast.success with title and description", () => {
    const { result } = renderHook(() => useNotify(), { wrapper: I18nProvider });
    result.current.success("Done", "All good");
    expect(mockToast.success).toHaveBeenCalledWith("Done", {
      description: "All good",
      duration: 4000,
    });
  });

  it("error calls toast.error with title and description", () => {
    const { result } = renderHook(() => useNotify(), { wrapper: I18nProvider });
    result.current.error("Oops", "Something failed");
    expect(mockToast.error).toHaveBeenCalledWith("Oops", {
      description: "Something failed",
      duration: 8000,
      action: undefined,
    });
  });

  it("syncStart returns toast.loading result", () => {
    mockToast.loading.mockReturnValue(123);
    const { result } = renderHook(() => useNotify(), { wrapper: I18nProvider });
    const id = result.current.syncStart();
    expect(mockToast.loading).toHaveBeenCalled();
    expect(id).toBe(123);
  });
});
