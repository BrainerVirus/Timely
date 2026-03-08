import { driver } from "driver.js";
import { useEffect } from "react";

const STORAGE_KEY = "pulseboard-onboarding-complete";

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}

export function clearOnboardingState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

interface OnboardingFlowProps {
  onNavigateSettings: () => void;
}

/**
 * Fully controlled onboarding tour.
 *
 * - Overlay blocks all interaction with the app
 * - No close button, no Escape key, no clicking outside
 * - User MUST step through every slide via Next/Done buttons
 * - Only after the final step does the tour end and navigate to Settings
 */
export function OnboardingFlow({ onNavigateSettings }: OnboardingFlowProps) {
  useEffect(() => {
    if (isOnboardingComplete()) return;

    const timeout = setTimeout(() => {
      try {
        const driverObj = driver({
          showProgress: true,
          animate: true,
          overlayColor: "rgba(10, 10, 20, 0.92)",
          stagePadding: 8,
          stageRadius: 12,
          popoverClass: "pulseboard-popover",

          // Lock down the tour — no escape routes
          allowClose: false,
          allowKeyboardControl: false,
          disableActiveInteraction: true,
          overlayClickBehavior: () => {
            // No-op: clicking the overlay does nothing
          },
          showButtons: ["next", "previous"],

          steps: [
            {
              popover: {
                title: "Welcome to Pulseboard",
                description:
                  "Your personal time-tracking dashboard that syncs with GitLab. Let's walk through the app before you set things up.",
                showButtons: ["next"],
              },
            },
            {
              element: "[data-onboarding='sidebar-nav']",
              popover: {
                title: "Navigation",
                description:
                  "Use the sidebar to switch between views: Today shows your daily progress, Week and Month give you wider perspective, Audit flags issues, and Settings is where you connect GitLab.",
                side: "right",
                align: "start",
              },
            },
            {
              element: "[data-onboarding='nav-settings']",
              popover: {
                title: "Connect GitLab",
                description:
                  "Head to Settings to connect your GitLab account. You can use a Personal Access Token or set up OAuth. Once connected, hit Sync to pull your real time entries.",
                side: "right",
                align: "start",
                showButtons: ["previous", "next"],
                doneBtnText: "Go to Settings →",
              },
            },
          ],

          // Only fires when the user clicks "Done" on the last step
          onDestroyStarted: (_el, _step, { driver: d }) => {
            markOnboardingComplete();
            d.destroy();
            onNavigateSettings();
          },
        });

        driverObj.drive();
      } catch (err) {
        console.error("[Onboarding] Failed to start tour:", err);
        markOnboardingComplete();
        onNavigateSettings();
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [onNavigateSettings]);

  return null;
}
