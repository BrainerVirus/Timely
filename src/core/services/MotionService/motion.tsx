import { MotionConfig, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBootElapsedMs } from "@/core/services/BootTiming/boot-timing";
import { listenDesktopEvent, logFrontendBootTiming } from "@/core/services/TauriService/tauri";

import type { MotionPreference } from "@/shared/types/dashboard";

type WindowVisibilityState = "visible" | "hidden";
type MotionLevel = "full" | "reduced" | "none";

type MotionContextValue = {
  motionPreference: MotionPreference;
  windowVisibility: WindowVisibilityState;
  motionLevel: MotionLevel;
  allowDecorativeAnimation: boolean;
  allowLoopingAnimation: boolean;
  reducedMotionMode: "user" | "always" | "never";
};

const MotionContext = createContext<MotionContextValue>({
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "full",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  reducedMotionMode: "user",
});

export function MotionProvider({
  children,
  motionPreference,
}: Readonly<{
  children: React.ReactNode;
  motionPreference: MotionPreference;
}>) {
  const systemReducedMotion = useReducedMotion();
  const [windowVisibility, setWindowVisibility] = useState<WindowVisibilityState>("visible");

  const logMotion = useCallback((message: string) => {
    void logFrontendBootTiming(`[motion] ${message}`, getBootElapsedMs()).catch(() => {
      // best effort logging only
    });
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        setWindowVisibility("visible");
      }
    }

    function handleFocus() {
      setWindowVisibility("visible");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    let disposeWindowHidden = () => {};
    let disposeWindowShown = () => {};

    void (async () => {
      try {
        disposeWindowHidden = await listenDesktopEvent<boolean>("timely-window-hidden", () => {
          logMotion("received timely-window-hidden");
          setWindowVisibility("hidden");
        });
        disposeWindowShown = await listenDesktopEvent<boolean>("timely-window-shown", () => {
          logMotion("received timely-window-shown");
          setWindowVisibility("visible");
        });
      } catch {
        disposeWindowHidden = () => {};
        disposeWindowShown = () => {};
      }
    })();

    return () => {
      disposeWindowHidden();
      disposeWindowShown();
    };
  }, [logMotion]);

  const preferredMotionLevel = useMemo<Exclude<MotionLevel, "none">>(() => {
    if (motionPreference === "reduced") {
      return "reduced";
    }

    if (motionPreference === "full") {
      return "full";
    }

    return systemReducedMotion ? "reduced" : "full";
  }, [motionPreference, systemReducedMotion]);

  const motionLevel = useMemo<MotionLevel>(() => {
    if (windowVisibility === "hidden") {
      return "none";
    }

    return preferredMotionLevel;
  }, [preferredMotionLevel, windowVisibility]);

  const reducedMotionMode = useMemo<"user" | "always" | "never">(() => {
    if (windowVisibility === "hidden") {
      return "always";
    }

    if (motionPreference === "reduced") {
      return "always";
    }

    if (motionPreference === "full") {
      return "never";
    }

    return "user";
  }, [motionPreference, windowVisibility]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motionLevel;
    logMotion(`window=${windowVisibility} level=${motionLevel} preference=${motionPreference}`);

    return () => {
      if (root.dataset.motion === motionLevel) {
        delete root.dataset.motion;
      }
    };
  }, [logMotion, motionLevel, motionPreference, windowVisibility]);

  const value = useMemo<MotionContextValue>(
    () => ({
      motionPreference,
      windowVisibility,
      motionLevel,
      allowDecorativeAnimation: preferredMotionLevel === "full",
      allowLoopingAnimation: motionLevel === "full",
      reducedMotionMode,
    }),
    [motionLevel, motionPreference, preferredMotionLevel, reducedMotionMode, windowVisibility],
  );

  return (
    <MotionConfig reducedMotion={reducedMotionMode}>
      <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
    </MotionConfig>
  );
}

export function useMotionSettings() {
  return useContext(MotionContext);
}
