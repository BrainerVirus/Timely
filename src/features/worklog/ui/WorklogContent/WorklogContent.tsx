import { useI18n } from "@/app/providers/I18nService/i18n";
import { DaySummaryPanel } from "@/features/worklog/ui/DaySummaryPanel/DaySummaryPanel";
import { MonthView } from "@/features/worklog/ui/MonthView/MonthView";
import { RangeSummarySection } from "@/features/worklog/ui/RangeSummarySection/RangeSummarySection";
import { WeekView } from "@/features/worklog/ui/WeekView/WeekView";

import type { DayOverview, IssueRouteReference, WorklogSnapshot } from "@/shared/types/dashboard";

interface WorklogContentProps {
  currentSnapshot: WorklogSnapshot;
  currentWeekRange: string;
  displayMode: "day" | "week" | "period";
  onOpenNestedDay: (date: Date) => void;
  comparisonDate: string;
  periodLabel: string;
  selectedDay: DayOverview;
  weekStart?: string;
  timezone?: string;
  syncVersion?: number;
  onOpenIssue?: (reference: IssueRouteReference) => void;
  onAddIssueTime?: (reference: IssueRouteReference) => void;
}

export function WorklogContent({
  currentSnapshot,
  currentWeekRange,
  displayMode,
  onOpenNestedDay,
  comparisonDate,
  periodLabel,
  selectedDay,
  weekStart,
  timezone = "UTC",
  syncVersion,
  onOpenIssue,
  onAddIssueTime,
}: Readonly<WorklogContentProps>) {
  const { t } = useI18n();

  if (displayMode === "day") {
    return (
      <DaySummaryPanel
        selectedDay={selectedDay}
        auditFlags={currentSnapshot.auditFlags}
        syncVersion={syncVersion}
        onOpenIssue={onOpenIssue}
        onAddIssueTime={onAddIssueTime}
      />
    );
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
      weekStart={weekStart}
      timezone={timezone}
      comparisonDate={comparisonDate}
      onSelectDay={(_, date) => {
        onOpenNestedDay(date);
      }}
    />
  );
}
