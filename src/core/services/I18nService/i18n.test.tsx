import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  I18nProvider,
  localeMessages,
  normalizeLanguagePreference,
  renderTranslation,
  resolveLocale,
  useI18n,
} from "@/core/services/I18nService/i18n";
import { clearPreferencesCache } from "@/core/services/PreferencesCache/preferences-cache";

import type { AppPreferences } from "@/shared/types/dashboard";

const eventListeners = new Map<string, Array<(payload: unknown) => void>>();

const defaultPreferences: AppPreferences = {
  themeMode: "system",
  motionPreference: "system",
  language: "auto",
  updateChannel: "stable",
  lastInstalledVersion: undefined,
  lastSeenReleaseHighlightsVersion: undefined,
  holidayCountryMode: "auto",
  holidayCountryCode: undefined,
  timeFormat: "hm",
  autoSyncEnabled: false,
  autoSyncIntervalMinutes: 30,
  trayEnabled: true,
  closeToTray: true,
  onboardingCompleted: false,
  notificationsEnabled: true,
  notificationThresholds: {
    minutes45: true,
    minutes30: true,
    minutes15: true,
    minutes5: true,
  },
};

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>(
    "@/core/services/TauriService/tauri",
  );
  return {
    ...actual,
    loadAppPreferences: vi.fn(async () => defaultPreferences),
    listenAppPreferencesChanged: vi.fn(async (cb: (payload: unknown) => void) => {
      const event = "app-preferences-updated";
      const handlers = eventListeners.get(event) ?? [];
      handlers.push(cb);
      eventListeners.set(event, handlers);

      return () => {
        eventListeners.set(
          event,
          (eventListeners.get(event) ?? []).filter((handler) => handler !== cb),
        );
      };
    }),
  };
});

function emitDesktopEvent(event: string, payload: unknown) {
  for (const handler of eventListeners.get(event) ?? []) {
    handler(payload);
  }
}

