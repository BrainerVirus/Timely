export type SetupScheduleSearch = { substep: 0 | 1 };

export function validateSetupScheduleSearch(search: Record<string, unknown>): SetupScheduleSearch {
  const raw = search.substep;
  if (raw === 1 || raw === "1") {
    return { substep: 1 };
  }
  return { substep: 0 };
}

export function resolveSetupProgressStep(
  step: "welcome" | "schedule" | "provider" | "sync" | "done",
  scheduleSubstep: SetupScheduleSearch["substep"],
): number {
  switch (step) {
    case "welcome":
      return 0;
    case "schedule":
      return scheduleSubstep === 0 ? 1 : 2;
    case "provider":
      return 3;
    case "sync":
      return 4;
    case "done":
      return 5;
  }
}

export const SETUP_PROGRESS_TOTAL_STEPS = 6;
