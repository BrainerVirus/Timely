import {
  clearPreferencesCache,
  getCachedPreferences,
  primeAppPreferencesCache,
} from "@/core/services/PreferencesCache/preferences-cache";

vi.mock("@/core/services/TauriService/tauri", () => ({
  loadAppPreferences: vi.fn(),
  saveAppPreferences: vi.fn(),
}));
vi.mock("@/core/services/StartupPrefs/startup-prefs", () => ({
  syncStartupPrefsWithPreferences: vi.fn(),
}));

const mockPrefs = {
  themeMode: "system" as const,
  motionPreference: "system" as const,
  language: "auto" as const,
  updateChannel: "stable" as const,
  timeFormat: "hm" as const,
  holidayCountryMode: "auto" as const,
  autoSyncEnabled: false,
  autoSyncIntervalMinutes: 60,
  trayEnabled: true,
  closeToTray: false,
  onboardingCompleted: false,
};

describe("preferences-cache", () => {
  beforeEach(() => {
    clearPreferencesCache();
  });

  it("getCachedPreferences returns null when cache is empty", () => {
    expect(getCachedPreferences()).toBeNull();
  });

  it("primeAppPreferencesCache sets cache", () => {
    primeAppPreferencesCache(mockPrefs);
    expect(getCachedPreferences()).toEqual(mockPrefs);
  });

  it("clearPreferencesCache clears cache", () => {
    primeAppPreferencesCache(mockPrefs);
    clearPreferencesCache();
    expect(getCachedPreferences()).toBeNull();
  });
});
