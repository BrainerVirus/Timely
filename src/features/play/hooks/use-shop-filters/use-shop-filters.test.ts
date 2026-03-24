import { act, renderHook } from "@testing-library/react";
import { useShopFilters } from "@/features/play/hooks/use-shop-filters/use-shop-filters";

const catalog = [
  { rewardKey: "a", rewardName: "A", accessorySlot: "companion", featured: true },
  { rewardKey: "b", rewardName: "B", accessorySlot: "environment" },
  { rewardKey: "c", rewardName: "C", accessorySlot: "hat", owned: true },
  { rewardKey: "d", rewardName: "D", accessorySlot: "hat", unlocked: false },
  { rewardKey: "e", rewardName: "E", accessorySlot: "companion", themeTag: "recovery" },
];

describe("useShopFilters", () => {
  it("returns default primaryTab all and secondaryFilter all", () => {
    const { result } = renderHook(() => useShopFilters(catalog));
    expect(result.current.primaryTab).toBe("all");
    expect(result.current.secondaryFilter).toBe("all");
  });

  it("filters by primaryTab companions", () => {
    const { result } = renderHook(() => useShopFilters(catalog));
    act(() => result.current.handleTabChange("companions"));
    expect(result.current.primaryTab).toBe("companions");
    expect(result.current.filteredRewards).toHaveLength(2);
  });

  it("filters by secondaryFilter owned", () => {
    const { result } = renderHook(() => useShopFilters(catalog));
    act(() => result.current.handleFilterChange("owned"));
    expect(result.current.secondaryFilter).toBe("owned");
    expect(result.current.filteredRewards).toHaveLength(1);
  });

  it("handlePageNext increments page", () => {
    const { result } = renderHook(() => useShopFilters(catalog));
    expect(result.current.safePage).toBe(1);
    act(() => result.current.handlePageNext());
    expect(result.current.safePage).toBe(1);
  });

  it("availableSecondaryFilters for companions is limited", () => {
    const { result } = renderHook(() => useShopFilters(catalog));
    act(() => result.current.handleTabChange("companions"));
    expect(result.current.availableSecondaryFilters).toEqual(["all", "owned", "locked"]);
  });
});
