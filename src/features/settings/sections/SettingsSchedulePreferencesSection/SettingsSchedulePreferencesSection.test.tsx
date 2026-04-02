import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsSchedulePreferencesSection } from "@/features/settings/sections/SettingsSchedulePreferencesSection/SettingsSchedulePreferencesSection";

import type { SettingsSchedulePreferencesSectionProps } from "@/features/settings/sections/SettingsSchedulePreferencesSection/SettingsSchedulePreferencesSection";
import type { ReactNode } from "react";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "settings.schedulePreferences": "Schedule Preferences",
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
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
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

const defaultProps: SettingsSchedulePreferencesSectionProps = {
  timezone: "America/Santiago",
  timezoneOptions: [{ value: "America/Santiago", label: "America/Santiago", badge: "America" }],
  weekStart: "auto",
  timeFormat: "hm",
  schedulePhase: "idle",
  onSetTimezone: vi.fn(),
  onSetWeekStart: vi.fn(),
  onChangeTimeFormat: vi.fn(),
  onSaveSchedule: vi.fn(),
};

describe("SettingsSchedulePreferencesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders timezone, first-day, time-format, and save controls", () => {
    render(<SettingsSchedulePreferencesSection {...defaultProps} />);

    expect(screen.getByText("Schedule Preferences")).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.getByText("First day of week")).toBeInTheDocument();
    expect(screen.getByText("Time format")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save schedule" })).toBeInTheDocument();
  });

  it("forwards timezone, week-start, time-format, and save actions", () => {
    render(<SettingsSchedulePreferencesSection {...defaultProps} />);

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
