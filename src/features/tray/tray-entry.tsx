import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { Suspense, use, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { loadBootstrapPayload } from "@/lib/tauri";
import { TrayPanel } from "./tray-panel";

import type { BootstrapPayload } from "@/types/dashboard";

let trayPayloadPromise: Promise<BootstrapPayload> | null = null;

function getTrayPayload(): Promise<BootstrapPayload> {
  trayPayloadPromise ??= loadBootstrapPayload();
  return trayPayloadPromise;
}

export function TrayEntry() {
  return (
    <Suspense fallback={<TrayLoadingState />}>
      <TrayEntryContent />
    </Suspense>
  );
}

function TrayEntryContent() {
  const payload = use(getTrayPayload());

  useEffect(() => {
    return registerWindowBlurListener();
  }, []);

  return (
    <TrayPanel
      payload={payload}
      onClose={hideCurrentWindow}
      onActivated={(callback) => subscribeToTrayActivation(callback)}
    />
  );
}

function TrayLoadingState() {
  const { t } = useI18n();

  return (
    <main className="h-screen overflow-hidden bg-card text-foreground">
      <div className="flex h-full items-center justify-center p-3">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("tray.loadingStatus")}</p>
        </div>
      </div>
    </main>
  );
}

async function hideCurrentWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  } catch {
    // Running in browser, no-op
  }
}

function subscribeToTrayActivation(callback: () => void) {
  let unlisten: (() => void) | undefined;

  void (async () => {
    try {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      unlisten = await getCurrentWebviewWindow().listen<boolean>("tray-panel-activated", () => {
        callback();
      });
    } catch {
      // Running in browser
    }
  })();

  return () => unlisten?.();
}

function registerWindowBlurListener() {
  const handleBlur = () => {
    void hideCurrentWindow();
  };

  window.addEventListener("blur", handleBlur);
  return () => window.removeEventListener("blur", handleBlur);
}
