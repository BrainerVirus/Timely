import { act, renderHook, waitFor } from "@testing-library/react";
import { I18nProvider, normalizeLanguagePreference, renderTranslation, resolveLocale, useI18n } from "@/lib/i18n";

describe("i18n", () => {
  it("resolves auto locale from browser language", () => {
    expect(resolveLocale("auto", ["es-AR"])) .toBe("es");
    expect(resolveLocale("auto", ["pt-BR"])) .toBe("pt");
    expect(resolveLocale("auto", ["de-DE"])) .toBe("en");
  });

  it("normalizes unexpected language values", () => {
    expect(normalizeLanguagePreference("fr")).toBe("auto");
    expect(normalizeLanguagePreference("es")).toBe("es");
  });

  it("renders translated strings", () => {
    expect(renderTranslation("es", "common.settings")).toBe("Ajustes");
    expect(renderTranslation("pt", "common.settings")).toBe("Configurações");
    expect(renderTranslation("en", "dashboard.cleanDays")).toBe("Days within target");
    expect(renderTranslation("es", "dashboard.cleanDays")).toBe("Días dentro del objetivo");
    expect(renderTranslation("es", "home.heroNoTargetPill")).toBe("Hoy no cuenta como meta");
    expect(renderTranslation("pt", "home.weeklyOffLabel")).toBe("folga");
    expect(renderTranslation("en", "home.petMoodCurious")).toBe("Curious");
    expect(renderTranslation("es", "home.petMoodDrained")).toBe("Sin batería");
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
      expect(result.current.formatDate(new Date(2026, 2, 12), { month: "long" }).toLowerCase()).toBe(
        "marzo",
      );
    });
  });
});
