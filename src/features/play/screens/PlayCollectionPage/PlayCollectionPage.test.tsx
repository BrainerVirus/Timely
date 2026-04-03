import { render, screen } from "@testing-library/react";
import { PlayCollectionPage } from "@/features/play/screens/PlayCollectionPage/PlayCollectionPage";

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

describe("PlayCollectionPage", () => {
  it("shows the loading state", () => {
    render(<PlayCollectionPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
