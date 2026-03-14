import { render, screen } from "@testing-library/react";
import * as tauri from "@/lib/tauri";
import { PlayPage } from "@/features/play/play-page";
import { tourPayload } from "@/features/onboarding/tour-mock-data";

describe("PlayPage", () => {
  it("renders the companion mood block with friendly copy", async () => {
    render(<PlayPage payload={tourPayload} />);

    expect(await screen.findByText(/Companion mood/i)).toBeInTheDocument();
    expect(await screen.findByText(/Mood: Calm/i)).toBeInTheDocument();
    expect(await screen.findByText(/steady pace keeps the den peaceful/i)).toBeInTheDocument();
  });

  it("groups missions into daily, weekly, and achievements lanes", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 120,
      equippedCompanionMood: "focused",
      inventory: [],
      quests: [
        {
          questKey: "balanced_day",
          title: "Balanced day",
          description: "Meet your target without overflow.",
          rewardLabel: "50 tokens",
          targetValue: 1,
          progressValue: 1,
          cadence: "daily",
          category: "consistency",
        },
        {
          questKey: "clean_week",
          title: "Clean week",
          description: "Finish the week with no under-target workdays.",
          rewardLabel: "Companion XP",
          targetValue: 5,
          progressValue: 3,
          cadence: "weekly",
          category: "consistency",
        },
        {
          questKey: "streak_keeper",
          title: "Streak keeper",
          description: "Protect a seven-day streak without breaking the chain.",
          rewardLabel: "Fox trail badge",
          targetValue: 7,
          progressValue: 4,
          cadence: "achievement",
          category: "milestone",
        },
      ],
    });

    render(<PlayPage payload={tourPayload} />);

    expect(await screen.findByText(/Daily missions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Weekly missions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Achievement log/i)).toBeInTheDocument();
    expect(await screen.findByText(/Balanced day/i)).toBeInTheDocument();
    expect(await screen.findByText(/Clean week/i)).toBeInTheDocument();
    expect(await screen.findByText(/Streak keeper/i)).toBeInTheDocument();
  });
});
