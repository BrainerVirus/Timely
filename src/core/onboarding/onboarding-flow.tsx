import { driver } from "driver.js";
import { useEffect } from "react";
import { buildInfo } from "@/core/runtime/build-info";
import { useI18n } from "@/core/runtime/i18n";
import { useAppStore } from "@/core/stores/app-store";

import type { DriveStep } from "driver.js";

const TOUR_START_DELAY_MS = 800;
const ELEMENT_WAIT_TIMEOUT_MS = 2000;

const stepPages = ["/", "/", "/", "/", "/worklog", "/settings", "/"] as const;

interface OnboardingFlowProps {
  onNavigate: (path: string) => void;
}

function waitForElement(
  selector: string,
  timeout = ELEMENT_WAIT_TIMEOUT_MS,
): Promise<Element | null> {
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

function waitForPaint(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let remainingFrames = frames;

    function tick() {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
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

async function finishOnboarding(onNavigate: (path: string) => void) {
  await useAppStore.getState().markOnboardingComplete();
  onNavigate("/");
}

export function OnboardingFlow({ onNavigate }: OnboardingFlowProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!buildInfo.onboardingTourEnabled || useAppStore.getState().onboardingCompleted) {
      return;
    }

    void import("driver.js/dist/driver.css");

    let completionTriggered = false;
    let suppressDestroyCompletion = false;
    let activeDriver: ReturnType<typeof driver> | null = null;
    let transitionSequence = 0;
    let isDisposed = false;

    function completeOnboarding() {
      if (completionTriggered || useAppStore.getState().onboardingCompleted) {
        return;
      }

      completionTriggered = true;
      void finishOnboarding(onNavigate);
    }

    function destroyActiveDriver({ complete = true } = {}) {
      if (!activeDriver) {
        return;
      }

      const driverToDestroy = activeDriver;
      activeDriver = null;
      suppressDestroyCompletion = !complete;
      driverToDestroy.destroy();
    }

    async function waitForStepTarget(stepIndex: number) {
      const selector = getStepSelector(stepIndex, t);

      if (selector) {
        await waitForElement(selector);
        return;
      }

      await waitForPaint();
    }

    function handleNextStepAfterNavigation(nextIndex: number, sequence: number) {
      if (isDisposed || transitionSequence !== sequence) {
        return;
      }

      try {
        activeDriver = createDriver();
        activeDriver.drive(nextIndex);
      } catch {
        completeOnboarding();
      }
    }

    function handlePrevStepAfterNavigation(prevIndex: number, sequence: number) {
      if (isDisposed || transitionSequence !== sequence) {
        return;
      }

      try {
        activeDriver = createDriver();
        activeDriver.drive(prevIndex);
      } catch {
        completeOnboarding();
      }
    }

    function handleNavigationTransition(
      nextIndex: number,
      nextPage: string,
      currentPage: string,
      isPrevious = false,
    ) {
      const sequence = transitionSequence + 1;
      transitionSequence = sequence;
      destroyActiveDriver({ complete: false });
      onNavigate(nextPage);

      const handler = isPrevious ? handlePrevStepAfterNavigation : handleNextStepAfterNavigation;
      void waitForStepTarget(nextIndex).then(() => handler(nextIndex, sequence));
    }

    function createDriver() {
      const steps = getTourSteps(t);

      return driver({
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
            completeOnboarding();
            destroyActiveDriver();
            return;
          }

          const currentPage = stepPages[currentIndex];
          const nextPage = stepPages[nextIndex];

          if (nextPage !== currentPage) {
            handleNavigationTransition(nextIndex, nextPage, currentPage, false);
            return;
          }

          activeDriver?.moveNext();
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
            handleNavigationTransition(prevIndex, prevPage, currentPage, true);
            return;
          }

          activeDriver?.movePrevious();
        },
        onDestroyStarted: (_element, _step, { driver: activeDriverInstance }) => {
          const shouldComplete = !suppressDestroyCompletion;
          suppressDestroyCompletion = false;

          if (shouldComplete) {
            completeOnboarding();
          }

          activeDriverInstance.destroy();
        },
      });
    }

    const timeout = setTimeout(() => {
      try {
        activeDriver = createDriver();
        activeDriver.drive();
      } catch {
        completeOnboarding();
      }
    }, TOUR_START_DELAY_MS);

    return () => {
      isDisposed = true;
      transitionSequence += 1;
      clearTimeout(timeout);
      destroyActiveDriver({ complete: false });
    };
  }, [onNavigate, t]);

  return null;
}
