import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import {
  primeAppPreferencesCache,
  saveAppPreferencesCached,
  getCachedPreferences,
} from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { syncStartupPrefsWithPreferences } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import {
  listProviderConnections,
  listenSyncProgress,
  loadAppPreferences,
  loadBootstrapPayload,
  loadSetupState,
  logFrontendBootTiming,
  requestNotificationPermission,
  saveSetupState,
  syncProviders,
} from "@/app/desktop/TauriService/tauri";
import {
  persistStartupSnapshot,
  syncTrayIcon,
} from "@/app/state/AppStore/internal/app-store-snapshot";
import { type AppStoreGet, type AppStoreSet } from "@/app/state/AppStore/internal/app-store-types";
import { getCountryCodeForTimezone, normalizeHolidayCountryMode } from "@/shared/lib/utils";

export function logStoreBoot(message: string): void {
  const elapsed = getBootElapsedMs();
  void logFrontendBootTiming(`[app-store] ${message}`, elapsed).catch(() => {
    // best effort logging only
  });
}

async function timedStoreCall<T>(label: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const value = await run();
    logStoreBoot(`${label} ok in ${Math.round(performance.now() - start)}ms`);
    return value;
  } catch (error) {
    logStoreBoot(`${label} failed in ${Math.round(performance.now() - start)}ms`);
    throw error;
  }
}

