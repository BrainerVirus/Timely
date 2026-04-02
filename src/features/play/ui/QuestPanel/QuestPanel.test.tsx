import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { QuestPanel } from "@/features/play/ui/QuestPanel/QuestPanel";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
  })),
}));

const mockQuests = [
  {
    questKey: "log-4h",
    title: "Log 4 hours",
    description: "Daily focus",
    rewardLabel: "10 tokens",
    progressValue: 2,
    targetValue: 4,
    cadence: "daily" as const,
    category: "focus" as const,
    isActive: true,
    isClaimed: false,
  },
];

describe("QuestPanel", () => {
  it("renders when no quests", () => {
    const { container } = render(
      <I18nProvider>
        <QuestPanel quests={[]} />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders quests when provided", () => {
    render(
      <I18nProvider>
        <QuestPanel quests={mockQuests} />
      </I18nProvider>,
    );
    expect(screen.getByText("Log 4 hours")).toBeInTheDocument();
  });
});
