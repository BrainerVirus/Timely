import { render, screen } from "@testing-library/react";
import { SingleDayPicker } from "@/shared/ui/SingleDayPicker/SingleDayPicker";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

describe("SingleDayPicker", () => {
  it("renders trigger when closed", () => {
    render(
      <SingleDayPicker
        open={false}
        onOpenChange={vi.fn()}
        selectedDate={new Date(2026, 2, 5)}
        visibleMonth={new Date(2026, 2, 1)}
        onSelectDate={vi.fn()}
        onVisibleMonthChange={vi.fn()}
        buttonLabel="Pick day"
        holidays={[]}
        weekStartsOn={1}
      />,
    );
    expect(screen.getByRole("button", { name: "Pick day" })).toBeInTheDocument();
  });
});
