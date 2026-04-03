import { render, screen } from "@testing-library/react";
import { PlayShopPage } from "@/features/play/screens/PlayShopPage/PlayShopPage";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: true })),
}));

vi.mock("@/features/play/screens/PlayLayout/PlayLayout", () => ({
  usePlayContext: () => ({
    snapshot: null,
    loading: true,
    error: null,
    clearPreviewKeysNotIn: vi.fn(),
  }),
}));

vi.mock("@/features/play/hooks/use-shop-filters/use-shop-filters", () => ({
  useShopFilters: vi.fn(() => ({
    primaryTab: "all",
    secondaryFilter: "all",
    availableSecondaryFilters: ["all"],
    filteredRewards: [],
    pagedRewards: [],
    totalPages: 1,
    safePage: 1,
    handleTabChange: vi.fn(),
    handleFilterChange: vi.fn(),
    handlePagePrevious: vi.fn(),
    handlePageNext: vi.fn(),
  })),
}));

describe("PlayShopPage", () => {
  it("shows the loading state", () => {
    render(<PlayShopPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
