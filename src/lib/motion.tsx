import { useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listenDesktopEvent } from "@/lib/tauri";

import type { MotionPreference } from "@/types/dashboard";

type WindowVisibilityState = "visible" | "hidden";
export type MotionLevel = "full" | "reduced" | "none";

type MotionContextValue = {
  motionPreference: MotionPreference;
  windowVisibility: WindowVisibilityState;
  motionLevel: MotionLevel;
  allowDecorativeAnimation: boolean;
  allowLoopingAnimation: boolean;
};

const MotionContext = createContext<MotionContextValue>({
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "full",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
});

export function MotionProvider({
  children,
  motionPreference,
}: {
  children: React.ReactNode;
  motionPreference: MotionPreference;
}) {
  const systemReducedMotion = useReducedMotion();
  const [windowVisibility, setWindowVisibility] = useState<WindowVisibilityState>(() =>
    document.visibilityState === "hidden" ? "hidden" : "visible",
  );

  useEffect(() => {
    function handleVisibilityChange() {
      setWindowVisibility(document.visibilityState === "hidden" ? "hidden" : "visible");
    }

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let disposeWindowHidden = () => {};
    let disposeWindowShown = () => {};

    void (async () => {
      try {
        disposeWindowHidden = await listenDesktopEvent<boolean>("timely-window-hidden", () => {
          setWindowVisibility("hidden");
        });
        disposeWindowShown = await listenDesktopEvent<boolean>("timely-window-shown", () => {
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
  }, []);

  const motionLevel = useMemo<MotionLevel>(() => {
    if (windowVisibility === "hidden") {
      return "none";
    }

    if (motionPreference === "reduced") {
      return "reduced";
    }

    if (motionPreference === "full") {
      return "full";
    }

    return systemReducedMotion ? "reduced" : "full";
  }, [motionPreference, systemReducedMotion, windowVisibility]);

  const value = useMemo<MotionContextValue>(
    () => ({
      motionPreference,
      windowVisibility,
      motionLevel,
      allowDecorativeAnimation: motionLevel !== "none",
      allowLoopingAnimation: motionLevel === "full",
    }),
    [motionLevel, motionPreference, windowVisibility],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionSettings() {
  return useContext(MotionContext);
}
