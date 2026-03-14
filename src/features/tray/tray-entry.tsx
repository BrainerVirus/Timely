import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { Suspense, use, useEffect } from "react";
import { applyTheme, type Theme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";
import { loadAppPreferences, loadBootstrapPayload } from "@/lib/tauri";
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
    void loadAppPreferences()
      .then((preferences) => {
        applyTheme(preferences.themeMode as Theme);
      })
      .catch(() => {
        applyTheme("system");
      });

    return registerWindowFocusListener();
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
    <main className="flex h-full w-full items-center justify-center overflow-hidden rounded-[20px] bg-[color:var(--color-panel)] p-6 text-foreground backdrop-blur-md">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("tray.loadingStatus")}</p>
      </div>
    </main>
  );
}

async function hideCurrentWindow() {
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    await getCurrentWebviewWindow().hide();
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

function registerWindowFocusListener() {
  let unlisten: (() => void) | undefined;

  void (async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          void hideCurrentWindow();
        }
      });
    } catch {
      // Running in browser
    }
  })();

  return () => unlisten?.();
}
