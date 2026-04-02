import ReactDOM from "react-dom/client";
import { TrayEntry } from "@/app/layouts/TrayLayout/TrayLayout";
import { getBootElapsedMs, setBootStartMark } from "@/app/bootstrap/BootTiming/boot-timing";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { applyStartupPrefsToDocument } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import { logFrontendBootTiming } from "@/app/desktop/TauriService/tauri";
import "@/styles/globals.css";

setBootStartMark(performance.now());

document.documentElement.dataset.view = "tray";
document.body.dataset.view = "tray";
applyStartupPrefsToDocument();

function logTrayBoot(message: string): void {
  void logFrontendBootTiming(`[tray] ${message}`, getBootElapsedMs()).catch(() => {
    // best effort only
  });
}

function mountTray() {
  logTrayBoot("entry script running");

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  logTrayBoot("react root created");

  root.render(
    <I18nProvider>
      <TrayEntry />
    </I18nProvider>,
  );

  logTrayBoot("tray rendered");
  requestAnimationFrame(() => {
    logTrayBoot("tray first animation frame");
  });
}

mountTray();
