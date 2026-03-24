import { driver, type DriveStep } from "driver.js";
import { useEffect } from "react";
import { useI18n } from "@/core/services/I18nService/i18n";

interface SetupConnectionGuideProps {
  active: boolean;
  onFinish: () => void;
}

function waitForElement(selector: string, timeout = 2500): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }

    const start = Date.now();
    const interval = globalThis.setInterval(() => {
      const next = document.querySelector(selector);
      if (next || Date.now() - start > timeout) {
        globalThis.clearInterval(interval);
        resolve(next);
      }
    }, 50);
  });
}

function clickIfPresent(selector: string) {
  document.querySelector<HTMLElement>(selector)?.click();
}

function getGuideSteps(t: ReturnType<typeof useI18n>["t"]): DriveStep[] {
  return [
    {
      popover: {
        title: t("setup.connectionGuideTitle"),
        description: t("setup.connectionGuideIntro"),
        showButtons: ["next"],
      },
    },
    {
      element: "[data-onboarding='connection-section']",
      popover: {
        title: `${t("common.settings")} - ${t("settings.connection")}`,
        description: t("setup.connectionGuideConnectionSection"),
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='gitlab-pat-link']",
      popover: {
        title: t("providers.accessToken"),
        description: t("setup.connectionGuidePat"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-onboarding='gitlab-oauth-tab']",
      popover: {
        title: t("common.oauth"),
        description: t("setup.connectionGuideOauthTab"),
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='gitlab-oauth-link']",
      popover: {
        title: t("providers.createOAuthApp"),
        description: t("setup.connectionGuideOauthLink"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-onboarding='sync-button']",
      popover: {
        title: t("topBar.sync"),
        description: t("setup.connectionGuideSync"),
        side: "bottom",
        align: "end",
        showButtons: ["previous", "close"],
        doneBtnText: t("common.continue"),
      },
    },
  ];
}

function handleGuideNext(guide: ReturnType<typeof driver>, state: { activeIndex?: number }) {
  const currentIndex = state.activeIndex ?? 0;
  const nextIndex = currentIndex + 1;

  if (currentIndex === 3) {
    clickIfPresent("[data-onboarding='gitlab-oauth-tab']");
  }

  if (nextIndex === 4) {
    void waitForElement("[data-onboarding='gitlab-oauth-link']").then(() => {
      guide.moveNext();
    });
    return;
  }

  guide.moveNext();
}

function handleGuidePrev(guide: ReturnType<typeof driver>, state: { activeIndex?: number }) {
  const currentIndex = state.activeIndex ?? 0;
  const prevIndex = currentIndex - 1;

  if (prevIndex === 2) {
    clickIfPresent("[data-onboarding='gitlab-pat-tab']");
    void waitForElement("[data-onboarding='gitlab-pat-link']").then(() => {
      guide.movePrevious();
    });
    return;
  }

  guide.movePrevious();
}

export function SetupConnectionGuide({ active, onFinish }: SetupConnectionGuideProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!active) {
      return;
    }

    void import("driver.js/dist/driver.css");

    let guideInstance: ReturnType<typeof driver> | null = null;

    const timeout = globalThis.setTimeout(() => {
      const guide = driver({
        showProgress: true,
        animate: true,
        overlayColor: "oklch(0.04 0.005 60 / 0.78)",
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: "timely-popover",
        allowClose: false,
        allowKeyboardControl: true,
        disableActiveInteraction: false,
        showButtons: ["next", "previous", "close"],
        steps: getGuideSteps(t),
        onNextClick: (_element, _step, { state }) => {
          handleGuideNext(guide, state);
        },
        onPrevClick: (_element, _step, { state }) => {
          handleGuidePrev(guide, state);
        },
        onDestroyStarted: (_element, _step, { driver: activeDriver }) => {
          onFinish();
          activeDriver.destroy();
        },
      });

      guideInstance = guide;
      guide.drive();
    }, 300);

    return () => {
      globalThis.clearTimeout(timeout);
      guideInstance?.destroy();
    };
  }, [active, onFinish, t]);

  return null;
}
