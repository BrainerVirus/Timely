import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { HolidayListPanel } from "@/features/settings/ui/HolidayPreferencesPanel/internal/HolidayListPanel/HolidayListPanel";

describe("HolidayListPanel", () => {
  it("renders holidays and forwards holiday selection", () => {
    const onFocusHoliday = vi.fn();

    render(
      <I18nProvider>
        <HolidayListPanel
          currentHolidays={[{ date: "2026-01-01", name: "Año Nuevo" }]}
          currentYear={2026}
          formatMonthDayWeekday={(date) => date.toISOString().slice(0, 10)}
          isLoadingCurrentYear={false}
          onFocusHoliday={onFocusHoliday}
          onYearChange={vi.fn()}
          selectedDateKey={null}
          selectedYear={2026}
          t={(key, params) => (params?.year ? `${key}:${params.year}` : key)}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Año Nuevo/i }));
    expect(onFocusHoliday).toHaveBeenCalledWith({ date: "2026-01-01", name: "Año Nuevo" });
  });
});
