import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
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

function getTourSteps(t: ReturnType<typeof useI18n>["t"]): DriveStep[] {
  return [
    {
      popover: {
        title: t("setup.welcomeTitle"),
        description: t("onboarding.welcomeDescription"),
        showButtons: ["next"],
      },
    },
    {
      element: "[data-onboarding='progress-ring']",
      popover: {
        title: t("home.heroToday"),
        description: t("onboarding.progressDescription"),
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='issue-list']",
      popover: {
        title: t("home.todayFocus"),
        description: t("onboarding.issuesDescription"),
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='week-chart']",
      popover: {
        title: t("home.thisWeek"),
        description: t("onboarding.weekDescription"),
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='worklog-tabs']",
      popover: {
        title: t("common.worklog"),
        description: t("onboarding.worklogDescription"),
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='connection-section']",
      popover: {
        title: `${t("common.settings")} & ${t("settings.connection")}`,
        description: t("onboarding.settingsDescription"),
        side: "bottom",
        align: "center",
      },
    },
    {
      popover: {
        title: t("setup.doneTitle"),
        description: t("onboarding.doneDescription"),
        showButtons: ["previous", "close"],
        doneBtnText: t("common.continue"),
      },
    },
  ];
}

function getStepSelector(stepIndex: number, t: ReturnType<typeof useI18n>["t"]): string | null {
  const step = getTourSteps(t)[stepIndex];
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
  const { t } = useI18n();

  useEffect(() => {
    if (isOnboardingComplete()) {
      return;
    }

    const originalLifecycle = useAppStore.getState().lifecycle;
    useAppStore.setState({ lifecycle: { phase: "ready", payload: tourPayload } });

    const timeout = setTimeout(() => {
      try {
        const steps = getTourSteps(t);

        const driverObj = driver({
          showProgress: true,
          animate: true,
          overlayColor: "oklch(0.04 0.005 60 / 0.78)",
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
              const selector = getStepSelector(nextIndex, t);

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
              const selector = getStepSelector(prevIndex, t);

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
  }, [onNavigate, t]);

  return null;
}
