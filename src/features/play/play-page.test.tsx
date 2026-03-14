import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";
import { PlayPage } from "@/features/play/play-page";
import { tourPayload } from "@/features/onboarding/tour-mock-data";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
    profile: tourPayload.profile,
    streak: tourPayload.streak,
    tokens: 0,
    equippedCompanionMood: "calm",
    inventory: [],
    quests: [],
  });
  vi.spyOn(tauri, "claimQuestReward").mockImplementation(async () => tauri.loadPlaySnapshot());
});

describe("PlayPage", () => {
  it("renders the companion mood block with friendly copy", async () => {
    render(<PlayPage payload={tourPayload} />);

    expect(await screen.findByText(/Companion mood/i)).toBeInTheDocument();
    expect(await screen.findByText(/Mood: Calm/i)).toBeInTheDocument();
    expect(await screen.findByText(/steady pace keeps the den peaceful/i)).toBeInTheDocument();
  });

  it("groups missions into daily, weekly, and achievements lanes", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
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
          isActive: true,
          isClaimed: false,
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
          isActive: false,
          isClaimed: false,
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
          isActive: false,
          isClaimed: false,
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
    expect(await screen.findByText(/Active now/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Activate/i })).toBeInTheDocument();
  });

  it("activates a mission from the board", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 120,
      equippedCompanionMood: "focused",
      inventory: [],
      quests: [
        {
          questKey: "clean_week",
          title: "Clean week",
          description: "Finish the week with no under-target workdays.",
          rewardLabel: "Companion XP",
          targetValue: 5,
          progressValue: 3,
          cadence: "weekly",
          category: "consistency",
          isActive: false,
          isClaimed: false,
        },
      ],
    });
    vi.spyOn(tauri, "activateQuest").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 120,
      equippedCompanionMood: "focused",
      inventory: [],
      quests: [
        {
          questKey: "clean_week",
          title: "Clean week",
          description: "Finish the week with no under-target workdays.",
          rewardLabel: "Companion XP",
          targetValue: 5,
          progressValue: 3,
          cadence: "weekly",
          category: "consistency",
          isActive: true,
          isClaimed: false,
        },
      ],
    });

    render(<PlayPage payload={tourPayload} />);

    fireEvent.click(await screen.findByRole("button", { name: /Activate/i }));

    expect(tauri.activateQuest).toHaveBeenCalledWith({ questKey: "clean_week" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Active now/i)).toBeInTheDocument();
  });

  it("claims a completed mission reward and updates tokens", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 25,
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
          isActive: true,
          isClaimed: false,
        },
      ],
    });
    vi.spyOn(tauri, "claimQuestReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 75,
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
          isActive: true,
          isClaimed: true,
        },
      ],
    });

    render(<PlayPage payload={tourPayload} />);

    fireEvent.click(await screen.findByRole("button", { name: /Claim reward/i }));

    expect(tauri.claimQuestReward).toHaveBeenCalledWith({ questKey: "balanced_day" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Claimed/i)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Reward claimed",
      expect.objectContaining({
        description: expect.stringContaining("Balanced day"),
      }),
    );
  });
});
