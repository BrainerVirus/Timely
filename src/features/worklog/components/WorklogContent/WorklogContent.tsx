import { useI18n } from "@/core/services/I18nService/i18n";
import { DaySummaryPanel } from "@/features/worklog/components/DaySummaryPanel/DaySummaryPanel";
import { MonthView } from "@/features/worklog/components/MonthView/MonthView";
import { RangeSummarySection } from "@/features/worklog/components/RangeSummarySection/RangeSummarySection";
import { WeekView } from "@/features/worklog/components/WeekView/WeekView";

import type { DayOverview, WorklogSnapshot } from "@/shared/types/dashboard";

interface WorklogContentProps {
  currentSnapshot: WorklogSnapshot;
  currentWeekRange: string;
  displayMode: "day" | "week" | "period";
  onOpenNestedDay: (date: Date) => void;
  comparisonDate: string;
  periodLabel: string;
  selectedDay: DayOverview;
}

export function WorklogContent({
  currentSnapshot,
  currentWeekRange,
  displayMode,
  onOpenNestedDay,
  comparisonDate,
  periodLabel,
  selectedDay,
}: Readonly<WorklogContentProps>) {
  const { t } = useI18n();

  if (displayMode === "day") {
    return <DaySummaryPanel selectedDay={selectedDay} auditFlags={currentSnapshot.auditFlags} />;
  }

  if (displayMode === "week") {
    return (
      <div className="space-y-6">
        <RangeSummarySection
          summary={currentSnapshot.month}
          days={currentSnapshot.days}
          title={t("worklog.weekSummary")}
          note={t("worklog.selectedRange", { range: currentWeekRange })}
          dataKey={`week-summary:${currentSnapshot.range.startDate}:${currentSnapshot.range.endDate}`}
          rangeStartDate={currentSnapshot.range.startDate}
          rangeEndDate={currentSnapshot.range.endDate}
          comparisonDate={comparisonDate}
        />
        <WeekView
          week={currentSnapshot.days}
          title={t("worklog.weeklyBreakdown")}
          note={t("dashboard.pickDayToOpen")}
          dataOnboarding="week-card"
          startDate={currentSnapshot.range.startDate}
          viewMode="week"
          onSelectDay={(_, date) => {
            onOpenNestedDay(date);
          }}
        />
      </div>
    );
  }

  return (
    <MonthView
      month={currentSnapshot.month}
      days={currentSnapshot.days}
      title={t("worklog.periodSummary")}
      note={t("worklog.selectedRange", { range: periodLabel })}
      rangeStartDate={currentSnapshot.range.startDate}
      rangeEndDate={currentSnapshot.range.endDate}
      comparisonDate={comparisonDate}
      onSelectDay={(_, date) => {
        onOpenNestedDay(date);
      }}
    />
  );
}
