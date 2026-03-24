import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/shared/components/Tooltip/Tooltip";
import { NavRail } from "@/layout/MainLayout/components/NavRail/NavRail";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: { playEnabled: true },
}));

describe("NavRail", () => {
  it("renders nav items", () => {
    render(
      <TooltipProvider>
        <NavRail
          currentPath="/"
          syncStatus="fresh"
          onNavigate={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByLabelText("common.home")).toBeInTheDocument();
    expect(screen.getByLabelText("common.worklog")).toBeInTheDocument();
  });
});
