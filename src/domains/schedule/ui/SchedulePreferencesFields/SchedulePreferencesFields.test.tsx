import { fireEvent, render, screen } from "@testing-library/react";
import { SchedulePreferencesFields } from "@/domains/schedule/ui/SchedulePreferencesFields/SchedulePreferencesFields";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "settings.timezone": "Timezone",
          "common.searchTimezone": "Search timezone",
          "common.noResults": "No results",
          "settings.firstDayOfWeek": "First day of week",
          "common.auto": "Auto (System)",
          "settings.timeFormat": "Time format",
          "settings.hoursAndMinutes": "Hours & minutes",
          "settings.decimal": "Decimal",
          "settings.durationHint": "Duration hint",
        }) as Record<string, string>
      )[key] ?? key,
    formatWeekdayFromCode: (code: string) => code,
  }),
}));

vi.mock("@/shared/ui/SearchCombobox/SearchCombobox", () => ({
  SearchCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("UTC")}>
      {value}
    </button>
  ),
}));

describe("SchedulePreferencesFields", () => {
  const defaultProps = {
    timezone: "America/Santiago",
    timezoneOptions: [{ value: "America/Santiago", label: "America/Santiago", badge: "America" }],
    weekStart: "auto" as const,
    timeFormat: "hm" as const,
    onSetTimezone: vi.fn(),
    onSetWeekStart: vi.fn(),
    onChangeTimeFormat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders labels and forwards actions", () => {
    render(<SchedulePreferencesFields {...defaultProps} />);

    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.getByText("First day of week")).toBeInTheDocument();
    expect(screen.getByText("Time format")).toBeInTheDocument();
    expect(screen.getByText("Duration hint")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "America/Santiago" }));
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Decimal" }));

    expect(defaultProps.onSetTimezone).toHaveBeenCalledWith("UTC");
    expect(defaultProps.onSetWeekStart).toHaveBeenCalledWith("monday");
    expect(defaultProps.onChangeTimeFormat).toHaveBeenCalledWith("decimal");
  });
});
