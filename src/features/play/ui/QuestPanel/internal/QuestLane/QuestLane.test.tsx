import { render, screen } from "@testing-library/react";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { QuestLane } from "@/features/play/ui/QuestPanel/internal/QuestLane/QuestLane";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
  })),
}));

const baseQuest = {
  questKey: "log-4h",
  title: "Log 4 hours",
  description: "Daily focus",
  rewardLabel: "10 tokens",
  progressValue: 2,
  targetValue: 4,
  cadence: "daily" as const,
  category: "focus" as const,
  isActive: false,
  isClaimed: false,
};

function renderQuestLane(overrides: Partial<typeof baseQuest> = {}, props = {}) {
  return render(
    <I18nProvider>
      <QuestLane
        title="Daily missions"
        emptyTitle="No quests"
        emptyDescription="Nothing here"
        icon={CalendarDays}
        quests={[{ ...baseQuest, ...overrides }]}
        iconTone="primary"
        limit={3}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("QuestLane", () => {
  it("shows an activate button for inactive quests when activation is available", () => {
    renderQuestLane({}, { onActivateQuest: vi.fn() });

    expect(screen.getByRole("button", { name: /activate/i })).toBeInTheDocument();
  });

  it("shows a claim button for completed quests when claim is available", () => {
    renderQuestLane(
      {
        progressValue: 4,
        targetValue: 4,
      },
      { onClaimQuest: vi.fn() },
    );

    expect(screen.getByRole("button", { name: /claim reward/i })).toBeInTheDocument();
  });
});
