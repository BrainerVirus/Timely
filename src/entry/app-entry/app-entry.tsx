import ReactDOM from "react-dom/client";
import { getBootElapsedMs, setBootStartMark } from "@/app/bootstrap/BootTiming/boot-timing";
import {
  loadCriticalStartupFonts,
  loadDeferredAppFonts,
} from "@/app/bootstrap/LoadFonts/load-fonts";
import { applyStartupPrefsToDocument } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import { logFrontendBootTiming, prewarmTrayWindow } from "@/app/desktop/TauriService/tauri";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import "@/bones/registry";
import "@/styles/globals.css";

const bootStart = performance.now();
setBootStartMark(bootStart);

document.documentElement.dataset.view = "app";
document.body.dataset.view = "app";
applyStartupPrefsToDocument();

function logBoot(message: string): void {
  void logFrontendBootTiming(`[app] ${message}`, getBootElapsedMs()).catch(() => {
    // best effort only
  });
}

async function timedTask<T>(label: string, task: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await task();
  logBoot(`${label} finished in ${Math.round(performance.now() - started)}ms`);
  return result;
}

function runBackgroundTask(label: string, task: Promise<unknown>): void {
  const started = performance.now();
  void task
    .then(() => {
      logBoot(`${label} finished in ${Math.round(performance.now() - started)}ms`);
    })
    .catch(() => {
      logBoot(`${label} failed in ${Math.round(performance.now() - started)}ms`);
    });
}

async function mountApp() {
  logBoot("entry script running");

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  logBoot("react root created");

  const [{ default: App }] = await Promise.all([
    timedTask("app module import", () => import("@/app/root/App/App")),
    timedTask("critical startup fonts", () => loadCriticalStartupFonts()),
  ]);

  root.render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

  logBoot("app rendered");

  requestAnimationFrame(() => {
    logBoot("app first animation frame");

    globalThis.setTimeout(() => {
      runBackgroundTask("tray prewarm", prewarmTrayWindow());
    }, 500);
  });

  runBackgroundTask("deferred font preload", loadDeferredAppFonts());
  runBackgroundTask(
    "worklog module preload",
    import("@/features/worklog/screens/WorklogPage/WorklogPage"),
  );
  runBackgroundTask(
    "settings module preload",
    import("@/features/settings/screens/SettingsPage/SettingsPage"),
  );
  runBackgroundTask("play layout preload", import("@/features/play/screens/PlayLayout/PlayLayout"));
  runBackgroundTask(
    "play overview preload",
    import("@/features/play/screens/PlayOverviewPage/PlayOverviewPage"),
  );
  runBackgroundTask(
    "play shop preload",
    import("@/features/play/screens/PlayShopPage/PlayShopPage"),
  );
  runBackgroundTask(
    "play collection preload",
    import("@/features/play/screens/PlayCollectionPage/PlayCollectionPage"),
  );
  runBackgroundTask(
    "play missions preload",
    import("@/features/play/screens/PlayMissionsPage/PlayMissionsPage"),
  );
  runBackgroundTask(
    "play achievements preload",
    import("@/features/play/screens/PlayAchievementsPage/PlayAchievementsPage"),
  );

  logBoot("mount flow complete");
}

await mountApp();
