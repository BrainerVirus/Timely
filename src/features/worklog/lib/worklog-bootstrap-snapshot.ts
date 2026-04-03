import type { BootstrapPayload, DayOverview, WorklogSnapshot } from "@/shared/types/dashboard";

export function createBootstrapWeekSnapshot(payload: BootstrapPayload): WorklogSnapshot {
  if (payload.week.length === 0) {
    return {
      mode: "week",
      range: {
        startDate: payload.today.date,
        endDate: payload.today.date,
        label: payload.today.dateLabel,
      },
      selectedDay: payload.today,
      days: [],
      month: payload.month,
      auditFlags: payload.auditFlags,
    };
  }

  const startDate = payload.week[0]?.date ?? payload.today.date;
  const endDate = payload.week[payload.week.length - 1]?.date ?? payload.today.date;

  return {
    mode: "week",
    range: {
      startDate,
      endDate,
      label: "",
    },
    selectedDay: payload.week.find((day) => day.isToday) ?? payload.week[0] ?? payload.today,
    days: payload.week,
    month: buildWeekSnapshotMonth(payload.week, payload.month),
    auditFlags: payload.auditFlags,
  };
}

function buildWeekSnapshotMonth(
  week: DayOverview[],
  fallback: BootstrapPayload["month"],
): BootstrapPayload["month"] {
  if (week.length === 0) {
    return fallback;
  }

  const loggedHours = week.reduce((total, day) => total + day.loggedHours, 0);
  const targetHours = week.reduce((total, day) => total + day.targetHours, 0);
  const cleanDays = week.filter((day) => matchesTarget(day)).length;
  const overflowDays = week.filter((day) => day.status === "over_target").length;
  const consistencyScore = targetHours > 0 ? Math.round((loggedHours / targetHours) * 100) : 0;

  return {
    loggedHours,
    targetHours,
    consistencyScore,
    cleanDays,
    overflowDays,
  };
}

function matchesTarget(day: DayOverview) {
  return day.status === "met_target" || day.status === "on_track";
}
