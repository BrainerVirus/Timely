import { render, screen } from "@testing-library/react";
import {
  PlayOverviewPage,
  PlayShopPage,
  PlayMissionsPage,
  PlayAchievementsPage,
} from "@/features/play/screens/PlayRoutePages/PlayRoutePages";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

const mockPlayContext = {
  snapshot: null,
  loading: true,
  error: null,
  foxMood: "idle" as const,
  spotlightCompanion: {
    companionVariant: "aurora" as const,
    rewardKey: "aurora",
    rewardName: "Aurora",
  },
  activeEnvironmentReward: undefined,
  activeHabitatScene: "aurora",
  previewAccessories: [],
  previewRewardKeys: [],
  hasActivePreview: false,
  clearPreviewKeysNotIn: vi.fn(),
};

vi.mock("@/features/play/screens/PlayLayout/PlayLayout", () => ({
  usePlayContext: () => mockPlayContext,
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

describe("PlayRoutePages", () => {
  it("PlayOverviewPage shows loading state", () => {
    render(<PlayOverviewPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });

  it("PlayShopPage shows loading state", () => {
    render(<PlayShopPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });

  it("PlayMissionsPage shows loading state", () => {
    render(<PlayMissionsPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });

  it("PlayAchievementsPage shows loading state", () => {
    render(<PlayAchievementsPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