export function createBootstrapAction(set: AppStoreSet, get: AppStoreGet) {
  return async () => {
    const bootstrapStart = performance.now();
    logStoreBoot("bootstrap started");

    try {
      let [payload, connections, setupState, preferences] = await Promise.all([
        timedStoreCall("bootstrap_dashboard", () => loadBootstrapPayload()),
        timedStoreCall("list_provider_connections", () => listProviderConnections()),
        timedStoreCall("load_setup_state", () => loadSetupState()),
        timedStoreCall("load_app_preferences", () => loadAppPreferences()),
      ]);

      if (!setupState.isComplete) {
        setupState = { currentStep: "welcome", isComplete: false, completedSteps: [] };
        void saveSetupState(setupState).catch(() => {});
      }

      const detectedHolidayCountryCode = getCountryCodeForTimezone(payload.schedule.timezone);
      const shouldSyncAutoHolidayCountry =
        normalizeHolidayCountryMode(preferences.holidayCountryMode) === "auto" &&
        detectedHolidayCountryCode != null &&
        preferences.holidayCountryCode !== detectedHolidayCountryCode;

      if (shouldSyncAutoHolidayCountry) {
        preferences = await timedStoreCall("save_app_preferences(auto-holiday)", () =>
          saveAppPreferencesCached({
            ...preferences,
            holidayCountryMode: "auto",
            holidayCountryCode: detectedHolidayCountryCode,
          }),
        );
        payload = await timedStoreCall("bootstrap_dashboard(auto-holiday-refresh)", () =>
          loadBootstrapPayload(),
        );
      }

      if (!preferences.notificationPermissionRequested) {
        try {
          await requestNotificationPermission();
        } catch {}

        const nextPreferences = { ...preferences, notificationPermissionRequested: true };

        try {
          preferences = await timedStoreCall("save_app_preferences(notification-permission)", () =>
            saveAppPreferencesCached(nextPreferences),
          );
        } catch {
          preferences = nextPreferences;
        }
      }

      set({
        lifecycle: { phase: "ready", payload },
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      persistStartupSnapshot({
        payload,
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      syncStartupPrefsWithPreferences(preferences);
      primeAppPreferencesCache(preferences);
      syncTrayIcon(payload);
      logStoreBoot(`bootstrap finished in ${Math.round(performance.now() - bootstrapStart)}ms`);
    } catch (error) {
      logStoreBoot(`bootstrap failed in ${Math.round(performance.now() - bootstrapStart)}ms`);
      if (get().lifecycle.phase !== "ready") {
        set({ lifecycle: { phase: "error", error: String(error) } });
      }
    }
  };
}

export function createStartSyncAction(set: AppStoreSet, get: AppStoreGet) {
  return async (manual = true) => {
    const { syncState, refreshPayload } = get();
    if (syncState.status === "syncing") return;

    set({ syncState: { status: "syncing", log: [] }, lastSyncWasManual: manual });

    // Track which provider is currently active for toast context
    let currentProvider: "gitlab" | "youtrack" | null = null;
    let slowToastCount = 0;

    const showSlowToast = () => {
      const prefs = getCachedPreferences();
      const locale = prefs?.language ?? "en";
      const count = ++slowToastCount;

      let key: string;
      if (currentProvider === "youtrack") {
        key = count === 1
          ? "sync.youtrackSlowToast1"
          : count === 2
            ? "sync.youtrackSlowToast2"
            : "sync.youtrackSlowToast3";
      } else if (currentProvider === "gitlab") {
        key = count === 1
          ? "sync.gitlabSlowToast1"
          : count === 2
            ? "sync.gitlabSlowToast2"
            : "sync.gitlabSlowToast3";
      } else {
        key = count === 1
          ? "sync.generalSlowToast1"
          : count === 2
            ? "sync.generalSlowToast2"
            : "sync.generalSlowToast3";
      }

      // Dynamic import so we only load sonner when actually needed
      import("sonner").then(({ toast }) => {
        const messages: Record<string, string> = {
          "sync.youtrackSlowToast1":
            locale === "es"
              ? "GitLab listo — YouTrack sigue en lo suyo, paciencia..."
              : locale === "pt"
                ? "GitLab concluído — YouTrack ainda está lá, aguarde..."
                : "GitLab done — YouTrack is still going, hold on...",
          "sync.youtrackSlowToast2":
            locale === "es"
              ? "¿Qué tal una pausa para el café? YouTrack sigue synqueando..."
              : locale === "pt"
                ? "Que tal uma pausa para o café? YouTrack ainda está syncando..."
                : "Grab a coffee — YouTrack is still syncing...",
          "sync.youtrackSlowToast3":
            locale === "es"
              ? "YouTrack: el servidor está siendo lento otra vez, lo siento..."
              : locale === "pt"
                ? "YouTrack: o servidor está lento de novo, desculpa..."
                : "YouTrack: server being slow again, sorry about this...",
          "sync.gitlabSlowToast1":
            locale === "es"
              ? "GitLab está trayendo muchísimos datos, esto va para largo..."
              : locale === "pt"
                ? "GitLab está trazendo MUITOS dados, isso vai demorar..."
                : "GitLab fetching a ton of data, this is gonna take a while...",
          "sync.gitlabSlowToast2":
            locale === "es"
              ? "¿Por qué GitLab tiene tantos datos? Siquiera existían todos estos..."
              : locale === "pt"
                ? "Por que GitLab tem tantos dados? Eles sempre existiram todos esses?"
                : "Why does GitLab have this much data? Did all of this always exist?",
          "sync.gitlabSlowToast3":
            locale === "es"
              ? "GitLab no para de traer cosas. ¿Qué hay en tu historial?"
              : locale === "pt"
                ? "GitLab não para de trazer coisas. O que tem no seu histórico?"
                : "GitLab keeps bringing things. What even is in your history?",
          "sync.generalSlowToast1":
            locale === "es"
              ? "La sincronización está tardando más de lo usual..."
              : locale === "pt"
                ? "A sincronização está demorando mais que o habitual..."
                : "Sync is taking longer than usual — still working in the background...",
          "sync.generalSlowToast2":
            locale === "es"
              ? "¿Todavía aquí? Los servidores están siendo muy lentos hoy..."
              : locale === "pt"
                ? "Ainda aqui? Os servidores estão bem lentos hoje..."
                : "Still here? The servers are being very slow today...",
          "sync.generalSlowToast3":
            locale === "es"
              ? "Ok esto ya es vergonzoso. Pedimos disculpas, el servidor no coopera..."
              : locale === "pt"
                ? "Ok isso já é vergonhoso. Pedimos desculpas, o servidor não coopera..."
                : "Ok this is getting embarrassing. Apologies, the server is not cooperating...",
        };
        const msg = messages[key] ?? messages["sync.generalSlowToast1"];
        toast.warning(msg, { duration: 12000 });
      });
    };

    // Recurring slow-sync timer: fires every 20s while still syncing
    let slowTimerId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNextSlowToast = () => {
      slowTimerId = setTimeout(() => {
        if (get().syncState.status === "syncing") {
          showSlowToast();
          scheduleNextSlowToast(); // schedule next
        }
      }, 20_000);
    };
    // First slow toast after 20s
    slowTimerId = setTimeout(() => {
      if (get().syncState.status === "syncing") {
        showSlowToast();
        scheduleNextSlowToast();
      }
    }, 20_000);

    let unlisten = () => {};

    try {
      unlisten = await listenSyncProgress((line) => {
        const current = get().syncState;

        // Detect which provider is currently running
        if (line.includes("Starting GitLab sync")) {
          currentProvider = "gitlab";
        } else if (line.includes("Starting YouTrack sync")) {
          currentProvider = "youtrack";
        }

        set({ syncState: { ...current, log: [...current.log, line] } });
      });
    } catch (error) {
      const message = String(error);
      const current = get().syncState;
      set({ syncState: { ...current, log: [...current.log, `WARN: ${message}`] } });
    }

    try {
      const result = await syncProviders();
      clearTimeout(slowTimerId);
      const current = get().syncState;
      set({
        syncState: {
          status: "done",
          result,
          log: [
            ...current.log,
            `Synced ${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues, ${result.assignedIssuesSynced} assigned.`,
          ],
        },
      });
      await refreshPayload();
    } catch (error) {
      clearTimeout(slowTimerId);
      const message = String(error);
      const current = get().syncState;
      set({
        syncState: {
          status: "error",
          error: message,
          log: [...current.log, `ERROR: ${message}`],
        },
      });
    } finally {
      unlisten();
    }
  };
}
