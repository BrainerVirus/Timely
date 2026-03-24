import { RangeSummarySection } from "@/features/worklog/components/RangeSummarySection/RangeSummarySection";
import { WeekView } from "@/features/worklog/components/WeekView/WeekView";
import { useI18n } from "@/core/services/I18nService/i18n";

import type { DayOverview, MonthSnapshot } from "@/shared/types/dashboard";

interface MonthViewProps {
  month: MonthSnapshot;
  days: DayOverview[];
  title?: string;
  note: string;
  rangeStartDate: string;
  rangeEndDate: string;
  comparisonDate: string;
  onSelectDay?: (day: DayOverview, date: Date) => void;
}

export function MonthView({
  month,
  days,
  title,
  note,
  rangeStartDate,
  rangeEndDate,
  comparisonDate,
  onSelectDay,
}: Readonly<MonthViewProps>) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("worklog.periodSummary");

  return (
    <div className="space-y-6" data-onboarding="month-card">
      <RangeSummarySection
        summary={month}
        days={days}
        title={resolvedTitle}
        note={note}
        rangeStartDate={rangeStartDate}
        rangeEndDate={rangeEndDate}
        comparisonDate={comparisonDate}
        dataKey={`${rangeStartDate}:${rangeEndDate}:${comparisonDate}:${month.loggedHours}:${month.targetHours}:${month.cleanDays}`}
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
