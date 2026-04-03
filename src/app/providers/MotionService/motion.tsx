import { MotionConfig, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import { listenDesktopEvent, logFrontendBootTiming } from "@/app/desktop/TauriService/tauri";

type WindowVisibilityState = "visible" | "hidden";
type MotionLevel = "full" | "reduced" | "none";

type MotionContextValue = {
  motionPreference?: "system" | "reduced" | "full";
  windowVisibility: WindowVisibilityState;
  motionLevel: MotionLevel;
  prefersReducedMotion?: boolean;
  allowDecorativeAnimation: boolean;
  allowLoopingAnimation: boolean;
  reducedMotionMode?: "user" | "always" | "never";
};

const MotionContext = createContext<MotionContextValue>({
  windowVisibility: "visible",
  motionLevel: "full",
  prefersReducedMotion: false,
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  motionPreference: "system",
  reducedMotionMode: "user",
});

export function MotionProvider({
  children,
}: Readonly<{ children: React.ReactNode; motionPreference?: "system" | "reduced" | "full" }>) {
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

  const preferredMotionLevel = useMemo<Exclude<MotionLevel, "none">>(
    () => (systemReducedMotion ? "reduced" : "full"),
    [systemReducedMotion],
  );

  const motionLevel = useMemo<MotionLevel>(() => {
    if (windowVisibility === "hidden") {
      return "none";
    }

    return preferredMotionLevel;
  }, [preferredMotionLevel, windowVisibility]);

  useEffect(() => {
    logMotion(
      `window=${windowVisibility} level=${motionLevel} reduced=${String(systemReducedMotion)}`,
    );
  }, [logMotion, motionLevel, systemReducedMotion, windowVisibility]);

  const value = useMemo<MotionContextValue>(
    () => ({
      windowVisibility,
      motionLevel,
      motionPreference: "system",
      prefersReducedMotion: systemReducedMotion ?? false,
      allowDecorativeAnimation: motionLevel === "full",
      allowLoopingAnimation: motionLevel === "full",
      reducedMotionMode: "user",
    }),
    [motionLevel, systemReducedMotion, windowVisibility],
  );

  return (
    <MotionConfig reducedMotion="user">
      <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
    </MotionConfig>
  );
}

export function useMotionSettings() {
  return useContext(MotionContext);
}
