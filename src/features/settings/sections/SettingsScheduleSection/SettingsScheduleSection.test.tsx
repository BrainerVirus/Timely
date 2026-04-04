import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsScheduleSection } from "@/features/settings/sections/SettingsScheduleSection/SettingsScheduleSection";

import type { SettingsScheduleSectionProps } from "@/features/settings/sections/SettingsScheduleSection/SettingsScheduleSection";
import type { WeekdayCode } from "@/domains/schedule/state/schedule-form/schedule-form";
import type { ReactNode } from "react";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "settings.schedule": "Schedule",
          "settings.weeklySchedule": "Weekly schedule",
          "settings.weeklyScheduleDescription":
            "Set the normal hours for each day of your workweek.",
          "settings.schedulePreferences": "Schedule Preferences",
          "settings.schedulePreferencesHint":
            "Timezone and week settings work together with your weekly hours above.",
          "settings.timezone": "Timezone",
          "common.searchTimezone": "Search timezone",
          "common.noResults": "No results",
          "settings.firstDayOfWeek": "First day of week",
          "common.auto": "Auto (System)",
          "settings.timeFormat": "Time format",
          "settings.hoursAndMinutes": "Hours & minutes",
          "settings.decimal": "Decimal",
          "settings.durationHint": "Controls how durations are shown across the entire app.",
        }) as Record<string, string>
      )[key] ?? key,
    formatWeekdayFromCode: (code: string) =>
      (
        ({
          Mon: "Mon",
          Sun: "Sun",
          Fri: "Fri",
          Sat: "Sat",
        }) as Record<string, string>
      )[code] ?? code,
  }),
}));

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: () => ({ allowDecorativeAnimation: false }),
}));

vi.mock("@/shared/ui/Accordion/Accordion", () => ({
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

vi.mock("@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace", () => ({
  ScheduleWorkspace: () => <div data-testid="schedule-workspace" />,
}));

vi.mock("@/shared/ui/SearchCombobox/SearchCombobox", () => ({
  SearchCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("UTC")}>
      {value}
    </button>
  ),
}));

vi.mock("@/features/settings/ui/ScheduleSaveButton/ScheduleSaveButton", () => ({
  ScheduleSaveButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Save schedule
    </button>
  ),
}));

const baseScheduleProps = {
  scheduleSummary: "Mon-Thu 8.8h/day, Fri 7.8h/day",
  weekdaySchedules: [],
  orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as WeekdayCode[],
  onSetWeekdayEnabled: vi.fn(),
  onSetWeekdayField: vi.fn(),
  onCopyWeekdaySchedule: vi.fn(),
};

const preferenceProps = {
  timezone: "America/Santiago",
  timezoneOptions: [{ value: "America/Santiago", label: "America/Santiago", badge: "America" }],
  weekStart: "auto" as const,
  timeFormat: "hm" as const,
  schedulePhase: "idle" as const,
  onSetTimezone: vi.fn(),
  onSetWeekStart: vi.fn(),
  onChangeTimeFormat: vi.fn(),
  onSaveSchedule: vi.fn(),
};

const defaultProps: SettingsScheduleSectionProps = {
  ...baseScheduleProps,
  ...preferenceProps,
};

describe("SettingsScheduleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the schedule summary, workspace, and preference controls", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Mon-Thu 8.8h/day, Fri 7.8h/day")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weekly schedule" })).toBeInTheDocument();
    expect(
      screen.getByText("Set the normal hours for each day of your workweek."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("schedule-workspace")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Schedule Preferences" })).toBeInTheDocument();
    expect(
      screen.getByText("Timezone and week settings work together with your weekly hours above."),
    ).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.getByText("First day of week")).toBeInTheDocument();
    expect(screen.getByText("Time format")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save schedule" })).toBeInTheDocument();
  });

  it("omits save when onSaveSchedule is omitted", () => {
    const { onSaveSchedule: _omit, ...withoutSave } = defaultProps;
    render(<SettingsScheduleSection {...withoutSave} />);

    expect(screen.queryByRole("button", { name: "Save schedule" })).not.toBeInTheDocument();
  });

  it("forwards timezone, week-start, time-format, and save actions", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "America/Santiago" }));
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Decimal" }));
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(defaultProps.onSetTimezone).toHaveBeenCalledWith("UTC");
    expect(defaultProps.onSetWeekStart).toHaveBeenCalledWith("monday");
    expect(defaultProps.onChangeTimeFormat).toHaveBeenCalledWith("decimal");
    expect(defaultProps.onSaveSchedule).toHaveBeenCalledTimes(1);
  });
});
