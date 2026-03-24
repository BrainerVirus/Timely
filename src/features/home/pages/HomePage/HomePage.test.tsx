import { fireEvent, render, screen } from "@testing-library/react";
import { HomePage } from "@/features/home/pages/HomePage/HomePage";
import { tourPayload } from "@/features/onboarding/tour-mock-data";
import { mockBootstrap } from "@/test/fixtures/mock-data";
import { useMotionSettings } from "@/core/services/MotionService/motion";

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "system",
    windowVisibility: "visible",
    motionLevel: "full",
    allowDecorativeAnimation: true,
    allowLoopingAnimation: true,
    reducedMotionMode: "user",
  })),
}));

const fullMotionSettings = {
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "full",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  reducedMotionMode: "user",
} as const;

const reducedMotionSettings = {
  motionPreference: "reduced",
  windowVisibility: "visible",
  motionLevel: "reduced",
  allowDecorativeAnimation: false,
  allowLoopingAnimation: false,
  reducedMotionMode: "always",
} as const;

const hiddenFullMotionSettings = {
  motionPreference: "full",
  windowVisibility: "hidden",
  motionLevel: "none",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: false,
  reducedMotionMode: "always",
} as const;

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useMotionSettings).mockReturnValue(fullMotionSettings);
  });

  it("renders quick worklog links for day, week, and period", () => {
    const onOpenWorklog = vi.fn();

    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={onOpenWorklog}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open today log/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review this week/i }));
    fireEvent.click(screen.getByRole("button", { name: /Inspect date range/i }));

    expect(onOpenWorklog).toHaveBeenNthCalledWith(1, "day");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(2, "week");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(3, "period");
  });

  it("shows the fox hero labels and lower sections", () => {
    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/Companion status/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Timely fox mascot/i })).toBeInTheDocument();
    expect(screen.getByText(/This week's progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Logged 6h15min/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.3h/i)).toBeInTheDocument();
    expect(screen.queryByText(/best-effort same-day uploads/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/4d/i)).toHaveLength(2);
  });

  it("uses today's configured target hours for the remaining hero pill", () => {
    render(
      <HomePage
        payload={{
          ...tourPayload,
          today: {
            ...tourPayload.today,
            loggedHours: 6.25,
            targetHours: 9,
          },
        }}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/2h45min left/i)).toBeInTheDocument();
  });

  it("shows rest-day hero pills instead of target progress on non-workdays", () => {
    render(
      <HomePage
        payload={{
          ...tourPayload,
          today: {
            ...tourPayload.today,
            targetHours: 0,
            loggedHours: 0,
            status: "non_workday",
            holidayName: undefined,
            topIssues: [],
          },
        }}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/No target today/i)).toBeInTheDocument();
    expect(screen.getByText(/Streak safe 4d/i)).toBeInTheDocument();
    expect(screen.queryByText(/target cleared/i)).not.toBeInTheDocument();
  });

  it("surfaces optional progress on non-workdays when time was logged", () => {
    render(
      <HomePage
        payload={{
          ...tourPayload,
          today: {
            ...tourPayload.today,
            targetHours: 0,
            loggedHours: 1.5,
            status: "non_workday",
            holidayName: "Founders Day",
            topIssues: [],
          },
        }}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/Logged 1h30min/i)).toBeInTheDocument();
    expect(screen.getByText(/Holiday mode suits you/i)).toBeInTheDocument();
    expect(screen.getByText(/No target today/i)).toBeInTheDocument();
  });

  it("keeps weekday ordering from payload for weekly progress and streak", () => {
    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    const weekdayChips = screen.getAllByText(/^[MTWFS]$/i);

    expect(weekdayChips[0]).toHaveTextContent("S");
  });

  it("shows matching empty placeholders for weekly progress and streak on a fresh workspace", () => {
    render(
      <HomePage
        payload={mockBootstrap}
        needsSetup={true}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(
      screen.getByText(/Sync your data to see your weekly rhythm appear here/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sync your data to see your current streak appear here/i),
    ).toBeInTheDocument();
  });

  it("renders weekly progress and streak sections without motion styles in reduced mode", () => {
    vi.mocked(useMotionSettings).mockReturnValue(reducedMotionSettings);

    const { container } = render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/This week's progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });

  it("keeps home cards mounted without hidden entrance states while the window is hidden", () => {
    vi.mocked(useMotionSettings).mockReturnValue(hiddenFullMotionSettings);

    const { container } = render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/This week's progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
