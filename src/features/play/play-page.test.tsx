import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";
import { PlayPage } from "@/features/play/play-page";
import { I18nProvider } from "@/lib/i18n";
import { tourPayload } from "@/features/onboarding/tour-mock-data";
import { loadAppPreferences } from "@/lib/tauri";

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
    storeCatalog: [],
    inventory: [],
    quests: [],
  });
  vi.spyOn(tauri, "claimQuestReward").mockImplementation(async () => tauri.loadPlaySnapshot());
  vi.spyOn(tauri, "purchaseReward").mockImplementation(async () => tauri.loadPlaySnapshot());
  vi.spyOn(tauri, "equipReward").mockImplementation(async () => tauri.loadPlaySnapshot());
  vi.spyOn(tauri, "unequipReward").mockImplementation(async () => tauri.loadPlaySnapshot());
  vi.spyOn(tauri, "loadAppPreferences").mockResolvedValue({
    themeMode: "system",
    language: "en",
    holidayCountryMode: "auto",
    holidayCountryCode: undefined,
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
  });
});

function renderPlayPageWithI18n() {
  return render(
    <I18nProvider>
      <PlayPage payload={tourPayload} />
    </I18nProvider>,
  );
}

describe("PlayPage", () => {
  it("renders the companion mood block with friendly copy", async () => {
    renderPlayPageWithI18n();

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
      storeCatalog: [],
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

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Daily missions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Weekly missions/i)).toBeInTheDocument();
    expect(await screen.findByText(/Achievement log/i)).toBeInTheDocument();
    expect(await screen.findByText(/^Balanced day$/i)).toBeInTheDocument();
    expect(await screen.findByText(/Clean week/i)).toBeInTheDocument();
    expect(await screen.findByText(/Streak keeper/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Active now/i)).length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: /Activate/i })).toBeInTheDocument();
  });

  it("activates a mission from the board", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 120,
      equippedCompanionMood: "focused",
      storeCatalog: [],
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
      storeCatalog: [],
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

    renderPlayPageWithI18n();

    fireEvent.click(await screen.findByRole("button", { name: /Activate/i }));

    expect(tauri.activateQuest).toHaveBeenCalledWith({ questKey: "clean_week" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect((await screen.findAllByText(/Active now/i)).length).toBeGreaterThan(0);
  });

  it("claims a completed mission reward and updates tokens", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 25,
      equippedCompanionMood: "focused",
      storeCatalog: [],
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
      storeCatalog: [],
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

    renderPlayPageWithI18n();

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

  it("purchases a store reward and marks it owned", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 125,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: false,
          equipped: false,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "purchaseReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 45,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click(await screen.findByRole("button", { name: /Buy/i }));

    expect(tauri.purchaseReward).toHaveBeenCalledWith({ rewardKey: "frame-signal" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Purchase complete",
        expect.objectContaining({ description: expect.stringContaining("Signal Frame") }),
      );
    });
    expect(await screen.findByRole("button", { name: /Equip/i })).toBeInTheDocument();
  });

  it("renders featured, companion, and accessory store sections", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 180,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "sunlit-studio",
          rewardName: "Sunlit Studio",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "sunlit-studio",
          themeTag: "craft",
          costTokens: 110,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
        {
          rewardKey: "kitsune-lumen",
          rewardName: "Kitsune Lumen",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "kitsune",
          costTokens: 160,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
        {
          rewardKey: "comet-cap",
          rewardName: "Comet Cap",
          rewardType: "headwear",
          accessorySlot: "headwear",
          costTokens: 70,
          owned: false,
          equipped: false,
          featured: false,
          rarity: "common",
          storeSection: "accessories",
        },
      ],
      inventory: [],
      quests: [],
    });

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Featured picks/i)).toBeInTheDocument();
    expect(await screen.findByText(/Companion line/i)).toBeInTheDocument();
    expect(await screen.findByText(/Accessory shelf/i)).toBeInTheDocument();
    expect(await screen.findByText(/Companion spotlight/i)).toBeInTheDocument();
    expect(await screen.findByText(/Habitat scene/i)).toBeInTheDocument();
    expect(await screen.findByText(/Starlit Camp/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sunlit Studio/i)).toBeInTheDocument();
    expect(await screen.findByText(/Rainy Retreat/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Focus/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Craft/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Recovery/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Arctic fox/i)).toBeInTheDocument();
    expect(await screen.findByText(/Snow field/i)).toBeInTheDocument();
    expect(await screen.findByText(/Kitsune Lumen/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Rare/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Epic/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Common/i)).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /arctic/i }).length).toBeGreaterThan(0);
  });

  it("previews a selected companion in the spotlight card", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 180,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
        {
          rewardKey: "kitsune-lumen",
          rewardName: "Kitsune Lumen",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "kitsune",
          costTokens: 160,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [],
      quests: [],
    });

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Arctic fox/i)).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[1]);

    expect(await screen.findByText(/Kitsune fox/i)).toBeInTheDocument();
    expect(await screen.findByText(/Twilight grove/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Kitsune turns even small progress into something that feels alive/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Kitsune turns the den into something a little stranger and more alive/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /kitsune/i }).length).toBeGreaterThan(0);
  });

  it("previews and equips an environment reward as a habitat override", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 180,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: false,
          equipped: false,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "purchaseReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 40,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "equipReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 40,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          costTokens: 140,
          owned: true,
          equipped: true,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[0]);

    expect((await screen.findAllByText(/Starlit camp/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Preview override/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Buy/i }));

    expect(tauri.purchaseReward).toHaveBeenCalledWith({ rewardKey: "starlit-camp" });
    expect(await screen.findByRole("button", { name: /Equip/i })).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Equip/i }))[0]);

    expect(tauri.equipReward).toHaveBeenCalledWith({ rewardKey: "starlit-camp" });
    expect(await screen.findByText(/Scene override/i)).toBeInTheDocument();
  });

  it("purchases and equips rainy retreat as a recovery habitat", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 180,
      equippedCompanionMood: "cozy",
      storeCatalog: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: false,
          equipped: false,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "purchaseReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 85,
      equippedCompanionMood: "cozy",
      storeCatalog: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "equipReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 85,
      equippedCompanionMood: "cozy",
      storeCatalog: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: true,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[0]);

    expect((await screen.findAllByText(/Rainy Retreat/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Recovery/i)).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByRole("button", { name: /Buy/i }));
    expect(tauri.purchaseReward).toHaveBeenCalledWith({ rewardKey: "rainy-retreat" });

    fireEvent.click(await screen.findByRole("button", { name: /Equip/i }));
    expect(tauri.equipReward).toHaveBeenCalledWith({ rewardKey: "rainy-retreat" });
    expect(await screen.findByText(/Scene override/i)).toBeInTheDocument();
  });

  it("switches between multiple environment previews", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 180,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          costTokens: 140,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "sunlit-studio",
          rewardName: "Sunlit Studio",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "sunlit-studio",
          themeTag: "craft",
          costTokens: 110,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: false,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-evolution",
          rewardName: "Aurora Evolution",
          rewardType: "companion",
          accessorySlot: "companion",
          companionVariant: "arctic",
          costTokens: 120,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "companions",
        },
      ],
      inventory: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: false,
          equipped: false,
        },
        {
          rewardKey: "sunlit-studio",
          rewardName: "Sunlit Studio",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "sunlit-studio",
          themeTag: "craft",
          costTokens: 110,
          owned: false,
          equipped: false,
        },
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: false,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[0]);
    expect(await screen.findByText(/Preview override/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Starlit camp/i)).length).toBeGreaterThan(0);

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[1]);
    expect((await screen.findAllByText(/Sunlit studio/i)).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/bright clay studio with soft daylight, tidy shelves, and a desk made for careful making/i),
    ).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Preview/i }))[2]);
    expect((await screen.findAllByText(/Rainy retreat/i)).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/quiet nook with rainy windows, soft cushions, and the kind of hush that makes recovery feel earned/i),
    ).toBeInTheDocument();
  });

  it("groups inventory into habitats and accessories", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 80,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "epic",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-scarf-es",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "starlit-camp",
          rewardName: "Starlit Camp",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "starlit-camp",
          themeTag: "focus",
          costTokens: 140,
          owned: true,
          equipped: true,
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Habitat scenes/i)).toBeInTheDocument();
    expect(await screen.findByText(/Wearables and trinkets/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Environment/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Neckwear/i)).length).toBeGreaterThan(0);
  });

  it("renders localized theme tags and inventory labels in Spanish", async () => {
    vi.mocked(loadAppPreferences).mockResolvedValueOnce({
      themeMode: "system",
      language: "es",
      holidayCountryMode: "auto",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
    });
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 95,
      equippedCompanionMood: "cozy",
      storeCatalog: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Recuperación/i)).toBeInTheDocument();
    expect(await screen.findByText(/Escenas del hábitat/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cuello/i)).toBeInTheDocument();
  });

  it("renders localized theme tags and inventory labels in Portuguese", async () => {
    vi.mocked(loadAppPreferences).mockResolvedValueOnce({
      themeMode: "system",
      language: "pt",
      holidayCountryMode: "auto",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
    });
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 110,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "sunlit-studio",
          rewardName: "Sunlit Studio",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "sunlit-studio",
          themeTag: "craft",
          costTokens: 110,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-scarf-pt",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "sunlit-studio",
          rewardName: "Sunlit Studio",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "sunlit-studio",
          themeTag: "craft",
          costTokens: 110,
          owned: true,
          equipped: false,
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    expect(await screen.findByText(/Ateliê/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cenas do habitat/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Pescoço/i)).length).toBeGreaterThan(0);
  });

  it("renders localized theme tags across English, Spanish, and Portuguese", async () => {
    vi.mocked(loadAppPreferences).mockResolvedValueOnce({
      themeMode: "system",
      language: "en",
      holidayCountryMode: "auto",
      holidayCountryCode: undefined,
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
    });
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 95,
      equippedCompanionMood: "cozy",
      storeCatalog: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "rainy-retreat",
          rewardName: "Rainy Retreat",
          rewardType: "habitat-scene",
          accessorySlot: "environment",
          environmentSceneKey: "rainy-retreat",
          themeTag: "recovery",
          costTokens: 95,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();
    expect((await screen.findAllByText(/Recovery/i)).length).toBeGreaterThan(0);
  });

  it("equips an owned reward from the collection", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 45,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: true,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "equipReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 45,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: true,
        },
        {
          rewardKey: "aurora-scarf",
          rewardName: "Aurora Scarf",
          rewardType: "neckwear",
          accessorySlot: "neckwear",
          costTokens: 65,
          owned: true,
          equipped: true,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click((await screen.findAllByRole("button", { name: /Equip/i }))[0]);

    expect(tauri.equipReward).toHaveBeenCalledWith({ rewardKey: "frame-signal" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Companion updated",
        expect.objectContaining({ description: expect.stringContaining("Signal Frame") }),
      );
    });
    expect((await screen.findAllByText(/Active now/i)).length).toBeGreaterThan(0);
  });

  it("unequips an active reward from the collection", async () => {
    vi.spyOn(tauri, "loadPlaySnapshot").mockResolvedValue({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 45,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: true,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: true,
        },
      ],
      quests: [],
    });
    vi.spyOn(tauri, "unequipReward").mockResolvedValueOnce({
      profile: tourPayload.profile,
      streak: tourPayload.streak,
      tokens: 45,
      equippedCompanionMood: "focused",
      storeCatalog: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
          featured: true,
          rarity: "rare",
          storeSection: "featured",
        },
      ],
      inventory: [
        {
          rewardKey: "frame-signal",
          rewardName: "Signal Frame",
          rewardType: "avatar-frame",
          accessorySlot: "eyewear",
          costTokens: 80,
          owned: true,
          equipped: false,
        },
      ],
      quests: [],
    });

    renderPlayPageWithI18n();

    fireEvent.click((await screen.findAllByRole("button", { name: /Unequip/i }))[0]);

    expect(tauri.unequipReward).toHaveBeenCalledWith({ rewardKey: "frame-signal" });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Accessory removed",
        expect.objectContaining({ description: expect.stringContaining("Signal Frame") }),
      );
    });
    expect(await screen.findByRole("button", { name: /Equip/i })).toBeInTheDocument();
  });
});
