import { render, screen } from "@testing-library/react";
import { WeekView } from "@/features/worklog/components/WeekView/WeekView";
import { mockBootstrap } from "@/core/services/MockData/mock-data";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatDate: (d: Date, _opts: Intl.DateTimeFormatOptions) => d.toISOString().slice(0, 10),
    formatDayStatus: (status: string) => status,
    formatWeekdayFromDate: (d: Date) => d.toLocaleDateString("en", { weekday: "long" }),
  })),
}));

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: false })),
}));

vi.mock("@/shared/hooks/use-format-hours/use-format-hours", () => ({
  useFormatHours: vi.fn(() => (h: number) => `${h}h`),
}));

describe("WeekView", () => {
  it("renders empty state when week is empty", () => {
    render(<WeekView week={[]} />);
    expect(screen.getByText("worklog.noIssues")).toBeInTheDocument();
  });

  it("renders day cards when week has days", () => {
    render(<WeekView week={mockBootstrap.week} />);
    expect(screen.getByText("dashboard.weekTitle")).toBeInTheDocument();
  });
});
