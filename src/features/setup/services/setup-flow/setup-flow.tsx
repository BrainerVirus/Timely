export type SetupStep = "welcome" | "schedule" | "provider" | "sync" | "done";

export const SETUP_STEPS: SetupStep[] = ["welcome", "schedule", "provider", "sync", "done"];

export function getSetupStepPath(step: SetupStep): string {
  return `/setup/${step}`;
}
