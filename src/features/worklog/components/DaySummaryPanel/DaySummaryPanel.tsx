import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { IssuesSection } from "@/features/worklog/components/IssuesSection/IssuesSection";
import { useDaySummaryItems } from "@/features/worklog/hooks/use-day-summary-items/use-day-summary-items";
import { SectionHeading } from "@/shared/components/SectionHeading/SectionHeading";
import { SummaryGrid } from "@/shared/components/SummaryGrid/SummaryGrid";

import type { AuditFlag, DayOverview } from "@/shared/types/dashboard";

interface DaySummaryPanelProps {
  selectedDay: DayOverview;
  auditFlags: AuditFlag[];
  title?: string;
}

export function DaySummaryPanel({
  selectedDay,
  auditFlags,
  title,
}: Readonly<DaySummaryPanelProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const summaryItems = useDaySummaryItems(selectedDay, auditFlags.length);
  const resolvedTitle = title ?? t("worklog.daySummary");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading title={resolvedTitle} />
        <SummaryGrid
          items={summaryItems}
          dataKey={selectedDay.date}
          allowDecorativeAnimation={allowDecorativeAnimation}
          windowVisibility={windowVisibility}
        />
      </div>

      <IssuesSection
        title={t("common.issues")}
        issues={selectedDay.topIssues}
        auditFlags={auditFlags}
        dataKey={selectedDay.date}
      />
    </div>
  );
}
