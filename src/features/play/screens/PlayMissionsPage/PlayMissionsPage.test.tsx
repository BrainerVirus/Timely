import { render, screen } from "@testing-library/react";
import { PlayMissionsPage } from "@/features/play/screens/PlayMissionsPage/PlayMissionsPage";

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

describe("PlayMissionsPage", () => {
  it("shows the loading state", () => {
    render(<PlayMissionsPage />);
    expect(screen.getByText("app.loadingPlayCenter")).toBeInTheDocument();
  });
});
