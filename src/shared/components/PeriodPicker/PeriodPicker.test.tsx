import { render, screen } from "@testing-library/react";
import { PeriodPicker } from "@/shared/components/PeriodPicker/PeriodPicker";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

describe("PeriodPicker", () => {
  it("renders trigger button when closed", () => {
    render(
      <PeriodPicker
        open={false}
        onOpenChange={vi.fn()}
        range={{ from: new Date(2026, 2, 1), to: new Date(2026, 2, 31) }}
        draftRange={undefined}
        visibleMonth={new Date(2026, 2, 1)}
        onDraftRangeChange={vi.fn()}
        onVisibleMonthChange={vi.fn()}
        onSelectRange={vi.fn()}
        holidays={[]}
        weekStartsOn={1}
      />,
    );
    expect(screen.getByRole("button", { name: "common.pickPeriod" })).toBeInTheDocument();
  });
});
