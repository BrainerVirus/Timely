import { render, screen } from "@testing-library/react";
import {
  PaginationRow,
  PlaySectionPage,
  RecommendedMissionCard,
} from "@/features/play/ui/PlayRouteScaffold/PlayRouteScaffold";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

describe("PlayRouteScaffold", () => {
  it("renders a section heading", () => {
    render(
      <PlaySectionPage title="Overview" description="Summary">
        <div>content</div>
      </PlaySectionPage>,
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders pagination and quest summaries", () => {
    render(
      <div>
        <PaginationRow currentPage={1} totalPages={2} onPrevious={vi.fn()} onNext={vi.fn()} />
        <RecommendedMissionCard
          quest={{
            questKey: "quest",
            title: "Quest",
            description: "Do the thing",
            rewardLabel: "Reward",
            progressValue: 1,
            targetValue: 3,
            isClaimed: false,
            isActive: true,
            category: "focus",
            cadence: "daily",
          }}
        />
      </div>,
    );

    expect(screen.getByText("play.pageLabel")).toBeInTheDocument();
    expect(screen.getByText("Quest")).toBeInTheDocument();
  });
});
