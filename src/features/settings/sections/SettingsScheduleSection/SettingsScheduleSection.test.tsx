import { render, screen } from "@testing-library/react";
import { SettingsScheduleSection } from "@/features/settings/sections/SettingsScheduleSection/SettingsScheduleSection";

import type { SettingsScheduleSectionProps } from "@/features/settings/sections/SettingsScheduleSection/SettingsScheduleSection";
import type { ReactNode } from "react";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "settings.schedule": "Schedule",
          "settings.weeklySchedule": "Weekly schedule",
          "settings.weeklyScheduleDescription": "Set the normal hours for each day of your workweek.",
        }) as Record<string, string>
      )[key] ?? key,
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

const defaultProps: SettingsScheduleSectionProps = {
  scheduleSummary: "Mon-Thu 8.8h/day, Fri 7.8h/day",
  weekdaySchedules: [],
  orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  onSetWeekdayEnabled: vi.fn(),
  onSetWeekdayField: vi.fn(),
  onCopyWeekdaySchedule: vi.fn(),
};

describe("SettingsScheduleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the schedule summary and the workspace", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Mon-Thu 8.8h/day, Fri 7.8h/day")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weekly schedule" })).toBeInTheDocument();
    expect(screen.getByText("Set the normal hours for each day of your workweek.")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-workspace")).toBeInTheDocument();
  });

  it("does not render schedule preference controls inside the weekly editor section", () => {
    render(<SettingsScheduleSection {...defaultProps} />);

    expect(screen.queryByText(/^Timezone$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^First day of week$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Time format$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save schedule/i })).not.toBeInTheDocument();
  });
});
