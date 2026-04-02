import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { Suspense, use, useEffect, useRef } from "react";
import { applyTheme, type Theme } from "@/app/providers/use-theme/use-theme";
import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { MotionProvider } from "@/app/providers/MotionService/motion";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { loadBootstrapPayload, logFrontendBootTiming } from "@/app/desktop/TauriService/tauri";
import { TrayPanel } from "@/features/tray/ui/TrayPanel/TrayPanel";

import type { BootstrapPayload } from "@/shared/types/dashboard";

let trayPayloadPromise: Promise<BootstrapPayload> | null = null;

function logTrayBoot(message: string): void {
  void logFrontendBootTiming(`[tray] ${message}`, getBootElapsedMs()).catch(() => {
    // best effort logging only
  });
}

function getTrayPayload(): Promise<BootstrapPayload> {
  trayPayloadPromise ??= (async () => {
    const start = performance.now();
    const payload = await loadBootstrapPayload();
    logTrayBoot(`bootstrap payload loaded in ${Math.round(performance.now() - start)}ms`);
    return payload;
  })();
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
  const didLogRenderRef = useRef(false);

  if (!didLogRenderRef.current) {
    logTrayBoot("tray entry content evaluated");
    didLogRenderRef.current = true;
  }

  const payload = use(getTrayPayload());

  useEffect(() => {
    void getAppPreferencesCached()
      .then((preferences) => {
        logTrayBoot("preferences loaded for theme apply");
        applyTheme(preferences.themeMode as Theme);
      })
      .catch(() => {
        logTrayBoot("preferences load failed, applying system theme");
        applyTheme("system");
      });

    return registerWindowFocusListener();
  }, []);

  return (
    <MotionProvider>
      <TrayPanel
        payload={payload}
        onClose={hideCurrentWindow}
        onActivated={(callback) => subscribeToTrayActivation(callback)}
      />
    </MotionProvider>
  );
}

function TrayLoadingState() {
  const { t } = useI18n();

  return (
    <main className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-panel p-6 text-foreground backdrop-blur-md">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-5 w-5 text-primary motion-safe:animate-spin" />
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

function handleWindowFocusChanged(
  focused: boolean,
  closing: boolean,
  setClosing: (value: boolean) => void,
) {
  if (!focused) {
    if (closing) {
      return;
    }

    setClosing(true);
    void hideCurrentWindow().finally(() => {
      globalThis.setTimeout(() => {
        setClosing(false);
      }, 80);
    });
  }
}

function registerWindowFocusListener() {
  let unlisten: (() => void) | undefined;
  let closing = false;

  void (async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        handleWindowFocusChanged(focused, closing, (value) => {
          closing = value;
        });
      });
    } catch {
      // Running in browser
    }
  })();

  return () => unlisten?.();
}
