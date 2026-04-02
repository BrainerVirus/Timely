import { fireEvent, render, screen } from "@testing-library/react";
import { ReleaseHighlightsDialog } from "@/app/overlays/ReleaseHighlightsDialog/ReleaseHighlightsDialog";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/app/bootstrap/BuildInfo/build-info", () => ({
  buildInfo: { appVersion: "0.1.0-beta.5" },
}));

const mockContent = {
  title: "New release",
  badge: "What's new",
  intro: "Welcome to the new version.",
  bullets: ["Feature one", "Feature two"],
  accent: "Enjoy!",
};

describe("ReleaseHighlightsDialog", () => {
  it("renders content when open", () => {
    render(
      <ReleaseHighlightsDialog
        open
        content={mockContent}
        onOpenChange={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    );
    expect(screen.getByText("New release")).toBeInTheDocument();
    expect(screen.getByText("What's new")).toBeInTheDocument();
    expect(screen.getByText("Feature one")).toBeInTheDocument();
  });

  it("calls onAcknowledge when button clicked", () => {
    const onAcknowledge = vi.fn();
    render(
      <ReleaseHighlightsDialog
        open
        content={mockContent}
        onOpenChange={vi.fn()}
        onAcknowledge={onAcknowledge}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "releaseHighlights.gotIt" }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
