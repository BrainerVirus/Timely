import { useMemo } from "react";
import { useFormatHours } from "@/shared/hooks/use-format-hours/use-format-hours";
import { formatSignedHours } from "@/shared/utils/date";
import { useI18n } from "@/core/services/I18nService/i18n";

import type { DayOverview } from "@/shared/types/dashboard";
import type { SummaryGridItem } from "@/shared/components/SummaryGrid/SummaryGrid";

export function useDaySummaryItems(
  selectedDay: DayOverview,
  auditFlagCount = 0,
): SummaryGridItem[] {
  const fh = useFormatHours();
  const { t } = useI18n();
  const delta = selectedDay.loggedHours - selectedDay.targetHours;

  return useMemo(
    () => [
      {
        title: t("worklog.logged"),
        value: fh(selectedDay.loggedHours),
        note: t("worklog.loggedNote"),
        icon: "timer" as const,
      },
      {
        title: t("worklog.target"),
        value: fh(selectedDay.targetHours),
        note: t("worklog.targetNote"),
        icon: "target" as const,
      },
      {
        title: t("worklog.delta"),
        value: formatSignedHours(fh, delta),
        note: delta >= 0 ? t("worklog.deltaPositive") : t("worklog.deltaNegative"),
        icon: "sparkles" as const,
      },
      {
        title: t("worklog.issuesCount"),
        value: String(selectedDay.topIssues.length),
        note:
          auditFlagCount > 0
            ? t("worklog.auditFlagCount", { count: auditFlagCount })
            : t("worklog.noAuditFlags"),
        icon: "sparkles" as const,
      },
    ],
    [
      auditFlagCount,
      delta,
      fh,
      selectedDay.loggedHours,
      selectedDay.targetHours,
      selectedDay.topIssues.length,
      t,
    ],
  );
}
