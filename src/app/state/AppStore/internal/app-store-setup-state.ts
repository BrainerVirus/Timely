import type { SetupState } from "@/shared/types/dashboard";

const SETUP_STEP_ORDER = ["welcome", "schedule", "provider", "sync", "done"] as const;

export function getNextSetupState(
  current: SetupState,
  step: SetupState["currentStep"],
): SetupState {
  const completedSteps = current.completedSteps.includes(step)
    ? current.completedSteps
    : [...current.completedSteps, step];
  const stepIndex = SETUP_STEP_ORDER.indexOf(step);
  const currentStep =
    SETUP_STEP_ORDER[Math.min(stepIndex + 1, SETUP_STEP_ORDER.length - 1)] ?? "done";

  return {
    currentStep,
    isComplete: currentStep === "done",
    completedSteps,
  };
}

export function getCompletedSetupState(): SetupState {
  return {
    currentStep: "done",
    isComplete: true,
    completedSteps: [...SETUP_STEP_ORDER],
  };
}
