import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { tourPayload } from "./tour-mock-data";

const STORAGE_KEY = "timely-onboarding:v2";
const TOUR_START_DELAY_MS = 800;
const ELEMENT_WAIT_TIMEOUT_MS = 2000;

const stepPages = ["/", "/", "/", "/", "/worklog", "/settings", "/"] as const;

function readOnboardingState(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("timely-onboarding-complete");
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
    localStorage.removeItem("timely-onboarding-complete");
  } catch {
    // localStorage unavailable
  }
}

export function clearOnboardingState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("timely-onboarding-complete");
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
        title: "Welcome to Timely",
        description:
          "Your personal time-tracking dashboard that syncs with GitLab. We've loaded sample data so you can explore. Let's take a quick tour!",
        showButtons: ["next"],
      },
    },
    {
      element: "[data-onboarding='progress-ring']",
      popover: {
        title: "Today's Progress",
        description:
          "The progress ring shows how close you are to your daily target. It fills up as you log more time throughout the day.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='issue-list']",
      popover: {
        title: "Your Issues Today",
        description:
          "See exactly which issues you spent time on today, sorted by hours. Each entry maps to a GitLab issue from your synced projects.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='week-chart']",
      popover: {
        title: "Week Overview",
        description:
          "A visual breakdown of your week showing daily logged hours vs. your target. Spot trends and stay consistent.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='worklog-tabs']",
      popover: {
        title: "Worklog Center",
        description:
          "Dive deeper into your time entries. Switch between views to inspect daily, weekly, or monthly worklogs and audit flags.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='connection-section']",
      popover: {
        title: "Settings & Connection",
        description:
          "Head here to connect your GitLab account using a Personal Access Token or OAuth. Once connected, hit Sync to pull your real time entries.",
        side: "bottom",
        align: "center",
      },
    },
    {
      popover: {
        title: "You're All Set!",
        description:
          "That's the tour! Connect your GitLab account in Settings to start tracking your real hours. Happy tracking!",
        showButtons: ["previous", "close"],
        doneBtnText: "Let's go!",
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
  onNavigate("/");
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
          popoverClass: "timely-popover",
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
