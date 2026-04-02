import { renderHook } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { useSnapshotErrorToast } from "@/features/worklog/hooks/use-snapshot-error-toast/use-snapshot-error-toast";

const mockToastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
}));

describe("useSnapshotErrorToast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call toast when status is not error", () => {
    renderHook(
      () =>
        useSnapshotErrorToast({
          status: "idle",
          requestKey: "k1",
          normalizedError: "err",
          displayMode: "day",
        }),
      { wrapper: I18nProvider },
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("does not call toast when normalizedError is null", () => {
    renderHook(
      () =>
        useSnapshotErrorToast({
          status: "error",
          requestKey: "k1",
          normalizedError: null,
          displayMode: "day",
        }),
      { wrapper: I18nProvider },
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("calls toast.error for day mode with error status", () => {
    renderHook(
      () =>
        useSnapshotErrorToast({
          status: "error",
          requestKey: "req1",
          normalizedError: "Connection failed",
          displayMode: "day",
        }),
      { wrapper: I18nProvider },
    );
    expect(mockToastError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: "Connection failed",
        duration: 7000,
      }),
    );
  });

  it("skips first error for week mode", () => {
    renderHook(
      () =>
        useSnapshotErrorToast({
          status: "error",
          requestKey: "req1",
          normalizedError: "err",
          displayMode: "week",
        }),
      { wrapper: I18nProvider },
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
