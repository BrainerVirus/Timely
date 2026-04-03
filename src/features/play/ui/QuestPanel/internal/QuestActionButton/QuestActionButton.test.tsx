import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { QuestActionButton } from "@/features/play/ui/QuestPanel/internal/QuestActionButton/QuestActionButton";

import type { ComponentProps } from "react";

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

function renderQuestActionButton(props: Partial<ComponentProps<typeof QuestActionButton>> = {}) {
  return render(
    <I18nProvider>
      <QuestActionButton
        quest={baseQuest}
        canClaim={false}
        canActivate={false}
        isClaimed={false}
        isComplete={false}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("QuestActionButton", () => {
  it("renders an activate button when activation is allowed", () => {
    renderQuestActionButton({
      canActivate: true,
      onActivateQuest: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /activate/i })).toBeInTheDocument();
  });

  it("renders a claim button when claiming is allowed", () => {
    renderQuestActionButton({
      canClaim: true,
      onClaimQuest: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /claim reward/i })).toBeInTheDocument();
  });
});
