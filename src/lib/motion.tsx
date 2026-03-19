import { MotionConfig, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listenDesktopEvent } from "@/lib/tauri";

import type { MotionPreference } from "@/types/dashboard";

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

    return () => {
      if (root.dataset.motion === motionLevel) {
        delete root.dataset.motion;
      }
    };
  }, [motionLevel]);

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
