import { driver } from "driver.js";
import { useEffect } from "react";
import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useAppStore } from "@/app/state/AppStore/app-store";
import {
  finishOnboarding,
  getStepSelector,
  getTourSteps,
  STEP_PAGES,
  waitForElement,
  waitForPaint,
} from "@/features/onboarding/screens/OnboardingFlow/internal/onboarding-tour";

const TOUR_START_DELAY_MS = 800;

interface OnboardingFlowProps {
  onNavigate: (path: string) => void;
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

          if (nextIndex >= STEP_PAGES.length) {
            completeOnboarding();
            destroyActiveDriver();
            return;
          }

          const currentPage = STEP_PAGES[currentIndex];
          const nextPage = STEP_PAGES[nextIndex];

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

          const currentPage = STEP_PAGES[currentIndex];
          const prevPage = STEP_PAGES[prevIndex];

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
