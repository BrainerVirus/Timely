import { renderHook } from "@testing-library/react";
import { usePlayProviderValue } from "@/features/play/hooks/play-provider-state/play-provider-state";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/features/play/services/play-snapshot-cache/play-snapshot-cache", () => ({
  getCachedPlaySnapshot: vi.fn(() => null),
  getCachedPlaySnapshotError: vi.fn(() => null),
  prefetchPlaySnapshot: vi.fn(() => Promise.resolve(null)),
  primePlaySnapshot: vi.fn(),
}));

vi.mock("@/core/services/TauriService/tauri", () => ({
  activateQuest: vi.fn(),
  claimQuestReward: vi.fn(),
  equipReward: vi.fn(),
  purchaseReward: vi.fn(),
  unequipReward: vi.fn(),
}));

vi.mock("@/core/services/Companion/companion", () => ({
  getFoxMoodForCompanionMood: vi.fn(() => "idle"),
}));

describe("play-provider-state", () => {
  const t = (key: string) => key;

  it("returns loading when snapshot is null", () => {
    const { result } = renderHook(() => usePlayProviderValue(mockBootstrap, t));
    expect(result.current.loading).toBe(true);
    expect(result.current.snapshot).toBeNull();
  });

  it("returns preview state structure", () => {
    const { result } = renderHook(() => usePlayProviderValue(mockBootstrap, t));
    expect(result.current.preview).toEqual({
      companionKey: null,
      environmentKey: null,
      accessories: {},
    });
    expect(typeof result.current.clearAllPreview).toBe("function");
    expect(typeof result.current.togglePreviewRewardKey).toBe("function");
  });

  it("exposes action handlers", () => {
    const { result } = renderHook(() => usePlayProviderValue(mockBootstrap, t));
    expect(typeof result.current.activateQuestKey).toBe("function");
    expect(typeof result.current.claimQuestKey).toBe("function");
    expect(typeof result.current.buyRewardKey).toBe("function");
    expect(typeof result.current.equipRewardKey).toBe("function");
    expect(typeof result.current.unequipRewardKey).toBe("function");
  });
});
