import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { tourPayload } from "./tour-mock-data";

const STORAGE_KEY = "pulseboard-onboarding:v2";
const TOUR_START_DELAY_MS = 800;
const ELEMENT_WAIT_TIMEOUT_MS = 2000;

const stepPages = ["/", "/", "/", "/", "/", "/week", "/month", "/audit", "/"] as const;

function readOnboardingState(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("pulseboard-onboarding-complete");
  } catch {
    return null;
  }
}

export function isOnboardingComplete(): boolean {
  return readOnboardingState() === "true";
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.removeItem("pulseboard-onboarding-complete");
  } catch {
    // localStorage unavailable
  }
}

export function clearOnboardingState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("pulseboard-onboarding-complete");
  } catch {
    // localStorage unavailable
  }
}

interface OnboardingFlowProps {
  onNavigate: (path: string) => void;
}

function waitForElement(selector: string, timeout = ELEMENT_WAIT_TIMEOUT_MS): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const found = document.querySelector(selector);
      if (found || Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(found);
      }
    }, 50);
  });
}

function getTourSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: "Welcome to Pulseboard",
        description:
          "Your personal time-tracking dashboard that syncs with GitLab. We've loaded sample data so you can see what a fully set-up workspace looks like. Let's take a tour!",
        showButtons: ["next"],
      },
    },
    {
      element: "[data-onboarding='today-hero']",
      popover: {
        title: "Today's Progress",
        description:
          "The hero card shows your daily logged hours, target, and focus time at a glance. The progress ring fills as you approach your daily goal.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='today-metrics']",
      popover: {
        title: "Quick Metrics",
        description:
          "Four cards give you weekly totals, monthly consistency score, remaining hours for today, and how many days you've tracked this month.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='today-issues']",
      popover: {
        title: "Issue Breakdown",
        description:
          "See exactly which issues you spent time on today, sorted by hours. Each entry maps to a GitLab issue from your synced projects.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='gamification']",
      popover: {
        title: "Pilot Profile & Quests",
        description:
          "Track your level, XP, and daily streak in the Pilot card. Complete quests - like logging 5 consecutive days - to earn bonus XP. This section appears once gamification is active.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-onboarding='week-card']",
      popover: {
        title: "Week View",
        description:
          "Your Mon-Fri breakdown showing per-day logged hours, targets, and status badges. Today's tile is highlighted with a colored border.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='month-card']",
      popover: {
        title: "Month View",
        description:
          "Monthly aggregate: total logged hours vs. target, plus clean days (you hit the target) and overflow days (you exceeded it).",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='audit-card']",
      popover: {
        title: "Audit Flags",
        description:
          "The Audit page surfaces potential issues - overtime, missing entries, low consistency. Flags are color-coded by severity so you know what to address first.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='nav-settings']",
      popover: {
        title: "Connect GitLab",
        description:
          "Head to Settings to connect your GitLab account using a Personal Access Token or OAuth. Once connected, hit Sync to pull your real time entries.",
        side: "right",
        align: "start",
        showButtons: ["previous", "next"],
        doneBtnText: "Go to Settings ->",
      },
    },
  ];
}

function getStepSelector(stepIndex: number): string | null {
  const step = getTourSteps()[stepIndex];
  return step && "element" in step && typeof step.element === "string" ? step.element : null;
}

function restoreLifecycle(lifecycle: ReturnType<typeof useAppStore.getState>["lifecycle"]) {
  useAppStore.setState({ lifecycle });
}

function finishOnboarding(
  lifecycle: ReturnType<typeof useAppStore.getState>["lifecycle"],
  onNavigate: (path: string) => void,
) {
  restoreLifecycle(lifecycle);
  markOnboardingComplete();
  onNavigate("/settings");
}

export function OnboardingFlow({ onNavigate }: OnboardingFlowProps) {
  useEffect(() => {
    if (isOnboardingComplete()) {
      return;
    }

    const originalLifecycle = useAppStore.getState().lifecycle;
    useAppStore.setState({ lifecycle: { phase: "ready", payload: tourPayload } });

    const timeout = setTimeout(() => {
      try {
        const steps = getTourSteps();

        const driverObj = driver({
          showProgress: true,
          animate: true,
          overlayColor: "rgba(10, 10, 20, 0.92)",
          stagePadding: 8,
          stageRadius: 12,
          popoverClass: "pulseboard-popover",
          allowClose: false,
          allowKeyboardControl: false,
          disableActiveInteraction: true,
          overlayClickBehavior: () => {},
          showButtons: ["next", "previous"],
          steps,
          onNextClick: (_element, _step, { state }) => {
            const currentIndex = state.activeIndex ?? 0;
            const nextIndex = currentIndex + 1;

            if (nextIndex >= stepPages.length) {
              driverObj.destroy();
              return;
            }

            const currentPage = stepPages[currentIndex];
            const nextPage = stepPages[nextIndex];

            if (nextPage !== currentPage) {
              onNavigate(nextPage);
              const selector = getStepSelector(nextIndex);

              if (selector) {
                waitForElement(selector).then(() => driverObj.moveNext());
              } else {
                requestAnimationFrame(() => driverObj.moveNext());
              }
            } else {
              driverObj.moveNext();
            }
          },
          onPrevClick: (_element, _step, { state }) => {
            const currentIndex = state.activeIndex ?? 0;
            const prevIndex = currentIndex - 1;

            if (prevIndex < 0) {
              return;
            }

            const currentPage = stepPages[currentIndex];
            const prevPage = stepPages[prevIndex];

            if (prevPage !== currentPage) {
              onNavigate(prevPage);
              const selector = getStepSelector(prevIndex);

              if (selector) {
                waitForElement(selector).then(() => driverObj.movePrevious());
              } else {
                requestAnimationFrame(() => driverObj.movePrevious());
              }
            } else {
              driverObj.movePrevious();
            }
          },
          onDestroyStarted: (_element, _step, { driver: activeDriver }) => {
            finishOnboarding(originalLifecycle, onNavigate);
            activeDriver.destroy();
          },
        });

        driverObj.drive();
      } catch {
        finishOnboarding(originalLifecycle, onNavigate);
      }
    }, TOUR_START_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      restoreLifecycle(originalLifecycle);
    };
  }, [onNavigate]);

  return null;
}
