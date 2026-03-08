import { driver } from "driver.js";
import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { tourPayload } from "./tour-mock-data";

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
  onNavigate: (path: string) => void;
}

/** Wait for a DOM element to appear (up to `timeout` ms). */
function waitForElement(selector: string, timeout = 2000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

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

/**
 * Fully controlled onboarding tour with mock data.
 *
 * - Injects rich demo data into the Zustand store so users see a populated app
 * - Walks through every page: Today → Week → Month → Audit → back for gamification
 * - Overlay blocks all interaction; user MUST step through via Next/Previous
 * - On finish, restores original empty payload and navigates to Settings
 */
export function OnboardingFlow({ onNavigate }: OnboardingFlowProps) {
  useEffect(() => {
    if (isOnboardingComplete()) return;

    // Save original lifecycle to restore after tour
    const originalLifecycle = useAppStore.getState().lifecycle;

    // Inject tour mock data so all views look populated
    useAppStore.setState({ lifecycle: { phase: "ready", payload: tourPayload } });

    const timeout = setTimeout(() => {
      try {
        // Track which page each step lives on, so navigation can happen on prev too
        const stepPages = [
          "/", // 0: Welcome
          "/", // 1: Today hero
          "/", // 2: Today metrics
          "/", // 3: Today issues
          "/", // 4: Gamification
          "/week", // 5: Week
          "/month", // 6: Month
          "/audit", // 7: Audit
          "/", // 8: Settings CTA
        ];

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
            // Step 0: Welcome (centered, no element)
            {
              popover: {
                title: "Welcome to Pulseboard",
                description:
                  "Your personal time-tracking dashboard that syncs with GitLab. We've loaded sample data so you can see what a fully set-up workspace looks like. Let's take a tour!",
                showButtons: ["next"],
              },
            },

            // Step 1: Today — Hero card
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

            // Step 2: Today — Metrics
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

            // Step 3: Today — Issues
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

            // Step 4: Gamification sidebar
            {
              element: "[data-onboarding='gamification']",
              popover: {
                title: "Pilot Profile & Quests",
                description:
                  "Track your level, XP, and daily streak in the Pilot card. Complete quests — like logging 5 consecutive days — to earn bonus XP. This section appears once gamification is active.",
                side: "right",
                align: "start",
              },
            },

            // Step 5: Week view
            {
              element: "[data-onboarding='week-card']",
              popover: {
                title: "Week View",
                description:
                  "Your Mon–Fri breakdown showing per-day logged hours, targets, and status badges. Today's tile is highlighted with a colored border.",
                side: "bottom",
                align: "center",
              },
            },

            // Step 6: Month view
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

            // Step 7: Audit view
            {
              element: "[data-onboarding='audit-card']",
              popover: {
                title: "Audit Flags",
                description:
                  "The Audit page surfaces potential issues — overtime, missing entries, low consistency. Flags are color-coded by severity so you know what to address first.",
                side: "bottom",
                align: "center",
              },
            },

            // Step 8: Settings callout
            {
              element: "[data-onboarding='nav-settings']",
              popover: {
                title: "Connect GitLab",
                description:
                  "Head to Settings to connect your GitLab account using a Personal Access Token or OAuth. Once connected, hit Sync to pull your real time entries.",
                side: "right",
                align: "start",
                showButtons: ["previous", "next"],
                doneBtnText: "Go to Settings →",
              },
            },
          ],

          onNextClick: (_el, _step, { state }) => {
            const currentIdx = state.activeIndex ?? 0;
            const nextIdx = currentIdx + 1;

            if (nextIdx >= stepPages.length) {
              driverObj.destroy();
              return;
            }

            const currentPage = stepPages[currentIdx];
            const nextPage = stepPages[nextIdx];

            if (nextPage !== currentPage) {
              onNavigate(nextPage);
              const nextStepDef = driverObj.getConfig().steps?.[nextIdx];
              const selector =
                nextStepDef && typeof nextStepDef.element === "string" ? nextStepDef.element : null;

              if (selector) {
                waitForElement(selector).then(() => driverObj.moveNext());
              } else {
                requestAnimationFrame(() => driverObj.moveNext());
              }
            } else {
              driverObj.moveNext();
            }
          },

          onPrevClick: (_el, _step, { state }) => {
            const currentIdx = state.activeIndex ?? 0;
            const prevIdx = currentIdx - 1;

            if (prevIdx < 0) return;

            const currentPage = stepPages[currentIdx];
            const prevPage = stepPages[prevIdx];

            if (prevPage !== currentPage) {
              onNavigate(prevPage);
              const prevStepDef = driverObj.getConfig().steps?.[prevIdx];
              const selector =
                prevStepDef && typeof prevStepDef.element === "string" ? prevStepDef.element : null;

              if (selector) {
                waitForElement(selector).then(() => driverObj.movePrevious());
              } else {
                requestAnimationFrame(() => driverObj.movePrevious());
              }
            } else {
              driverObj.movePrevious();
            }
          },

          // Only fires when the user clicks "Done" on the last step
          onDestroyStarted: (_el, _step, { driver: d }) => {
            // Restore original payload and clean up
            useAppStore.setState({ lifecycle: originalLifecycle });
            markOnboardingComplete();
            d.destroy();
            onNavigate("/settings");
          },
        });

        driverObj.drive();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Onboarding] Failed to start tour:", err);
        useAppStore.setState({ lifecycle: originalLifecycle });
        markOnboardingComplete();
        onNavigate("/settings");
      }
    }, 800);

    return () => {
      clearTimeout(timeout);
      // If cleanup fires before tour starts, restore original lifecycle
      useAppStore.setState({ lifecycle: originalLifecycle });
    };
  }, [onNavigate]);

  return null;
}
