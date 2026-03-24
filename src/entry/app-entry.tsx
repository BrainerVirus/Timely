import ReactDOM from "react-dom/client";
import { getBootElapsedMs, setBootStartMark } from "@/core/services/BootTiming/boot-timing";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { loadCriticalStartupFonts, loadDeferredAppFonts } from "@/core/services/LoadFonts/load-fonts";
import { applyStartupPrefsToDocument } from "@/core/services/StartupPrefs/startup-prefs";
import { logFrontendBootTiming, prewarmTrayWindow } from "@/core/services/TauriService/tauri";
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
    timedTask("app module import", () => import("@/core/app/App")),
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
  runBackgroundTask("worklog module preload", import("@/features/worklog/worklog-page"));
  runBackgroundTask("settings module preload", import("@/features/settings/settings-page"));
  runBackgroundTask("play layout preload", import("@/features/play/play-layout"));
  runBackgroundTask("play routes preload", import("@/features/play/play-route-pages"));

  logBoot("mount flow complete");
}

await mountApp();
