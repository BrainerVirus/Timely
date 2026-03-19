import { RangeSummarySection } from "@/features/dashboard/range-summary-section";
import { WeekView } from "@/features/dashboard/week-view";
import { useI18n } from "@/lib/i18n";

import type { DayOverview, MonthSnapshot } from "@/types/dashboard";

interface MonthViewProps {
  month: MonthSnapshot;
  days: DayOverview[];
  title?: string;
  note: string;
  rangeStartDate: string;
  onSelectDay?: (day: DayOverview, date: Date) => void;
}

export function MonthView({
  month,
  days,
  title,
  note,
  rangeStartDate,
  onSelectDay,
}: MonthViewProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("worklog.periodSummary");

  return (
    <div className="space-y-6" data-onboarding="month-card">
      <RangeSummarySection
        summary={month}
        title={resolvedTitle}
        note={note}
        dataKey={`${rangeStartDate}:${month.loggedHours}:${month.targetHours}:${month.cleanDays}`}
      />
      <WeekView
        week={days}
        title={t("dashboard.dailyBreakdown")}
        note={t("dashboard.pickDayToOpen")}
        startDate={rangeStartDate}
        viewMode="period"
        onSelectDay={onSelectDay}
      />
    </div>
  );
}
