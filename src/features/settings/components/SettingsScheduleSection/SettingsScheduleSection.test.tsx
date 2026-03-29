import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsScheduleSection } from "@/features/settings/components/SettingsScheduleSection/SettingsScheduleSection";

import type { SettingsScheduleSectionProps } from "@/features/settings/components/SettingsScheduleSection/SettingsScheduleSection";
import type { ReactNode } from "react";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "settings.schedule": "Schedule",
          "settings.scheduleByDay": "Schedule by day",
          "settings.timezone": "Timezone",
          "common.searchTimezone": "Search timezone",
          "common.noResults": "No results",
          "settings.firstDayOfWeek": "First day of week",
          "common.auto": "Auto",
          "settings.timeFormat": "Time format",
          "settings.hoursAndMinutes": "Hours and minutes",
          "settings.decimal": "Decimal",
          "settings.durationHint": "Choose how durations appear.",
        }) as Record<string, string>
      )[key] ?? key,
    formatWeekdayFromCode: (code: string) =>
      (
        ({
          Sun: "Sunday",
          Mon: "Monday",
          Fri: "Friday",
          Sat: "Saturday",
        }) as Record<string, string>
      )[code] ?? code,
  }),
}));

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: () => ({ allowDecorativeAnimation: false }),
}));

vi.mock("@/shared/components/Accordion/Accordion", () => ({
  AccordionItem: ({
    title,
    summary,
    children,
  }: {
    title: string;
    summary?: string;
    children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {summary ? <p>{summary}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock("@/shared/components/SearchCombobox/SearchCombobox", () => ({
  SearchCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("UTC")}>
      {value}
    </button>
  ),
}));

vi.mock("@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton", () => ({
  ScheduleSaveButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Save schedule
    </button>
  ),
}));

vi.mock("@/features/settings/components/WeekdayScheduleEditor/WeekdayScheduleEditor", () => ({
  WeekdayScheduleEditor: ({ layout }: { layout?: "inline" | "stacked" }) => (
    <div data-testid="weekday-schedule-editor">{layout}</div>
  ),
}));

const defaultProps: SettingsScheduleSectionProps = {
  scheduleSummary: "Mon-Thu 8.8h/day, Fri 7.8h/day",
  weekdaySchedules: [],
  timezone: "America/Santiago",
  timezoneOptions: [{ value: "America/Santiago", label: "America/Santiago", badge: "America" }],
  weekStart: "monday",
  orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  schedulePhase: "idle",
  timeFormat: "hm",
  onSetTimezone: vi.fn(),
  onSetWeekStart: vi.fn(),
  onSetWeekdayEnabled: vi.fn(),
  onSetWeekdayField: vi.fn(),
  onCopyWeekdaySchedule: vi.fn(),
  onChangeTimeFormat: vi.fn(),
  onSaveSchedule: vi.fn(),
};

describe("SettingsScheduleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the schedule summary and the inline weekday editor", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Mon-Thu 8.8h/day, Fri 7.8h/day")).toBeInTheDocument();
    expect(screen.getByTestId("weekday-schedule-editor")).toHaveTextContent("inline");
  });

  it("forwards timezone, week start, and time format changes", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "America/Santiago" }));
    fireEvent.click(screen.getByRole("button", { name: "Monday" }));
    fireEvent.click(screen.getByRole("button", { name: "Decimal" }));

    expect(defaultProps.onSetTimezone).toHaveBeenCalledWith("UTC");
    expect(defaultProps.onSetWeekStart).toHaveBeenCalledWith("monday");
    expect(defaultProps.onChangeTimeFormat).toHaveBeenCalledWith("decimal");
  });

  it("renders the schedule save action when a save handler is available", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(defaultProps.onSaveSchedule).toHaveBeenCalledTimes(1);
  });
});
