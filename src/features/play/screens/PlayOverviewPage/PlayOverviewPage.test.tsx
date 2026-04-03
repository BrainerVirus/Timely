import { render, screen } from "@testing-library/react";
import { PlayOverviewPage } from "@/features/play/screens/PlayOverviewPage/PlayOverviewPage";

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

describe("PlayOverviewPage", () => {
  it("shows the loading state", () => {
    render(<PlayOverviewPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
