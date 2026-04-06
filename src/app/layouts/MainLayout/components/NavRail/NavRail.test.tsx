import { render, screen } from "@testing-library/react";
import { NavRail } from "@/app/layouts/MainLayout/components/NavRail/NavRail";
import { TooltipProvider } from "@/shared/ui/Tooltip/Tooltip";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/app/bootstrap/BuildInfo/build-info", () => ({
  buildInfo: { playEnabled: true },
}));

describe("NavRail", () => {
  it("renders nav items", () => {
    render(
      <TooltipProvider>
        <NavRail activePath="/" syncStatus="fresh" onNavigate={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByLabelText("common.home")).toBeInTheDocument();
    expect(screen.getByLabelText("common.worklog")).toBeInTheDocument();
  });
});
