export type SetupStep = "welcome" | "schedule" | "provider" | "sync" | "done";

export const setupSteps: SetupStep[] = ["welcome", "schedule", "provider", "sync", "done"];

export function getSetupStepPath(step: SetupStep): string {
  return `/setup/${step}`;
}

export function getNextSetupStep(step: SetupStep): SetupStep {
  const index = setupSteps.indexOf(step);
  return setupSteps[Math.min(index + 1, setupSteps.length - 1)] ?? "done";
}

export function getPreviousSetupStep(step: SetupStep): SetupStep {
  const index = setupSteps.indexOf(step);
  return setupSteps[Math.max(index - 1, 0)] ?? "welcome";
}
