import ReactDOM from "react-dom/client";
import { getBootElapsedMs, setBootStartMark } from "@/lib/boot-timing";
import { I18nProvider } from "@/lib/i18n";
import { applyStartupPrefsToDocument } from "@/lib/startup-prefs";
import { logFrontendBootTiming } from "@/lib/tauri";
import { TrayEntry } from "@/features/tray/tray-entry";
import "@/styles/globals.css";

setBootStartMark(performance.now());

document.documentElement.setAttribute("data-view", "tray");
document.body.setAttribute("data-view", "tray");
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
