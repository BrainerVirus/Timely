import { renderHook } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { useNormalizedSnapshotError } from "@/features/worklog/hooks/use-normalized-snapshot-error/use-normalized-snapshot-error";

describe("useNormalizedSnapshotError", () => {
  it("returns null when rawErrorMessage is null", () => {
    const { result } = renderHook(() => useNormalizedSnapshotError(null), {
      wrapper: I18nProvider,
    });
    expect(result.current).toBeNull();
  });

  it("returns null when rawErrorMessage is empty string", () => {
    const { result } = renderHook(() => useNormalizedSnapshotError(""), { wrapper: I18nProvider });
    expect(result.current).toBeNull();
  });

  it("returns translated message for GitLab connection required error", () => {
    const { result } = renderHook(
      () => useNormalizedSnapshotError("No primary GitLab connection found."),
      { wrapper: I18nProvider },
    );
    expect(result.current).not.toBe("No primary GitLab connection found.");
    expect(typeof result.current).toBe("string");
  });

  it("returns raw message for other errors", () => {
    const { result } = renderHook(() => useNormalizedSnapshotError("Network timeout"), {
      wrapper: I18nProvider,
    });
    expect(result.current).toBe("Network timeout");
  });
});
