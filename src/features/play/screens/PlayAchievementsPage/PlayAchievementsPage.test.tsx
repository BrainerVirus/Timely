import { render, screen } from "@testing-library/react";
import { PlayAchievementsPage } from "@/features/play/screens/PlayAchievementsPage/PlayAchievementsPage";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/features/play/screens/PlayLayout/PlayLayout", () => ({
  usePlayContext: () => ({
    snapshot: null,
    loading: true,
    error: null,
  }),
}));

describe("PlayAchievementsPage", () => {
  it("shows the loading state", () => {
    render(<PlayAchievementsPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
