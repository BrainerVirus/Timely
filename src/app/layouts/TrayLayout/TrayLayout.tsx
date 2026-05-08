import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { useEffect, useRef, useState } from "react";
import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { loadBootstrapPayload, logFrontendBootTiming } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { MotionProvider } from "@/app/providers/MotionService/motion";
import { applyTheme, type Theme } from "@/app/providers/use-theme/use-theme";
import { TrayPanel } from "@/features/tray/ui/TrayPanel/TrayPanel";

import type { BootstrapPayload } from "@/shared/types/dashboard";

function logTrayBoot(message: string): void {
  void logFrontendBootTiming(`[tray] ${message}`, getBootElapsedMs()).catch(() => {
    // best effort logging only
  });
}

async function loadFreshTrayPayload(): Promise<BootstrapPayload> {
  const start = performance.now();
  const payload = await loadBootstrapPayload();
  logTrayBoot(`bootstrap payload loaded in ${Math.round(performance.now() - start)}ms`);
  return payload;
}

export function TrayEntry() {
  return <TrayEntryContent />;
}

function TrayEntryContent() {
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const didLogRenderRef = useRef(false);
  const isMountedRef = useRef(false);

  if (!didLogRenderRef.current) {
    logTrayBoot("tray entry content evaluated");
    didLogRenderRef.current = true;
  }

  useEffect(() => {
    let disposed = false;
    isMountedRef.current = true;

    void loadFreshTrayPayload()
      .then((nextPayload) => {
        if (!disposed && isMountedRef.current) {
          setPayload(nextPayload);
        }
      })
      .catch(() => {
        logTrayBoot("bootstrap payload load failed");
      });

    void getAppPreferencesCached()
      .then((preferences) => {
        logTrayBoot("preferences loaded for theme apply");
        applyTheme(preferences.themeMode as Theme);
      })
      .catch(() => {
        logTrayBoot("preferences load failed, applying system theme");
        applyTheme("system");
      });

    return () => {
      disposed = true;
      isMountedRef.current = false;
    };
  }, []);

  if (!payload) {
    return <TrayLoadingState />;
  }

  return (
    <MotionProvider>
      <TrayPanel
        payload={payload}
        onClose={hideCurrentWindow}
        onActivated={(callback) =>
          subscribeToTrayActivation(async () => {
            const nextPayload = await loadFreshTrayPayload();
            if (!isMountedRef.current) {
              return;
            }
            setPayload(nextPayload);
            callback(nextPayload);
          })
        }
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

function subscribeToTrayActivation(callback: () => void | Promise<void>) {
  let unlisten: (() => void) | undefined;
  let disposed = false;

  void (async () => {
    try {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const nextUnlisten = await getCurrentWebviewWindow().listen<boolean>(
        "tray-panel-activated",
        () => {
          void Promise.resolve(callback()).catch(() => {
            // Activation refresh is best-effort; the existing tray state remains visible.
          });
        },
      );

      if (disposed) {
        nextUnlisten();
        return;
      }

      unlisten = nextUnlisten;
    } catch {
      // Running in browser
    }
  })();

  return () => {
    disposed = true;
    unlisten?.();
  };
}
