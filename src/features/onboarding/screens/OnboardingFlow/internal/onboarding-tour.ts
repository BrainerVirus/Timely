import { useAppStore } from "@/app/state/AppStore/app-store";

import type { useI18n } from "@/app/providers/I18nService/i18n";
import type { DriveStep } from "driver.js";

const ELEMENT_WAIT_TIMEOUT_MS = 2000;

export const STEP_PAGES = ["/", "/", "/", "/", "/worklog", "/settings", "/"] as const;

export function waitForElement(
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

export function waitForPaint(frames = 2): Promise<void> {
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

export function getTourSteps(t: ReturnType<typeof useI18n>["t"]): DriveStep[] {
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

export function getStepSelector(
  stepIndex: number,
  t: ReturnType<typeof useI18n>["t"],
): string | null {
  const step = getTourSteps(t)[stepIndex];
  return step && "element" in step && typeof step.element === "string" ? step.element : null;
}

export async function finishOnboarding(onNavigate: (path: string) => void) {
  await useAppStore.getState().markOnboardingComplete();
  onNavigate("/");
}
