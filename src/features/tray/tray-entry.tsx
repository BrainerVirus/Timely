import { loadBootstrapPayload } from "@/lib/tauri";
import type { BootstrapPayload } from "@/types/dashboard";
import { useEffect, useState } from "react";
import { TrayPanel } from "./tray-panel";

export function TrayEntry() {
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);

  useEffect(() => {
    loadBootstrapPayload().then(setPayload);
  }, []);

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().hide();
    } catch {
      // Running in browser, no-op
    }
  };

  const handleActivated = (cb: () => void) => {
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { getCurrentWebviewWindow } =
          await import("@tauri-apps/api/webviewWindow");
        unlisten = await getCurrentWebviewWindow().listen<boolean>(
          "tray-panel-activated",
          () => cb(),
        );
      } catch {
        // Running in browser
      }
    })();

    return () => unlisten?.();
  };

  // Auto-hide on blur (click-away dismissal)
  useEffect(() => {
    const handleBlur = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().hide();
      } catch {
        // Running in browser
      }
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  if (!payload) return null;

  return (
    <TrayPanel
      payload={payload}
      onClose={handleClose}
      onActivated={handleActivated}
    />
  );
}
