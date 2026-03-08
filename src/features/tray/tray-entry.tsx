import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { Suspense, use, useEffect } from "react";
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
  return (
    <main className="min-h-screen bg-background p-2.5 text-foreground">
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading tray status...</p>
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