describe("i18n", () => {
  beforeEach(() => {
    clearPreferencesCache();
    eventListeners.clear();
  });

  it("resolves auto locale from browser language", () => {
    expect(resolveLocale("auto", ["es-AR"])).toBe("es");
    expect(resolveLocale("auto", ["pt-BR"])).toBe("pt");
    expect(resolveLocale("auto", ["de-DE"])).toBe("en");
  });

  it("normalizes unexpected language values", () => {
    expect(normalizeLanguagePreference("fr")).toBe("auto");
    expect(normalizeLanguagePreference("es")).toBe("es");
  });

  it("renders translated strings", () => {
    expect(renderTranslation("es", "common.settings")).toBe("Ajustes");
    expect(renderTranslation("pt", "common.settings")).toBe("Configurações");
    expect(renderTranslation("en", "dashboard.loggedTime")).toBe("Logged");
    expect(renderTranslation("es", "dashboard.loggedTime")).toBe("Registrado");
    expect(renderTranslation("en", "dashboard.expectedHours")).toBe("Expected");
    expect(renderTranslation("es", "dashboard.expectedHours")).toBe("Previsto");
    expect(renderTranslation("en", "dashboard.expectedThroughYesterday")).toBe("Through yesterday");
    expect(renderTranslation("en", "dashboard.expectedForRange")).toBe("Range total");
    expect(renderTranslation("es", "dashboard.expectedThroughYesterday")).toBe("Hasta ayer");
    expect(renderTranslation("es", "dashboard.expectedForRange")).toBe("Total del rango");
    expect(renderTranslation("pt", "dashboard.missingHours")).toBe("Em falta");
    expect(renderTranslation("pt", "dashboard.targetTime")).toBe("Meta");
    expect(renderTranslation("es", "home.heroNoTargetPill")).toBe("Hoy no cuenta como meta");
    expect(renderTranslation("pt", "home.weeklyOffLabel")).toBe("folga");
    expect(renderTranslation("en", "home.petMoodCurious")).toBe("Curious");
    expect(renderTranslation("es", "home.petMoodDrained")).toBe("Sin batería");
    expect(renderTranslation("en", "gamification.dailyMissions")).toBe("Daily missions");
    expect(renderTranslation("pt", "gamification.category.milestone")).toBe("Marco");
    expect(renderTranslation("es", "gamification.activate")).toBe("Activar");
    expect(renderTranslation("en", "gamification.claimReward")).toBe("Claim reward");
    expect(renderTranslation("en", "play.storeTitle")).toBe("Fox den shop");
    expect(renderTranslation("en", "play.unequip")).toBe("Unequip");
    expect(renderTranslation("en", "play.storeFeatured")).toBe("Scene-stealers");
    expect(renderTranslation("es", "play.inventoryHabitatsTitle")).toBe("Escenas del hábitat");
    expect(renderTranslation("es", "play.inventoryAccessoriesDescription")).toBe(
      "Todo lo que tu zorro puede llevar puesto o sumar a la escena.",
    );
    expect(renderTranslation("pt", "play.inventoryHabitatsDescription")).toBe(
      "Ambientes colecionados para mudar o clima da toca.",
    );
    expect(renderTranslation("pt", "play.inventoryAccessoriesTitle")).toBe(
      "Acessórios e pequenos tesouros",
    );
    expect(renderTranslation("en", "play.themeTag.recovery")).toBe("Recovery");
    expect(renderTranslation("en", "play.themeTag.focus")).toBe("Focus");
    expect(renderTranslation("es", "play.themeTag.craft")).toBe("Taller");
    expect(renderTranslation("es", "play.themeTag.recovery")).toBe("Recuperación");
    expect(renderTranslation("pt", "play.themeTag.focus")).toBe("Foco");
    expect(renderTranslation("pt", "play.themeTag.recovery")).toBe("Recuperação");
    expect(renderTranslation("es", "play.storeTitle")).toBe("Tienda de la guarida");
    expect(renderTranslation("pt", "play.storeTitle")).toBe("Loja da toca");
    expect(renderTranslation("en", "releaseHighlights.dialogTitle")).toBe("What just changed");
    expect(renderTranslation("es", "releaseHighlights.dialogTitle")).toBe("Qué cambió ahora");
    expect(renderTranslation("pt", "releaseHighlights.dialogTitle")).toBe("O que mudou agora");
  });

  it("keeps key user-facing localized strings free of leaked English in es and pt", () => {
    const keyGroups = [
      "settings.windowBehavior",
      "settings.showTrayIcon",
      "settings.showTrayIconDescription",
      "settings.closeButtonActionDescription",
      "settings.updatesOverviewTitle",
      "settings.updatesReleaseChannel",
      "settings.updatesDescription",
      "settings.viewAppDetails",
      "releaseHighlights.dialogTitle",
      "setup.connectionGuidePat",
      "setup.connectionGuideSync",
    ] as const;
    const bannedWords = /\b(setup|tray|build|release|updater|upgrade|workflow|app)\b/i;

    for (const locale of ["es", "pt"] as const) {
      for (const key of keyGroups) {
        const value = localeMessages[locale][key];
        const resolved = typeof value === "function" ? value({}) : value;
        expect(resolved).not.toMatch(bannedWords);
      }
    }
  });

  it("formats hours with locale-aware decimal separator", () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });

    expect(result.current.formatHours(8.5, "decimal")).toMatch(/8/);
  });

  it("updates weekday and date formatting when language preference changes", () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });

    act(() => {
      result.current.setLanguagePreference("es");
    });

    return waitFor(() => {
      expect(result.current.formatWeekdayFromCode("Mon").toLowerCase()).not.toBe("mon");
      expect(
        result.current.formatDate(new Date(2026, 2, 12), { month: "long" }).toLowerCase(),
      ).toBe("marzo");
    });
  });
});

function Probe() {
  const { t } = useI18n();
  return <p>{t("common.open")}</p>;
}

describe("I18nProvider desktop sync", () => {
  beforeEach(() => {
    clearPreferencesCache();
    eventListeners.clear();
  });

  it("updates language when app-preferences-updated event is emitted", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    emitDesktopEvent("app-preferences-updated", {
      ...defaultPreferences,
      language: "es",
    } satisfies AppPreferences);

    await waitFor(() => {
      expect(screen.getByText("Abrir")).toBeInTheDocument();
    });
  });
});
