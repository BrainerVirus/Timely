import type { useI18n } from "@/app/providers/I18nService/i18n";
import type { BootstrapPayload, CompanionMood, DayOverview } from "@/shared/types/dashboard";

type Translate = ReturnType<typeof useI18n>["t"];

export function buildHeadlineMessage(payload: BootstrapPayload, t: Translate, seed: string) {
  const keyType = getHeadlineKey(payload);
  const variants = getHeadlineVariants(keyType);
  const key = pickVariant(variants, seed);

  return t(key, { alias: payload.profile.alias });
}

export function buildInsightMessage(
  payload: BootstrapPayload,
  companionName: string,
  formatHours: (value: number) => string,
  t: Translate,
  seed: string,
) {
  if (payload.today.status === "non_workday") {
    if (payload.today.loggedHours > 0) {
      const key = pickVariant(
        ["home.insightNonWorkdayLoggedA", "home.insightNonWorkdayLoggedB"] as const,
        seed,
      );
      return t(key, {
        companion: companionName,
        hours: formatHours(payload.today.loggedHours),
      });
    }

    const key = pickVariant(
      ["home.insightNonWorkdayRestA", "home.insightNonWorkdayRestB"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      holiday: payload.today.holidayName ?? "",
    });
  }

  const weekLogged = payload.week.reduce((sum, day) => sum + day.loggedHours, 0);
  const topIssue = payload.today.topIssues[0];

  if (topIssue) {
    const key = pickVariant(
      ["home.insightTopIssueA", "home.insightTopIssueB", "home.insightTopIssueC"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      issueKey: topIssue.key,
      hours: formatHours(topIssue.hours),
    });
  }

  if (weekLogged > 0) {
    const key = pickVariant(
      ["home.insightWeekA", "home.insightWeekB", "home.insightWeekC"] as const,
      seed,
    );
    return t(key, {
      companion: companionName,
      hours: formatHours(weekLogged),
    });
  }

  const key = pickVariant(
    ["home.insightStartA", "home.insightStartB", "home.insightStartC"] as const,
    seed,
  );
  return t(key, { companion: companionName });
}

export function buildPetStatusMessage(
  {
    companionMood,
    companionName,
    payload,
    hoursFormatter,
    t,
  }: {
    companionMood: CompanionMood;
    companionName: string;
    payload: BootstrapPayload;
    hoursFormatter: (value: number) => string;
    t: Translate;
  },
  seed: string,
) {
  const sharedParams = {
    companion: companionName,
    streak: `${payload.streak.currentDays}d`,
    focus: hoursFormatter(payload.today.focusHours),
    consistency: `${payload.month.consistencyScore}%`,
    hours: hoursFormatter(payload.today.loggedHours),
  };

  if (payload.today.status === "non_workday") {
    const keys =
      payload.today.loggedHours > 0
        ? (["home.petNonWorkdayActiveA", "home.petNonWorkdayActiveB"] as const)
        : (["home.petNonWorkdayRestA", "home.petNonWorkdayRestB"] as const);

    return t(pickVariant(keys, seed), sharedParams);
  }

  return t(pickVariant(getPetStatusMessageKeys(companionMood), seed), sharedParams);
}

export function buildHeroPills({
  payload,
  formatHours,
  companionName,
  t,
}: {
  payload: BootstrapPayload;
  formatHours: (value: number) => string;
  companionName: string;
  t: Translate;
}) {
  const logged = payload.today.loggedHours;
  const remaining = Math.max(payload.today.targetHours - logged, 0);
  const streak = `${payload.streak.currentDays}d`;

  if (payload.today.status === "non_workday") {
    const leadPill =
      logged > 0
        ? t("home.heroLoggedPill", { hours: formatHours(logged) })
        : payload.today.holidayName || t("home.heroRestDayPill", { companion: companionName });

    return [leadPill, t("home.heroNoTargetPill"), t("home.heroStreakSafePill", { streak })];
  }

  return [
    t("home.heroLoggedPill", { hours: formatHours(logged) }),
    remaining > 0
      ? t("home.heroRemainingPill", { hours: formatHours(remaining) })
      : t("home.heroTargetDonePill"),
    t("home.heroStreakPill", { streak }),
  ];
}

export function formatDateLabel(
  day: DayOverview,
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string,
  formatDateShort: (date: Date) => string,
) {
  const date = new Date(`${day.date}T12:00:00`);
  return `${formatWeekdayFromDate(date)} ${formatDateShort(date)}`.trim();
}

function getHeadlineKey(
  payload: BootstrapPayload,
): "victory" | "focus" | "holiday" | "weekend" | "warmup" {
  if (payload.today.status === "met_target" || payload.today.status === "over_target") {
    return "victory";
  }
  if (payload.today.status === "on_track") {
    return "focus";
  }
  if (payload.today.status === "non_workday" && payload.today.holidayName) {
    return "holiday";
  }
  if (payload.today.status === "non_workday") {
    return "weekend";
  }
  return "warmup";
}

function getHeadlineVariants(keyType: "victory" | "focus" | "holiday" | "weekend" | "warmup") {
  switch (keyType) {
    case "victory":
      return ["home.headlineVictoryA", "home.headlineVictoryB"] as const;
    case "focus":
      return ["home.headlineFocusA", "home.headlineFocusB"] as const;
    case "holiday":
      return ["home.headlineHolidayA", "home.headlineHolidayB"] as const;
    case "weekend":
      return ["home.headlineWeekendA", "home.headlineWeekendB"] as const;
    case "warmup":
      return ["home.headlineWarmupA", "home.headlineWarmupB"] as const;
  }
}

function getPetStatusMessageKeys(mood: CompanionMood) {
  if (mood === "excited") {
    return ["home.petExcitedA", "home.petExcitedB"] as const;
  }
  if (mood === "happy") {
    return ["home.petHappyA", "home.petHappyB"] as const;
  }
  if (mood === "focused") {
    return ["home.petFocusedA", "home.petFocusedB"] as const;
  }
  return ["home.petCalmA", "home.petCalmB"] as const;
}

function pickVariant<T extends readonly string[]>(variants: T, seed: string): T[number] {
  return variants[hashSeed(seed) % variants.length] ?? variants[0];
}

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }

  return hash;
}
