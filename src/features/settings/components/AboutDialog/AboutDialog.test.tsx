import { render, screen } from "@testing-library/react";
import { AboutDialog } from "@/features/settings/components/AboutDialog/AboutDialog";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.0-beta.5",
    prereleaseLabel: "0.1.0-beta.5",
  },
}));

describe("AboutDialog", () => {
  it("renders when open", () => {
    render(<AboutDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText("about.title")).toBeInTheDocument();
    expect(screen.getByText("app.name")).toBeInTheDocument();
  });

  it("shows version from buildInfo", () => {
    render(<AboutDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/0\.1\.0-beta\.5/)).toBeInTheDocument();
  });
});
